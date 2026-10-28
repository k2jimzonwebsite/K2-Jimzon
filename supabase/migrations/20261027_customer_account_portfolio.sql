-- MAP-019 / IDEA-20261027-02. Prepared only. Requires current identity,
-- settings, structured payments, receipts and delivery snapshots. No apply authority.
begin;
do $$ begin
 if to_regclass('k2_private.order_delivery_snapshots') is null
   or to_regclass('k2_private.order_payment_receipts') is null
   or to_regprocedure('k2_private.project_express_quote_v1(uuid)') is null then
   raise exception 'K2_PORTFOLIO_DEPENDENCIES_REQUIRED';
 end if;
end $$;
create index if not exists order_requests_customer_portfolio_idx
 on public.order_requests(customer_id,created_at desc,public_reference desc);

create or replace function public.read_customer_portfolio_v1(
 p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 p jsonb; a public.customer_accounts; budget record; rows jsonb; summary jsonb;
 proof k2_private.order_payment_receipts; before_time timestamptz; before_ref text;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'error_code','ACCOUNT_AUTH_REQUIRED'); end if;
 if not k2_private.verify_guest_bff_request('account_read',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature) then
   return jsonb_build_object('ok',false,'error_code','REQUEST_REPLAYED'); end if;
 begin p:=p_payload_text::jsonb;
 exception when data_exception then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end;
 if jsonb_typeof(p)<>'object' or coalesce(p->>'operation','') not in ('list','proof') then
   return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
 select * into a from public.customer_accounts where user_id=auth.uid() and status='active';
 if not found then return jsonb_build_object('ok',false,'error_code','ACCOUNT_NOT_LINKED'); end if;
 select * into budget from k2_private.consume_guest_rate('account_portfolio','actor',
   extensions.digest(convert_to(auth.uid()::text,'UTF8'),'sha256'),300,60);
 if not budget.allowed then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',budget.retry_after_seconds); end if;
 if p->>'operation'='proof' then
   if (select count(*) from jsonb_object_keys(p))<>3 or not(p ?& array['operation','orderReference','proofId']) then
     return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
   select r.* into proof from k2_private.order_payment_receipts r
     join public.order_requests o on o.id=r.order_id
     where o.customer_id=a.customer_id and o.public_reference=p->>'orderReference' and r.id::text=p->>'proofId';
   if not found then return jsonb_build_object('ok',false,'error_code','CONVERSATION_NOT_AVAILABLE'); end if;
   if octet_length(proof.contents)>3145728 or proof.media_type not in ('image/png','image/jpeg','application/pdf') then
     return jsonb_build_object('ok',false,'error_code','REQUEST_REJECTED'); end if;
   return jsonb_build_object('ok',true,'proof',jsonb_build_object('id',proof.id,'mediaType',proof.media_type,
     'base64',encode(proof.contents,'base64')));
 end if;
 if (select count(*) from jsonb_object_keys(p))<>2 or not(p ?& array['operation','cursor']) then
   return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
 if p->'cursor'<>'null'::jsonb then
   if jsonb_typeof(p->'cursor')<>'object' or (select count(*) from jsonb_object_keys(p->'cursor'))<>2
     or not(p->'cursor' ?& array['createdAt','reference']) then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
   begin before_time:=(p->'cursor'->>'createdAt')::timestamptz; before_ref:=p->'cursor'->>'reference';
   exception when data_exception then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end;
   if before_time is null or before_ref is null or before_ref !~ '^WEB-[A-Z0-9-]{1,64}$' then
     return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
 end if;
 -- Collections come from staff-recorded structured payment evidence, never from
 -- an uploaded image or an order's quoted charge. Unknown historical evidence stays unknown.
 with owned as (
   select o.*,case when o.payment_evidence->>'currency'='PHP'
     and coalesce(o.payment_evidence->>'amount','') ~ '^[0-9]{1,12}(\.[0-9]{1,2})?$'
     then (o.payment_evidence->>'amount')::numeric else null end as known_amount
   from public.order_requests o where o.customer_id=a.customer_id
 ) select jsonb_build_object('orderCount',count(*),
   'fulfilledItems',coalesce((select sum(i.quantity) from public.order_request_items i join owned o on o.id=i.order_request_id where o.status='fulfilled'),0),
   'verifiedAmount',coalesce(sum(known_amount) filter(where payment_status='verified'),0),
   'refundedAmount',coalesce(sum(known_amount) filter(where payment_status='refunded'),0),
   'unknownPaymentCount',count(*) filter(where payment_status in ('verified','refunded') and known_amount is null),
   'currency','PHP') into summary from owned;
 select coalesce(jsonb_agg(jsonb_build_object(
   'public_reference',o.public_reference,'created_at',o.created_at,'status',o.status,'payment_status',o.payment_status,
   'shipping_quote_status',o.shipping_quote_status,
   'express_quote',k2_private.project_express_quote_v1(o.id),
   'delivery_review_required',(o.channel_source='website' and not exists(select 1 from k2_private.order_delivery_snapshots s where s.order_id=o.id)),
   'total_amount',case when (o.channel_source<>'website' or exists(select 1 from k2_private.order_delivery_snapshots s where s.order_id=o.id))
     and o.shipping_quote_status in ('customer_confirmed','platform_charged','waived') then o.total_amount else null end,
   'payment',jsonb_build_object('amount',case when o.payment_evidence->>'currency'='PHP'
      and coalesce(o.payment_evidence->>'amount','') ~ '^[0-9]{1,12}(\.[0-9]{1,2})?$' then (o.payment_evidence->>'amount')::numeric else null end,
      'currency',o.payment_evidence->>'currency','method',o.payment_evidence->>'method',
      'reference',o.payment_evidence->>'payment_reference','recordedAt',o.payment_evidence->>'submitted_at'),
   'items',coalesce((select jsonb_agg(jsonb_build_object('sku',i.sku,'name',i.product_name,'quantity',i.quantity,'unitPrice',i.unit_price,'lineTotal',i.line_total) order by i.id)
     from (select * from public.order_request_items where order_request_id=o.id order by id limit 200)i),'[]'::jsonb),
   'itemsTruncated',(select count(*)>200 from public.order_request_items where order_request_id=o.id),
   'proofs',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'mediaType',r.media_type,'submittedAt',r.submitted_at) order by r.submitted_at desc)
     from (select * from k2_private.order_payment_receipts where order_id=o.id order by submitted_at desc limit 20)r),'[]'::jsonb)
 ) order by o.created_at desc,o.public_reference desc),'[]'::jsonb) into rows
 from (select * from public.order_requests where customer_id=a.customer_id
   and (before_time is null or (created_at,public_reference)<(before_time,before_ref))
   order by created_at desc,public_reference desc limit 21)o;
 return jsonb_build_object('ok',true,'summary',summary,'orders',case when jsonb_array_length(rows)>20 then rows-20 else rows end,
   'nextCursor',case when jsonb_array_length(rows)>20 then jsonb_build_object('createdAt',rows->19->>'created_at','reference',rows->19->>'public_reference') else null end);
end $$;
revoke all on function public.read_customer_portfolio_v1(bigint,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.read_customer_portfolio_v1(bigint,uuid,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
