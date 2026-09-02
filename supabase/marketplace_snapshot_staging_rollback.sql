-- Non-destructive emergency rollback for the prepared marketplace snapshot
-- boundary. Evidence is retained; only command/read entry points are disabled.
begin;
revoke execute on function public.execute_admin_marketplace_snapshot_v1(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;
revoke execute on function public.read_admin_marketplace_snapshot_row_v1(uuid,uuid)
  from public,anon,authenticated;
revoke execute on function public.read_admin_marketplace_snapshot_status_v1(uuid)
  from public,anon,authenticated;
revoke execute on function public.read_admin_owner_close_session_v1(uuid)
  from public,anon,authenticated;
revoke execute on function public.read_admin_owner_close_order_import_v1(uuid)
  from public,anon,authenticated;
revoke execute on function public.read_admin_owner_close_fee_input_v1(uuid)
  from public,anon,authenticated;
revoke execute on function public.read_admin_owner_close_stock_input_v1(uuid)
  from public,anon,authenticated;
revoke execute on function public.read_admin_owner_close_pasabuy_input_v1(uuid)
  from public,anon,authenticated;
revoke execute on function public.read_admin_owner_close_bookkeeping_handoff_v1(uuid)
  from public,anon,authenticated;
revoke execute on function public.read_admin_marketplace_shop_options_v1()
  from public,anon,authenticated;
revoke execute on function public.read_admin_marketplace_coverage_input_v1(uuid)
  from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
