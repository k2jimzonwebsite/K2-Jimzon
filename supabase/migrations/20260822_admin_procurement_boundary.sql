-- Prepared MAP-020 supplier/procurement read boundary and supplier creation.
-- Local rehearsal target only until OWNER-005 and the coordinated Admin cutover.
begin;

create table if not exists k2_private.supplier_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null check (action in ('supplier_create')),
  request_id uuid not null,
  supplier_id uuid not null,
  reason text not null,
  after_state jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(actor_id,action,request_id)
);
alter table k2_private.supplier_events enable row level security;
alter table k2_private.supplier_events force row level security;
revoke all on k2_private.supplier_events from public,anon,authenticated;

revoke insert,update,delete on public.suppliers,public.purchase_orders,public.po_lines from authenticated;

create or replace function public.read_admin_procurement_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_suppliers jsonb; v_orders jsonb;
begin
  if not public.is_staff() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'name',s.name,'contactEmail',s.contact_email,
    'leadTimeDays',s.lead_time_days,'performanceScore',s.performance_score,
    'outstandingBalance',s.outstanding_balance
  ) order by s.name,s.id),'[]'::jsonb) into v_suppliers
  from (select * from public.suppliers order by name,id limit 500) s;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'poNumber',p.po_number,'supplierId',p.supplier_id,
    'supplierName',s.name,'status',p.status,'totalAmount',p.total_amount,
    'expectedDelivery',p.expected_delivery,'createdAt',p.created_at,
    'lines',coalesce((select jsonb_agg(jsonb_build_object(
      'id',l.id,'sku',l.sku,'quantity',l.quantity,'unitCost',l.unit_cost
    ) order by l.id) from (select * from public.po_lines where po_id=p.id order by id limit 100) l),'[]'::jsonb)
  ) order by p.created_at desc,p.id),'[]'::jsonb) into v_orders
  from (select * from public.purchase_orders order by created_at desc,id limit 200) p
  left join public.suppliers s on s.id=p.supplier_id;
  return jsonb_build_object('suppliers',v_suppliers,'purchaseOrders',v_orders,
    'purchaseOrderCreationAvailable',false,'receivingAvailable',false);
end;
$$;
revoke all on function public.read_admin_procurement_v1() from public,anon;
grant execute on function public.read_admin_procurement_v1() to authenticated;

create or replace function public.execute_admin_supplier_command_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid(); v_payload jsonb; v_hash text; v_reason text;
  v_existing k2_private.admin_command_receipts; v_result jsonb;
  v_count integer; v_inserted integer; v_supplier public.suppliers%rowtype;
  v_email text; v_lead integer;
begin
  if p_action<>'supplier_create' or not public.is_admin()
     or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED'; end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object'
     or not (v_payload ?& array['name','contactEmail','leadTimeDays','reason'])
     or (v_payload-array['name','contactEmail','leadTimeDays','reason'])<>'{}'::jsonb then
    raise exception using errcode='22023',message='K2_ADMIN_SUPPLIER_INVALID';
  end if;
  v_reason:=trim(v_payload->>'reason'); v_email:=nullif(lower(trim(v_payload->>'contactEmail')),'');
  v_lead:=(v_payload->>'leadTimeDays')::integer;
  if length(trim(v_payload->>'name')) not between 2 and 120
     or length(v_reason) not between 3 and 500 or v_lead not between 0 and 365
     or (v_email is not null and (length(v_email)>254 or v_email!~'^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')) then
    raise exception using errcode='22023',message='K2_ADMIN_SUPPLIER_INVALID';
  end if;
  v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash<>v_hash then raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT'; end if;
    if v_existing.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;
    return v_existing.result;
  end if;
  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_count>=20 then raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED'; end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;
  if exists(select 1 from public.suppliers s where lower(trim(s.name))=lower(trim(v_payload->>'name'))) then
    raise exception using errcode='23505',message='K2_ADMIN_SUPPLIER_DUPLICATE';
  end if;
  insert into public.suppliers(name,contact_email,lead_time_days)
  values(trim(v_payload->>'name'),v_email,v_lead) returning * into v_supplier;
  v_result:=jsonb_build_object('supplier',jsonb_build_object(
    'id',v_supplier.id,'name',v_supplier.name,'contactEmail',v_supplier.contact_email,
    'leadTimeDays',v_supplier.lead_time_days,'performanceScore',v_supplier.performance_score,
    'outstandingBalance',v_supplier.outstanding_balance));
  insert into k2_private.supplier_events(actor_id,action,request_id,supplier_id,reason,after_state)
  values(v_actor,p_action,p_idempotency_key,v_supplier.id,v_reason,v_result->'supplier');
  update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception using errcode='22023',message='K2_ADMIN_SUPPLIER_INVALID';
end;
$$;
revoke all on function public.execute_admin_supplier_command_v1(text,bigint,uuid,uuid,text,text) from public,anon;
grant execute on function public.execute_admin_supplier_command_v1(text,bigint,uuid,uuid,text,text) to authenticated;

commit;
