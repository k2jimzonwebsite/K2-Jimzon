-- MAP-023 / E1-E6. Fresh-only, coordinated preparation; not live activation.
do $$begin
 if to_regprocedure('k2_private.resolve_customer_delivery_quote_v1(jsonb)') is null
  or to_regclass('k2_private.order_delivery_snapshots') is not null then
  raise exception using errcode='55000',message='K2_ORDER_DELIVERY_PREREQUISITE_OR_EXISTING';
 end if;
end $$;

create table k2_private.order_delivery_snapshots(
 order_id uuid primary key references public.order_requests(id),
 idempotency_key text not null,request_fingerprint bytea not null,
 delivery_request jsonb not null,quote jsonb not null,
 fulfillment_method text not null,delivery_address text,
 subtotal numeric not null,discount_amount numeric not null,total_amount numeric not null,
 accepted_at timestamptz,created_at timestamptz not null default clock_timestamp()
);
alter table k2_private.order_delivery_snapshots enable row level security;
alter table k2_private.order_delivery_snapshots force row level security;
revoke all on k2_private.order_delivery_snapshots from public,anon,authenticated,service_role;

create function k2_private.guard_order_delivery_history_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_context k2_private.category_lot_command_context;
begin
 if tg_op<>'INSERT' then raise exception using errcode='55000',message='K2_ORDER_DELIVERY_HISTORY_IMMUTABLE';end if;
 v_context:=k2_private.current_category_lot_context_v1();
 if v_context.authority_kind is distinct from 'guest' then
  raise exception using errcode='42501',message='K2_ORDER_DELIVERY_CONTEXT_REQUIRED';
 end if;
 return new;
end $$;
revoke all on function k2_private.guard_order_delivery_history_v1() from public,anon,authenticated,service_role;
create trigger order_delivery_history_guard before insert or update or delete on k2_private.order_delivery_snapshots
 for each row execute function k2_private.guard_order_delivery_history_v1();
create trigger order_delivery_history_truncate before truncate on k2_private.order_delivery_snapshots
 for each statement execute function k2_private.guard_order_delivery_history_v1();

create function k2_private.guard_order_delivery_charge_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_snapshot k2_private.order_delivery_snapshots;v_order public.order_requests;
begin
 if tg_op='UPDATE' then
  select * into v_snapshot from k2_private.order_delivery_snapshots where order_id=old.id;
  if not found then
   if old.channel_source is distinct from 'website' and new.channel_source='website' then
    raise exception using errcode='22023',message='K2_DELIVERY_REVIEW_REQUIRED';
   end if;
   return new;
  end if;
  if new.id is distinct from old.id or new.channel_source is distinct from old.channel_source
   or new.shop_id is distinct from old.shop_id then
   raise exception using errcode='22023',message='K2_ORDER_CHARGE_IMMUTABLE';
  end if;
  v_order:=new;
 else
  -- Deferred INSERT: original and persisted admission identity both matter.
  select * into v_order from public.order_requests where id=new.id;
  if not found then
   if new.channel_source='website' then raise exception using errcode='22023',message='K2_DELIVERY_REVIEW_REQUIRED';end if;
   return null;
  end if;
  if new.channel_source<>'website' and v_order.channel_source<>'website' then return null;end if;
  select * into v_snapshot from k2_private.order_delivery_snapshots where order_id=v_order.id;
  if not found then raise exception using errcode='22023',message='K2_DELIVERY_REVIEW_REQUIRED';end if;
 end if;
 if v_order.idempotency_key is distinct from v_snapshot.idempotency_key
  or v_order.request_fingerprint is distinct from v_snapshot.request_fingerprint
  or v_order.fulfillment_method is distinct from v_snapshot.fulfillment_method
  or v_order.delivery_address is distinct from v_snapshot.delivery_address
  or v_order.subtotal is distinct from v_snapshot.subtotal
  or v_order.discount_amount is distinct from v_snapshot.discount_amount
  or v_order.total_amount is distinct from v_snapshot.total_amount
  or v_order.customer_delivery_confirmed_at is distinct from v_snapshot.accepted_at then
  raise exception using errcode='22023',message='K2_ORDER_CHARGE_IMMUTABLE';
 end if;
 if v_snapshot.quote->>'service'='express' then
  if v_order.shipping_amount<>0 or v_order.shipping_quote_status<>'pending_quote'
   or v_order.payment_status not in ('not_requested','unpaid','failed') then
   raise exception using errcode='22023',message='K2_DELIVERY_ACCEPTANCE_REQUIRED';
  end if;
 else
  if v_order.shipping_quote_status<>'customer_confirmed'
   or v_order.shipping_amount is distinct from (v_snapshot.quote->>'feeMinor')::numeric/100 then
   raise exception using errcode='22023',message='K2_ORDER_CHARGE_IMMUTABLE';
  end if;
 end if;
 if tg_op='UPDATE' then return new;end if;
 return null;
end $$;
revoke all on function k2_private.guard_order_delivery_charge_v1() from public,anon,authenticated,service_role;
create trigger order_delivery_charge_guard before update on public.order_requests
 for each row execute function k2_private.guard_order_delivery_charge_v1();
create constraint trigger order_delivery_snapshot_required after insert on public.order_requests
 deferrable initially deferred for each row execute function k2_private.guard_order_delivery_charge_v1();

create function k2_private.guard_order_delivery_items_v1() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='TRUNCATE' then
  if exists(select 1 from k2_private.order_delivery_snapshots) then raise exception using errcode='22023',message='K2_ORDER_CHARGE_IMMUTABLE';end if;
  return null;
 end if;
 if (tg_op in ('UPDATE','DELETE') and exists(select 1 from k2_private.order_delivery_snapshots where order_id=old.order_request_id))
  or (tg_op in ('INSERT','UPDATE') and exists(select 1 from k2_private.order_delivery_snapshots where order_id=new.order_request_id)) then
  raise exception using errcode='22023',message='K2_ORDER_CHARGE_IMMUTABLE';
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function k2_private.guard_order_delivery_items_v1() from public,anon,authenticated,service_role;
create trigger order_delivery_items_guard before insert or update or delete on public.order_request_items
 for each row execute function k2_private.guard_order_delivery_items_v1();
create trigger order_delivery_items_truncate before truncate on public.order_request_items
 for each statement execute function k2_private.guard_order_delivery_items_v1();

do $correction$ declare t record;b record;a record;v_definition text;begin
 for t in select * from jsonb_to_recordset('[{"identity":"public.submit_guest_order_v1(bigint, uuid, text, text, text, text)","before":"bb825b57bcbc860d08ea5ce8a13086ef35420470f9e460f5d62666577688eb70","after":"8545d3d616dc5d66c1ccde3955381a21bd51c4b069c9c1ed3aca5d0211bf5e59","body":"\ndeclare\n  v_payload jsonb;\n  v_order public.order_requests;\n  v_identity record;\n  v_conversation_id uuid;\n  v_message_id uuid;\n  v_ip bytea;\n  v_contact bytea;\n  v_rate record;\n  v_fingerprint bytea;\n  v_existing_hash bytea;\n  v_depth integer;\n  v_delivery jsonb;\n  v_quote jsonb;\n  v_acceptance jsonb;\n  v_accepted_at timestamptz;\nbegin\n  perform k2_private.lock_category_policy_v1(false);\n  if not k2_private.verify_guest_bff_request(''order'', p_timestamp, p_nonce, p_payload_text, p_ip_hash, p_signature) then\n    return query select false, ''REQUEST_REPLAYED'', 0, null::text, null::text, null::numeric,\n      null::numeric, null::numeric, null::text, null::text, null::timestamptz, null::text;\n    return;\n  end if;\n  v_payload := p_payload_text::jsonb;\n  v_ip := decode(p_ip_hash, ''hex'');\n  v_contact := k2_private.contact_hash(v_payload);\n  v_fingerprint := extensions.digest(convert_to(p_payload_text, ''UTF8''), ''sha256'');\n  if p_guest_grant_hash ~ ''^[0-9a-f]{64}$'' then v_existing_hash := decode(p_guest_grant_hash, ''hex''); end if;\n\n  select * into v_rate from k2_private.consume_guest_rate(''order'',''ip'',v_ip,900,5);\n  if not v_rate.allowed then\n    return query select false, ''RATE_LIMITED'', v_rate.retry_after_seconds, null::text, null::text,\n      null::numeric, null::numeric, null::numeric, null::text, null::text, null::timestamptz, null::text;\n    return;\n  end if;\n  select * into v_rate from k2_private.consume_guest_rate(''order'',''contact'',v_contact,3600,3);\n  if not v_rate.allowed then\n    return query select false, ''RATE_LIMITED'', v_rate.retry_after_seconds, null::text, null::text,\n      null::numeric, null::numeric, null::numeric, null::text, null::text, null::timestamptz, null::text;\n    return;\n  end if;\n\n  -- Match the canonical writer: serialize the key before inventory/FK locks.\n  perform pg_advisory_xact_lock(hashtextextended(''k2.website-order:''||trim(v_payload->>''idempotencyKey''),0));\n  select * into v_order from public.order_requests\n  where idempotency_key = v_payload->>''idempotencyKey'';\n  if found then\n    if v_order.request_fingerprint is distinct from v_fingerprint then\n      return query select false, ''IDEMPOTENCY_CONFLICT'', 0, null::text, null::text,\n        null::numeric, null::numeric, null::numeric, null::text, null::text, null::timestamptz, null::text;\n    else\n      return query select true, null::text, 0, v_order.public_reference, v_order.status,\n        v_order.subtotal, v_order.discount_amount, case when v_order.shipping_quote_status=''pending_quote'' then null::numeric else v_order.total_amount end,\n        v_order.shipping_quote_status, v_order.delivery_status, v_order.created_at, null::text;\n    end if;\n    return;\n  end if;\n\n  -- Historical saved receipts above remain valid; fresh legacy charging refuses.\n  if v_payload ?| array[''shippingAmount'',''shippingQuoteStatus''] or jsonb_typeof(v_payload->''delivery'') is distinct from ''object'' then\n    raise exception using errcode=''22023'',message=''K2_DELIVERY_REVIEW_REQUIRED'';\n  end if;\n  if v_payload-array[''customerName'',''email'',''phone'',''address'',''fulfillmentMethod'',''note'',''items'',''idempotencyKey'',''couponCode'',''delivery'']<>''{}''::jsonb\n    or (v_payload->''delivery'')-array[''service'',''destination'',''acceptance'']<>''{}''::jsonb then\n    raise exception using errcode=''22023'',message=''K2_DELIVERY_INPUT_INVALID'';\n  end if;\n  v_delivery:=jsonb_build_object(''service'',v_payload->''delivery''->''service'',''items'',v_payload->''items'',''destination'',v_payload->''delivery''->''destination'');\n  if (v_delivery->>''service''=''standard'' and v_payload->>''fulfillmentMethod'' not in (''Courier delivery'',''Standard Courier Delivery'',''Standard Courier Delivery (Luzon)'',''Standard Courier Delivery (Visayas)'',''Standard Courier Delivery (Mindanao)''))\n    or (v_delivery->>''service''=''pickup'' and v_payload->>''fulfillmentMethod'' not in (''Pickup'',''K2 Warehouse Pickup''))\n    or (v_delivery->>''service''=''express'' and v_payload->>''fulfillmentMethod'' is distinct from ''Metro Manila Express Dispatch'') then\n    raise exception using errcode=''22023'',message=''K2_DELIVERY_INPUT_INVALID'';\n  end if;\n  -- Saved receipt/conflict above skips fresh policy configuration and stock.\n  perform 1 from public.coupons\n   where code=upper(trim(v_payload->>''couponCode'')) for update;\n  perform k2_private.require_website_order_items(v_payload->''items'');\n  perform 1 from public.product_batches b\n   where b.sku in(select item->>''sku'' from jsonb_array_elements(v_payload->''items'') item)\n   order by b.sku,b.id for update;\n  if exists(select 1 from public.inventory_balances b\n   where b.location_code=''MANILA_MAIN''\n    and b.sku in(select item->>''sku'' from jsonb_array_elements(v_payload->''items'') item)\n    and (b.on_hand<0 or b.reserved<0 or b.reserved>b.on_hand)) then\n   raise exception using errcode=''23514'',message=''K2_RESERVATION_BALANCE_MISMATCH'';\n  end if;\n  v_quote:=k2_private.resolve_customer_delivery_quote_v1(v_delivery);\n  v_acceptance:=v_payload->''delivery''->''acceptance'';\n  if v_quote->>''service''=''express'' then\n    if v_acceptance is not null and v_acceptance<>''null''::jsonb then\n      raise exception using errcode=''22023'',message=''K2_DELIVERY_INPUT_INVALID'';\n    end if;\n  else\n    if jsonb_typeof(v_acceptance) is distinct from ''object''\n      or not(v_acceptance ?& array[''inputFingerprint'',''rateVersion''])\n      or v_acceptance-array[''inputFingerprint'',''rateVersion'']<>''{}''::jsonb\n      or v_acceptance->''inputFingerprint'' is distinct from v_quote->''inputFingerprint''\n      or v_acceptance->''rateVersion'' is distinct from v_quote->''rateVersion'' then\n      raise exception using errcode=''22023'',message=''K2_DELIVERY_QUOTE_CHANGED'';\n    end if;\n    v_accepted_at:=clock_timestamp();\n  end if;\n  select maximum_depth into v_depth from k2_private.category_policy_command_config where singleton;\n  if v_depth is null or v_depth<1 then\n   raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';\n  end if;\n  perform k2_private.start_guest_category_lot_context_v1(v_depth,p_nonce);\n  select * into v_identity from k2_private.resolve_guest_identity(\n    v_payload, ''website_guest'', v_existing_hash\n  );\n  v_order := public.submit_order_request_v2(\n    v_payload->>''customerName'', nullif(v_payload->>''email'',''''), nullif(v_payload->>''phone'',''''),\n    v_payload->>''address'', v_payload->>''fulfillmentMethod'', nullif(v_payload->>''note'',''''),\n    v_payload->''items'', v_payload->>''idempotencyKey'', nullif(v_payload->>''couponCode'','''')\n  );\n\n  update public.order_requests o set shipping_amount=coalesce((v_quote->>''feeMinor'')::numeric/100,0),\n    shipping_quote_status=v_quote->>''status'',\n    total_amount=o.subtotal-o.discount_amount+coalesce((v_quote->>''feeMinor'')::numeric/100,0),\n    customer_delivery_confirmed_at=v_accepted_at,\n    delivery_status=case when v_quote->>''service''=''express'' then ''awaiting_quote'' else ''ready_to_pack'' end,\n    updated_at=clock_timestamp() where o.id=v_order.id returning o.* into v_order;\n\n  update public.order_requests set customer_id=v_identity.customer_id,\n    request_fingerprint=v_fingerprint where id=v_order.id returning * into v_order;\n\n  insert into k2_private.order_delivery_snapshots(order_id,idempotency_key,request_fingerprint,delivery_request,quote,\n    fulfillment_method,delivery_address,subtotal,discount_amount,total_amount,accepted_at)\n  values(v_order.id,v_order.idempotency_key,v_fingerprint,v_delivery,v_quote,v_order.fulfillment_method,v_order.delivery_address,\n    v_order.subtotal,v_order.discount_amount,v_order.total_amount,v_accepted_at);\n  insert into public.order_request_events(order_request_id,to_status,metadata)\n  values(v_order.id,v_order.status,jsonb_build_object(''event'',''delivery_contract_recorded'',''service'',v_quote->>''service'',\n    ''rateVersion'',v_quote->''rateVersion'',''feeMinor'',v_quote->''feeMinor'',''weightBasis'',v_quote->''weightBasis''));\n\n  insert into public.conversations(\n    customer_id, customer_name, customer_email, customer_phone, platform, source_kind, source_id\n  ) values (\n    v_identity.customer_id, v_order.customer_name, v_order.customer_email, v_order.customer_phone,\n    ''Website'', ''order_request'', v_order.id\n  )\n  on conflict (source_kind, source_id)\n    where source_kind is not null and source_id is not null\n  do update set\n    customer_id=excluded.customer_id,\n    customer_name=excluded.customer_name,\n    customer_email=excluded.customer_email,\n    customer_phone=excluded.customer_phone,\n    updated_at=now()\n  returning id into v_conversation_id;\n\n  insert into public.messages(\n    conversation_id, sender_type, content, is_draft, delivery_status, provider_event_key, direction\n  )\n  select v_conversation_id, ''Customer'',\n    ''Order '' || v_order.public_reference || '' received through the website. ''\n      || ''Delivery option: '' || coalesce(v_order.fulfillment_method, ''Standard'') || '' (₱'' || v_order.shipping_amount::text || ''). ''\n      || ''Total: ₱'' || v_order.total_amount::text || ''. Staff verify Manila stock and contact with payment details.'',\n    false, ''received'', ''guest-order-seed:'' || v_order.id::text, ''inbound''\n  where not exists (\n    select 1 from public.messages\n    where conversation_id = v_conversation_id\n      and (provider_event_key in (''guest-order-seed:'' || v_order.id::text, ''order_seed_'' || v_order.id::text)\n        or external_message_id in (''guest-order-seed:'' || v_order.id::text, ''order_seed_'' || v_order.id::text))\n  )\n  returning id into v_message_id;\n\n  insert into public.conversation_events(\n    conversation_id, event_type, reason, metadata\n  )\n  select v_conversation_id, ''inbound_message'',\n    ''Seeded customer conversation from order submission '' || v_order.public_reference,\n    jsonb_build_object(''order_id'',v_order.id,''public_reference'',v_order.public_reference,''source_kind'',''order_request'')\n  where v_message_id is not null;\n\n  if v_message_id is not null then\n    update public.conversations\n    set unread_count=1,last_inbound_at=now(),response_due_at=now()+interval ''4 hours'',\n      last_message_at=now(),updated_at=now()\n    where id=v_conversation_id;\n  end if;\n\n  insert into public.guest_access_grant_scopes(grant_id,scope_kind,scope_id,permissions)\n  values\n    (v_identity.grant_id,''order_request'',v_order.id,array[''read'']::text[]),\n    (v_identity.grant_id,''conversation'',v_conversation_id,array[''read'',''reply'']::text[])\n  on conflict do nothing;\n\n  perform k2_private.clear_category_lot_context_v1();\n  return query select true, null::text, 0, v_order.public_reference, v_order.status,\n    v_order.subtotal, v_order.discount_amount, case when v_order.shipping_quote_status=''pending_quote'' then null::numeric else v_order.total_amount end,\n    v_order.shipping_quote_status, v_order.delivery_status, v_order.created_at,\n    v_identity.raw_grant_token;\nend;\n","acl":["postgres=X/postgres","anon=X/postgres"],"config":["search_path=\"\""],"definer":true},{"identity":"public.set_order_delivery_details(uuid, numeric, text, text, text, boolean, text)","before":"713ac5bd8dba90a9db2ab6472ae7a91c50869463b0803255958a84829378573f","after":"6590ed31294c55ed131331745787cb5be0bb772da92ed5d4e995f8f7d62ea7c6","body":"\r\ndeclare v_order public.order_requests; v_quote_status text; v_delivery_status text;\r\nbegin\r\n  if not public.is_staff() then raise exception ''Staff access required''; end if;\r\n  if coalesce(p_shipping_amount, -1) < 0 then raise exception ''Shipping amount cannot be negative''; end if;\r\n  if nullif(trim(coalesce(p_courier_name, '''')), '''') is null then raise exception ''Courier name is required''; end if;\r\n  if nullif(trim(coalesce(p_note, '''')), '''') is null then raise exception ''A delivery communication note is required''; end if;\r\n  select * into v_order from public.order_requests where id = p_order_request_id for update;\r\n  if not found then raise exception ''Order request not found''; end if;\r\n  if v_order.status in (''fulfilled'', ''cancelled'') then raise exception ''Delivery details are closed for this order''; end if;\r\n\r\n  if v_order.channel_source in (''shopee'', ''tiktok'', ''lazada'') then\r\n    v_quote_status := ''platform_charged'';\r\n    v_delivery_status := case when v_order.status = ''confirmed'' then ''ready_to_pack'' else v_order.delivery_status end;\r\n  elsif coalesce(p_customer_confirmed, false) then\r\n    v_quote_status := ''customer_confirmed'';\r\n    v_delivery_status := case when v_order.status = ''confirmed'' then ''ready_to_pack'' else ''awaiting_quote'' end;\r\n  else\r\n    v_quote_status := ''quoted'';\r\n    v_delivery_status := ''awaiting_customer'';\r\n  end if;\r\n\r\n  update public.order_requests set\r\n    shipping_amount = p_shipping_amount,\r\n    total_amount = subtotal - discount_amount + p_shipping_amount,\r\n    shipping_quote_status = v_quote_status,\r\n    courier_name = trim(p_courier_name),\r\n    tracking_number = nullif(trim(p_tracking_number), ''''),\r\n    waybill_url = nullif(trim(p_waybill_url), ''''),\r\n    customer_delivery_confirmed_at = case when exists(select 1 from k2_private.order_delivery_snapshots where order_id=v_order.id)\n      then v_order.customer_delivery_confirmed_at else case when v_quote_status in (''platform_charged'', ''customer_confirmed'') then now() else null end end,\r\n    delivery_status = case when exists(select 1 from k2_private.order_delivery_snapshots where order_id=v_order.id)\n      then v_order.delivery_status else v_delivery_status end,\r\n    updated_at = now()\r\n  where id = v_order.id returning * into v_order;\r\n  insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id, metadata)\r\n  values (v_order.id, v_order.status, v_order.status, trim(p_note), auth.uid(), jsonb_build_object(\r\n    ''event'', ''delivery_details_updated'', ''shipping_amount'', p_shipping_amount,\n    ''courier_name'', trim(p_courier_name), ''shipping_quote_status'', v_quote_status,\r\n    ''tracking_number'', v_order.tracking_number, ''waybill_url'', v_order.waybill_url\r\n  ));\r\n  return v_order;\r\nend;\r\n","acl":null,"config":["search_path=public"],"definer":true}]'::jsonb) as x(identity text,before text,after text,body text,acl text[],config text[],definer boolean) loop
  select p.*,pg_get_functiondef(p.oid) definition into b from pg_proc p where p.oid=to_regprocedure(t.identity);
  if not found or encode(extensions.digest(convert_to(b.prosrc,'UTF8'),'sha256'),'hex')<>t.before
    or b.proacl::text[] is distinct from t.acl or b.proconfig is distinct from t.config
    or b.prosecdef is distinct from t.definer or pg_get_userbyid(b.proowner)<>'postgres' then
    raise exception using errcode='55000',message='K2_ORDER_DELIVERY_BODY_OR_METADATA_DRIFT:'||t.identity
      ||':body='||coalesce((encode(extensions.digest(convert_to(b.prosrc,'UTF8'),'sha256'),'hex')=t.before)::text,'missing')
      ||':acl='||((b.proacl::text[] is not distinct from t.acl)::text)
      ||':config='||((b.proconfig is not distinct from t.config)::text)
      ||':definer='||((b.prosecdef is not distinct from t.definer)::text);
  end if;
  v_definition:=replace(b.definition,b.prosrc,t.body);execute v_definition;
  select * into a from pg_proc where oid=b.oid;
  if encode(extensions.digest(convert_to(a.prosrc,'UTF8'),'sha256'),'hex')<>t.after
    or (to_jsonb(a)-'prosrc'-'proacl') is distinct from (to_jsonb(b)-'prosrc'-'proacl'-'definition')
    or a.proacl is distinct from b.proacl then
    raise exception using errcode='55000',message='K2_ORDER_DELIVERY_METADATA_CHANGED';
  end if;
 end loop;
end $correction$;
