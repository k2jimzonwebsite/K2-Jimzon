-- Prepared MAP-022 protected boolean-only system-readiness boundary.
-- Local rehearsal target only until OWNER-005 and the coordinated Admin cutover.
begin;

create or replace function public.read_admin_system_readiness_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  return jsonb_build_object(
    'databaseAccess',true,
    'orderRequestsPresent',pg_catalog.to_regclass('public.order_requests') is not null,
    'channelBoundaryPresent',pg_catalog.to_regprocedure('public.read_admin_channel_readiness_v1()') is not null,
    'staffBoundaryPresent',pg_catalog.to_regprocedure('public.read_admin_staff_access_v1()') is not null,
    'sessionRegistryPresent',pg_catalog.to_regclass('k2_private.admin_sessions') is not null,
    'securityEventBoundaryPresent',pg_catalog.to_regprocedure('public.read_admin_security_review_v1(integer)') is not null,
    'rawDiagnosticsExposed',false,
    'providerHealthVerified',false,
    'deploymentLatencyVerified',false
  );
end;
$$;
revoke all on function public.read_admin_system_readiness_v1() from public,anon;
grant execute on function public.read_admin_system_readiness_v1() to authenticated;

commit;
