-- MAP-017 rollback refusal guard.
--
-- The prior generated rollback restored anonymous/public DML, blanket USING
-- (true) policies, public Storage writes, and legacy Realtime exposure. That is
-- not a safe recovery path and must never be executed.
--
-- MAP-017 requires a captured, reviewed pre-change privilege/policy snapshot and
-- a data-preserving inverse migration before permanent application. Until that
-- exists, recovery is fail-closed and the hardening migration remains unapplied.

begin;

do $map017_rollback_refusal$
begin
  raise exception using
    errcode = '55000',
    message = 'MAP017_ROLLBACK_NOT_IMPLEMENTED',
    detail = 'A reviewed captured-baseline inverse migration is required.';
end
$map017_rollback_refusal$;

rollback;
