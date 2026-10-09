import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const md5=s=>createHash('md5').update(s).digest('hex'),source=fs.readFileSync('supabase/migrations/20261003221500_intake_flight_cost_propagation.sql','utf8')
const before=source.split('$body0$')[1].replaceAll('\r','');assert.equal(md5(before),'39dbc55e65ffb4bcdcb8b8f34955538b')
const once=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,()=>b)}
let after=once(before,'  v_batches jsonb;','  v_batches jsonb;\n  v_today date := (transaction_timestamp() at time zone \'Asia/Manila\')::date;\n  v_latest date := make_date(extract(year from v_today)::integer+10,\n    extract(month from v_today)::integer,1)+extract(day from v_today)::integer-1;')
after=once(after,'  exception when invalid_datetime_format then','  exception when invalid_datetime_format or datetime_field_overflow then')
after=once(after,"    select to_jsonb(public.add_consignment_item_v2(","    if (p_inventory ->> 'expiryDate') !~ '^\\d{4}-\\d{2}-\\d{2}$'\n       or v_expiry < v_today or v_expiry > v_latest then\n      raise exception using errcode = '22023', message = 'K2_EXPIRY_INVALID';\n    end if;\n    select to_jsonb(public.add_consignment_item_v2(")
const sql=`-- IDEA-20261003-06 / MAP-018/020. Prepared only, no provider activation.
-- Fresh flight source uses Manila calendar; stable existing inventory replay precedes date checks.
begin;
set local search_path='';
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.product_intake_sessions,public.consignment_items in share row exclusive mode;
do $calendar$
declare v_before pg_catalog.pg_proc%rowtype; v_after pg_catalog.pg_proc%rowtype;
  v_body text := $candidate$${after}$candidate$;
begin
  select * into v_before from pg_catalog.pg_proc
  where oid=pg_catalog.to_regprocedure('public.create_product_first_inventory_server(uuid,uuid,text,jsonb)');
  if not found or not v_before.prosecdef or v_before.proretset
    or v_before.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
    or v_before.proconfig is distinct from array['search_path=""']::text[]
    or md5(replace(v_before.prosrc,chr(13),'')) not in ('${md5(before)}','${md5(after)}') then
    raise exception 'K2_INTAKE_CALENDAR_FUNCTION_DRIFT';
  end if;
  if md5(replace(v_before.prosrc,chr(13),''))='${md5(before)}' then
    execute replace(pg_catalog.pg_get_functiondef(v_before.oid),v_before.prosrc,v_body);
  end if;
  select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
  if md5(replace(v_after.prosrc,chr(13),''))<>'${md5(after)}'
    or (to_jsonb(v_before)-'prosrc') is distinct from (to_jsonb(v_after)-'prosrc') then
    raise exception 'K2_INTAKE_CALENDAR_CONTRACT_CHANGED';
  end if;
end;
$calendar$;
notify pgrst,'reload schema';
commit;
`
fs.writeFileSync('supabase/migrations/20261003233500_intake_flight_calendar.sql',sql)
fs.writeFileSync('docs/evidence/20261003-catalog-current-chain/foundation-13/calendar-body-pins.json',JSON.stringify({before:md5(before),after:md5(after)},null,2)+'\n')
console.log(JSON.stringify({before:md5(before),after:md5(after)}))
