-- MAP-019 data-retaining deactivation. Requires separate owner authorization.
-- First disable account/address UI in the Storefront artifact; preserve all saved data.
begin;
set local lock_timeout='8s';
revoke execute on function public.read_customer_portfolio_v1(bigint,uuid,text,text,text) from authenticated;
revoke execute on function public.save_customer_account_address_book_v1(bigint,uuid,text,text,text) from authenticated;
-- Keep the new columns, read/profile-save bodies and initialized-address legacy guard.
-- Never restore the old legacy writer or drop saved addresses after customers have used them.
notify pgrst,'reload schema';
commit;
