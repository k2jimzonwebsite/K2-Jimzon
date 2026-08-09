-- K2 Jimzon security boundary hardening
--
-- Supabase's historical default privileges granted EXECUTE directly to anon.
-- Revoking from PUBLIC alone therefore did not close staff-only RPC endpoints.
-- Keep only the explicitly public customer-entry RPCs available before login.

do $$
declare
  v_function record;
begin
  for v_function in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname not in (
        'submit_order_request',
        'submit_order_request_v2',
        'submit_pasabuy_request',
        'validate_coupon'
      )
  loop
    execute format('revoke execute on function %s from public, anon', v_function.function_signature);
  end loop;
end;
$$;

-- Reassert the four reviewed public entry points explicitly. Their function
-- bodies validate their inputs and do not trust browser-authored prices.
grant execute on function public.submit_order_request(text,text,text,text,text,text,jsonb,text) to anon;
grant execute on function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text) to anon;
grant execute on function public.submit_pasabuy_request(text,text,text,text,text,integer,numeric,text,boolean,text) to anon;
grant execute on function public.validate_coupon(text,numeric) to anon;

-- These legacy reporting views expose operational or financial information.
-- They must honor caller permissions and are not direct browser APIs.
alter view public.v_product_stock_from_batches set (security_invoker = true);
alter view public.products_with_margins set (security_invoker = true);
alter view public.v_batch_allocations set (security_invoker = true);
alter view public.v_stock_by_hub set (security_invoker = true);
alter view public.v_stock_by_custodian set (security_invoker = true);
alter view public.v_stock_by_channel set (security_invoker = true);
alter view public.staff_allocation_variance set (security_invoker = true);

revoke all on public.v_product_stock_from_batches from anon, authenticated;
revoke all on public.products_with_margins from anon, authenticated;
revoke all on public.v_batch_allocations from anon, authenticated;
revoke all on public.v_stock_by_hub from anon, authenticated;
revoke all on public.v_stock_by_custodian from anon, authenticated;
revoke all on public.v_stock_by_channel from anon, authenticated;
revoke all on public.staff_allocation_variance from anon, authenticated;

-- Pin search paths for older functions identified by the database advisor.
alter function public.touch_staff_allocations() set search_path = public, pg_temp;
alter function public.decrement_stock(text,integer) set search_path = public, pg_temp;
alter function public.process_audit_log() set search_path = public, pg_temp;
alter function public.receive_po(uuid) set search_path = public, pg_temp;
alter function public.receive_po_scanned(uuid,jsonb) set search_path = public, pg_temp;
alter function public.reject_event_mutation() set search_path = public, pg_temp;

notify pgrst, 'reload schema';
