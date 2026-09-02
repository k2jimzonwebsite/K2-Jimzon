-- MAP-028 G-004: reload-safe receipt/status continuity through the exact
-- HttpOnly guest grant issued at submission. This returns operational receipt
-- fields only; contact, address, notes, internal IDs, and grant material remain
-- server-side.

create or replace function public.read_guest_order_status_v1(
  p_timestamp bigint,
  p_nonce uuid,
  p_payload_text text,
  p_ip_hash text,
  p_signature text,
  p_guest_grant_hash text
)
returns table(ok boolean,error_code text,retry_after_seconds integer,orders jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grant public.guest_access_grants;
  v_rate record;
begin
  if not k2_private.verify_guest_bff_request(
    'guest_read',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature
  ) then
    return query select false,'REQUEST_REPLAYED',0,'[]'::jsonb; return;
  end if;
  if p_payload_text <> '{}' or p_guest_grant_hash !~ '^[0-9a-f]{64}$' then
    return query select false,'GUEST_ACCESS_REQUIRED',0,'[]'::jsonb; return;
  end if;

  update public.guest_access_grants g set use_count=use_count+1,last_used_at=now()
  where g.token_hash=decode(p_guest_grant_hash,'hex') and g.status='active'
    and g.expires_at>now() and (g.max_uses is null or g.use_count<g.max_uses)
  returning g.* into v_grant;
  if not found then
    return query select false,'GUEST_ACCESS_EXPIRED',0,'[]'::jsonb; return;
  end if;

  select * into v_rate from k2_private.consume_guest_rate(
    'guest_order_read','grant',v_grant.token_hash,300,60
  );
  if not v_rate.allowed then
    return query select false,'RATE_LIMITED',v_rate.retry_after_seconds,'[]'::jsonb; return;
  end if;

  return query select true,null::text,0,coalesce((
    select jsonb_agg(jsonb_build_object(
      'public_reference',scoped.public_reference,
      'status',scoped.status,
      'payment_status',scoped.payment_status,
      'total_amount',scoped.total_amount,
      'shipping_quote_status',scoped.shipping_quote_status,
      'delivery_status',scoped.delivery_status,
      'item_count',coalesce((
        select sum(line.quantity)::integer
        from public.order_request_items line
        where line.order_request_id=scoped.id
      ),0),
      'created_at',scoped.created_at
    ) order by scoped.created_at desc)
    from (
      select request.* from public.order_requests request
      join public.guest_access_grant_scopes s
        on s.scope_kind='order_request' and s.scope_id=request.id
      where s.grant_id=v_grant.id and 'read'=any(s.permissions)
      order by request.created_at desc limit 20
    ) scoped
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.read_guest_order_status_v1(bigint,uuid,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.read_guest_order_status_v1(bigint,uuid,text,text,text,text) to anon;
