-- MAP-018 / IDEA-20261010-08. Owned disposable request-context witness only.
-- Observe caller settings without changing deadlines, roles or canonical guards.
CREATE FUNCTION public.k2_fixture_tariff_context_v1() RETURNS void
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path='' AS $fixture$
 SELECT pg_catalog.set_config('response.headers',pg_catalog.json_build_array(
 pg_catalog.json_build_object('x-k2-fixture-lock-ms',(pg_catalog.date_part('epoch',pg_catalog.current_setting('lock_timeout')::interval)*1000)::integer::text),
 pg_catalog.json_build_object('x-k2-fixture-statement-ms',(pg_catalog.date_part('epoch',pg_catalog.current_setting('statement_timeout')::interval)*1000)::integer::text),
 pg_catalog.json_build_object('x-k2-fixture-role',current_user),
 pg_catalog.json_build_object('x-k2-fixture-session-role',session_user))::text,true);
$fixture$;
REVOKE ALL ON FUNCTION public.k2_fixture_tariff_context_v1() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.k2_fixture_tariff_context_v1() TO anon,authenticated,service_role;
