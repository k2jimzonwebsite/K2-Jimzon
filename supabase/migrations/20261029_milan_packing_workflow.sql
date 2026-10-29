-- MAP-023 / IDEA-20261029-06. PREPARED ONLY; exact provider apply requires its
-- own backup, captured-source dependency, rehearsal and owner authorization.
begin;
set local lock_timeout='2s';
set local statement_timeout='10s';
-- Admit only this additional domain-separated action in the existing verifier.
-- Its signature, nonce, actor, AAL2 and secret logic remain byte-for-byte intact.
do $verifier$
declare d text; anchor text:='''consignment_finalize''';
begin
 d:=pg_get_functiondef('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure);
 if position('''consignment_packing''' in d)>0 then return; end if;
 if encode(extensions.digest(convert_to(d,'UTF8'),'sha256'),'hex')<>'02375ce8b81857b78b96c8f467231fde4f4b7fc80b1bb2f8466235791f65e383' then raise exception 'K2_PACKING_VERIFIER_DRIFT'; end if;
 if (length(d)-length(replace(d,anchor,'')))/length(anchor)<>1 then raise exception 'K2_PACKING_VERIFIER_DRIFT'; end if;
 execute replace(d,anchor,anchor||',''consignment_packing''');
end $verifier$;
alter table public.consignments add column if not exists packing_revision bigint not null default 0 check(packing_revision>=0);
alter table public.consignments add column if not exists packing_cancelled_at timestamptz;
alter table public.consignment_items add column if not exists packing_count_only boolean not null default false;
alter table public.consignment_items add column if not exists packing_removed_at timestamptz;
alter table public.consignment_items add column if not exists packing_removed_snapshot jsonb;

-- All old and new line writers share the parent lock and advance review identity.
create or replace function k2_private.guard_consignment_packing_line_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare c public.consignments;
begin
 if tg_op='DELETE' then raise exception 'K2_PACKING_HISTORY_PROTECTED'; end if;
 if tg_op='UPDATE' and new.consignment_id is distinct from old.consignment_id then raise exception 'K2_PACKING_LOT_MISMATCH'; end if;
 select * into c from public.consignments where id=new.consignment_id for update;
 if not found then raise exception 'K2_PACKING_LOT_MISMATCH'; end if;
 if tg_op='INSERT' or row(new.sku,new.batch_code,new.box_code,new.best_before_date,new.expected_qty,new.italy_packed_qty,
   new.packing_count_only,new.packing_removed_at,new.packing_removed_snapshot)
   is distinct from row(old.sku,old.batch_code,old.box_code,old.best_before_date,old.expected_qty,old.italy_packed_qty,
   old.packing_count_only,old.packing_removed_at,old.packing_removed_snapshot) then
  if c.status<>'Packing_Italy' or c.packing_cancelled_at is not null then raise exception 'K2_PACKING_CLOSED'; end if;
  update public.consignments set packing_revision=packing_revision+1 where id=c.id;
 end if;
 return new;
end $$;
revoke all on function k2_private.guard_consignment_packing_line_v1() from public,anon,authenticated,service_role;
drop trigger if exists k2_packing_line_guard on public.consignment_items;
create trigger k2_packing_line_guard before insert or update or delete on public.consignment_items
for each row execute function k2_private.guard_consignment_packing_line_v1();

create or replace function k2_private.apply_consignment_packing_v1(p_actor uuid,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.consignments; i public.consignment_items; product public.products;
 op text:=p->>'operation'; before_row jsonb; code text:=trim(p->>'code'); matches integer;
 delta integer; expiry date; sku text; removed jsonb; stamp date:=(clock_timestamp() at time zone 'Asia/Manila')::date;
begin
 if p_actor is distinct from auth.uid() or public.is_staff() is distinct from true
   or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception using errcode='42501',message='K2_STAFF_REQUIRED'; end if;
 select * into c from public.consignments where id=(p->>'consignmentId')::uuid for update;
 if not found or c.status<>'Packing_Italy' then raise exception 'K2_PACKING_CLOSED'; end if;
 if op='reopen' then
  if c.packing_cancelled_at is null then raise exception 'K2_PACKING_CLOSED'; end if;
 elsif c.packing_cancelled_at is not null then raise exception 'K2_PACKING_CLOSED'; end if;
 if op<>'count' then
  if jsonb_typeof(p->'packingRevision') is distinct from 'number'
    or (p->>'packingRevision')::numeric<>c.packing_revision then raise exception 'K2_PACKING_REVIEW_STALE'; end if;
  if length(trim(coalesce(p->>'reason',''))) not between 1 and 500 then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
 end if;
 if op='count' then
  if (p-array['operation','consignmentId','itemId','code','boxCode','batchCode','bestBeforeDate','delta','source'])<>'{}'
    or p->>'source' not in ('barcode','counter') or jsonb_typeof(p->'delta') is distinct from 'number'
    or (p->>'delta')::numeric not in (-1,1) or length(coalesce(code,'')) not between 1 and 120
    or length(trim(coalesce(p->>'boxCode',''))) not between 1 and 120
    or length(trim(coalesce(p->>'batchCode',''))) not between 1 and 120 then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
  delta:=(p->>'delta')::integer;
  expiry:=(p->>'bestBeforeDate')::date;
  if expiry is null or expiry<stamp or expiry>(stamp+interval '10 years')::date then raise exception 'K2_PACKING_DATE_INVALID'; end if;
  if p->>'itemId' is not null then
   select * into i from public.consignment_items where id=(p->>'itemId')::uuid and consignment_id=c.id for update;
   if not found then raise exception 'K2_PACKING_LOT_MISMATCH'; end if;
   if i.packing_removed_at is not null then raise exception 'K2_PACKING_ITEM_REMOVED'; end if;
   if row(i.box_code,i.batch_code,i.best_before_date) is distinct from row(trim(p->>'boxCode'),trim(p->>'batchCode'),expiry)
     then raise exception 'K2_PACKING_LOT_MISMATCH'; end if;
   select * into product from public.products where products.sku=i.sku;
   if lower(code)<>lower(i.sku) and lower(code) is distinct from lower(trim(product.barcode)) then raise exception 'K2_SCAN_CODE_MISMATCH'; end if;
  else
   if delta<>1 or p->>'source'<>'barcode' then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
   -- Cooperate with the canonical Draft and Product Master barcode admission lock.
   perform pg_advisory_xact_lock(hashtextextended('k2.draft.barcode:'||lower(code),0));
   select count(*) into matches from public.products where lower(trim(products.barcode))=lower(code) or lower(products.sku)=lower(code);
   if matches>1 then raise exception 'K2_PACKING_IDENTITY_AMBIGUOUS'; end if;
   select * into product from public.products where lower(trim(products.barcode))=lower(code) or lower(products.sku)=lower(code);
   if not found then
    if length(code)>32 or code !~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$' or lower(code) like 'k2-sku-%' then raise exception 'K2_PACKING_BARCODE_REQUIRED'; end if;
    sku:=public.generate_k2_sku_internal();
    insert into public.products(sku,barcode,name,status,published,is_human_reviewed,slug,internal_notes)
    values(sku,code,'Unreviewed item '||code,'Draft',false,false,lower(sku),
      'Unfinished packing Draft. Barcode observed during Italy packing; product details require human review.') returning * into product;
    insert into public.audit_logs(table_name,record_id,action,new_data,user_id)
    values('products',product.id::text,'INSERT',jsonb_build_object('source','milan_packing','sku',product.sku,'barcode',code,'is_human_reviewed',false),p_actor);
   end if;
   select * into i from public.consignment_items where consignment_id=c.id and consignment_items.sku=product.sku
     and box_code=trim(p->>'boxCode') and batch_code=trim(p->>'batchCode') for update;
   if found then
    if i.packing_removed_at is not null then raise exception 'K2_PACKING_ITEM_REMOVED'; end if;
    if i.best_before_date<>expiry then raise exception 'K2_PACKING_LOT_MISMATCH'; end if;
   else
    insert into public.consignment_items(consignment_id,sku,batch_code,box_code,best_before_date,expected_qty,packing_count_only)
      values(c.id,product.sku,trim(p->>'batchCode'),trim(p->>'boxCode'),expiry,0,true) returning * into i;
   end if;
  end if;
  if i.italy_packed_qty+delta not between 0 and 100000 then raise exception 'K2_PACKING_COUNT_INVALID'; end if;
  before_row:=to_jsonb(i);
  update public.consignment_items set italy_packed_qty=italy_packed_qty+delta where id=i.id returning * into i;
 elsif op in ('remove','restore') then
  if (p-array['operation','consignmentId','itemId','packingRevision','reason'])<>'{}' then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
  select * into i from public.consignment_items where id=(p->>'itemId')::uuid and consignment_id=c.id for update;
  if not found or i.manila_scanned_qty<>0 then raise exception 'K2_PACKING_LOT_MISMATCH'; end if;
  before_row:=to_jsonb(i);
  if op='remove' then
   if i.packing_removed_at is not null then raise exception 'K2_PACKING_ITEM_REMOVED'; end if;
   update public.consignment_items set packing_removed_snapshot=before_row,packing_removed_at=clock_timestamp(),
      expected_qty=0,italy_packed_qty=0 where id=i.id returning * into i;
  else
   removed:=i.packing_removed_snapshot;
   if i.packing_removed_at is null or removed is null then raise exception 'K2_PACKING_LOT_MISMATCH'; end if;
   update public.consignment_items set expected_qty=(removed->>'expected_qty')::integer,
     italy_packed_qty=(removed->>'italy_packed_qty')::integer,packing_removed_at=null,packing_removed_snapshot=null where id=i.id returning * into i;
  end if;
 elsif op in ('cancel','reopen','dispatch') then
  if (p-array['operation','consignmentId','packingRevision','reason','acknowledgeVariance'])<>'{}' then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
  before_row:=to_jsonb(c);
  if op='dispatch' then
   if not exists(select 1 from public.consignment_items where consignment_id=c.id and packing_removed_at is null and italy_packed_qty>0)
      then raise exception 'K2_PACKING_EMPTY'; end if;
   if exists(select 1 from public.consignment_items where consignment_id=c.id and packing_removed_at is null
     and not packing_count_only and expected_qty<>italy_packed_qty) and coalesce(p->'acknowledgeVariance','false'::jsonb)<>'true'::jsonb
      then raise exception 'K2_PACKING_VARIANCE_REQUIRED'; end if;
   update public.consignments set status='In_Transit',packed_at=clock_timestamp(),packing_revision=packing_revision+1 where id=c.id;
  else
   update public.consignments set packing_cancelled_at=case when op='cancel' then clock_timestamp() else null end,
     packing_revision=packing_revision+1 where id=c.id;
  end if;
 else raise exception 'K2_ADMIN_PAYLOAD_INVALID';
 end if;
 if i.id is not null then
  insert into public.audit_logs(table_name,record_id,action,old_data,new_data,user_id)
   values('consignment_items',i.id::text,'UPDATE',before_row,to_jsonb(i)||jsonb_build_object('packing_operation',op,'source',p->>'source','reason',p->>'reason'),p_actor);
 else
  insert into public.audit_logs(table_name,record_id,action,old_data,new_data,user_id)
   select 'consignments',c.id::text,'UPDATE',before_row,to_jsonb(x)||jsonb_build_object('packing_operation',op,'reason',p->>'reason'),p_actor from public.consignments x where id=c.id;
 end if;
 select * into c from public.consignments where id=c.id;
 return jsonb_build_object('consignmentId',c.id,'operation',op,'itemId',i.id,'sku',i.sku,
  'italyPackedQty',i.italy_packed_qty,'packingRevision',c.packing_revision,'status',c.status,'historicalReceipt',true);
end $$;
revoke all on function k2_private.apply_consignment_packing_v1(uuid,jsonb) from public,anon,authenticated,service_role;

-- Preserve the current signed wrapper and all unrelated receiving corrections.
-- Exact anchors are single-use; no unreviewed wholesale replacement of its body.
do $patch$
declare d text; anchor text;
begin
 d:=pg_get_functiondef('public.execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure);
 if position('k2_private.apply_consignment_packing_v1' in d)>0 then return; end if;
 if encode(extensions.digest(convert_to(d,'UTF8'),'sha256'),'hex')<>'1e69741c4bbe36a6155213cf2e7c0ee0e9376fa50721cc169983aa7458898370' then raise exception 'K2_PACKING_WRAPPER_DRIFT'; end if;
 anchor:='''consignment_create'',''consignment_add_line'',''consignment_scan'',
    ''consignment_advance'',''consignment_finalize''';
 if (length(d)-length(replace(d,anchor,'')))/length(anchor)<>1 then raise exception 'K2_PACKING_WRAPPER_DRIFT'; end if;
 d:=replace(d,anchor,anchor||',''consignment_packing''');
 anchor:='v_limit := case when p_action=''consignment_scan'' then 300 else 30 end;';
 if position(anchor in d)=0 then raise exception 'K2_PACKING_WRAPPER_DRIFT'; end if;
 d:=replace(d,anchor,'v_limit := case when p_action in (''consignment_scan'',''consignment_packing'') then 300 else 30 end;');
 anchor:='  if p_action=''consignment_create'' then';
 if (length(d)-length(replace(d,anchor,'')))/length(anchor)<>1 then raise exception 'K2_PACKING_WRAPPER_DRIFT'; end if;
 d:=replace(d,anchor,'  if p_action=''consignment_packing'' then
    v_result:=k2_private.apply_consignment_packing_v1(v_actor,v_payload);
    update k2_private.admin_command_receipts set result=v_result,completed_at=now()
      where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    return v_result;
  end if;
  -- Historical receipts above remain replayable. Fresh dispatch must bind review.
  if p_action=''consignment_advance'' and v_payload->>''toStatus''=''In_Transit'' then
    raise exception ''K2_PACKING_REVIEW_STALE'';
  end if;
'||anchor);
 execute d;
end $patch$;
notify pgrst,'reload schema';
commit;
