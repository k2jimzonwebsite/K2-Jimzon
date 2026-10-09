-- IDEA-20261008-01 / MAP-023. Prepared after J; no live application or seeded facts.
-- @@EXACT_CANCELLATION_PREREQUISITES@@
create function public.execute_admin_order_cancellation_v1(
 p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,p_payload_text text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' as $cancel$
declare
 v_actor uuid:=auth.uid();v_payload jsonb;v_hash text;v_receipt k2_private.admin_command_receipts;
 v_order public.order_requests;v_result jsonb;
begin
 -- Entry precedes every role/signing/order lock. Fresh policy checks remain below replay.
 perform pg_catalog.pg_advisory_xact_lock_shared(1261585232,1347374169);
 if p_action is distinct from 'cancel_order' or p_timestamp is null or p_nonce is null
  or p_idempotency_key is null or p_payload_text is null or p_signature is null then
  raise exception using errcode='22023',message='K2_ADMIN_REQUEST_INVALID';end if;
 perform 1 from public.user_profiles where id=v_actor and role::text in ('Admin','Staff') for share;
 if not found then raise exception using errcode='42501',message='K2_CANCELLATION_ACCESS_REQUIRED';end if;
 if not k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature) then
  raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';end if;
 v_payload:=p_payload_text::jsonb;
 if jsonb_typeof(v_payload) is distinct from 'object'
  or not(v_payload ?& array['orderRequestId','expectedStatus','expectedUpdatedAt','reason'])
  or v_payload-array['orderRequestId','expectedStatus','expectedUpdatedAt','reason']<>'{}'::jsonb
  or jsonb_typeof(v_payload->'orderRequestId') is distinct from 'string'
  or jsonb_typeof(v_payload->'expectedStatus') is distinct from 'string'
  or jsonb_typeof(v_payload->'expectedUpdatedAt') is distinct from 'string'
  or jsonb_typeof(v_payload->'reason') is distinct from 'string'
  or v_payload->>'expectedStatus' not in ('submitted','confirmed')
  or length(btrim(v_payload->>'reason')) not between 1 and 500
  or (v_payload->>'expectedUpdatedAt')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$' then
  raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';end if;
 v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
 select * into v_order from public.order_requests where id=(v_payload->>'orderRequestId')::uuid for update;
 if not found then raise exception using errcode='22023',message='K2_CANCELLATION_ORDER_INELIGIBLE';end if;
 select * into v_receipt from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key for update;
 if found then
  if v_receipt.payload_hash is distinct from v_hash then raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';end if;
  if v_receipt.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';end if;
  return v_receipt.result;
 end if;
 if v_order.status not in ('submitted','confirmed') then
  raise exception using errcode='22023',message='K2_CANCELLATION_ORDER_INELIGIBLE';end if;
 if v_order.status is distinct from v_payload->>'expectedStatus'
  or v_order.updated_at is distinct from (v_payload->>'expectedUpdatedAt')::timestamptz then
  raise exception using errcode='40001',message='K2_CANCELLATION_VERSION_CONFLICT';end if;
 if (select count(*) from k2_private.admin_command_receipts where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute')>=30 then
  raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED';end if;
 insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_hash) on conflict do nothing;
 if not found then
  select * into v_receipt from k2_private.admin_command_receipts
   where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key for update;
  if v_receipt.payload_hash is distinct from v_hash then raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';end if;
  if v_receipt.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';end if;
  return v_receipt.result;
 end if;
 -- Canonical authority owns stock locks, conservation, event attribution and payment history.
 select * into v_order from public.cancel_order_request(v_order.id,btrim(v_payload->>'reason'));
 v_result:=jsonb_build_object('orderRequestId',v_order.id,'publicReference',v_order.public_reference,
  'status',v_order.status,'paymentStatus',v_order.payment_status);
 update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
 return v_result;
end $cancel$;
revoke all on function public.execute_admin_order_cancellation_v1(text,bigint,uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.execute_admin_order_cancellation_v1(text,bigint,uuid,uuid,text,text) to authenticated;
