-- Rollback for the prepared MAP-023 payment-method availability switch.
-- Policies drop with the table. Run only against a database that received
-- 20260920_payment_method_availability.sql; it is a no-op otherwise.

begin;

do $$ begin
  if to_regclass('public.order_requests') is not null then
    drop trigger if exists check_cod_availability_trigger on public.order_requests;
  end if;
end $$;

drop function if exists public.check_cod_availability();
drop table if exists public.payment_method_availability;

commit;
