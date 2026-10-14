-- Scoped rollback retains all canonical messages and private buyer proofs.
begin;
drop function if exists public.guest_order_conversation_v1(bigint,uuid,text,text,text,text,text);
notify pgrst, 'reload schema';
commit;
