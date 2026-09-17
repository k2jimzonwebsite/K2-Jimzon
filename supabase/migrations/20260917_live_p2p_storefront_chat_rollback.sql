-- =============================================================================
-- Migration Rollback: 20260917_live_p2p_storefront_chat_rollback.sql
-- Description: Clean rollback for MAP-027 / IDEA-20260917-05 live storefront chat
-- =============================================================================

begin;

drop function if exists public.get_storefront_chat_v1(uuid);
drop function if exists public.submit_storefront_chat_v1(text, text, text, uuid, text);
drop function if exists public.website_reply_capability_v1();
drop function if exists public.append_website_customer_reply_v1(uuid, text);

commit;
