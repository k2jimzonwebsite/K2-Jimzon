-- Emergency exposure rollback for the direct-order buyer path.
-- Preserve private proof bytes and the staff read path for reconciliation.
-- Restore the previous Storefront/Admin deployments before running this file.
begin;
revoke execute on function public.get_order_conversation_v1(uuid,text) from anon, authenticated;
revoke execute on function public.submit_order_message_v1(uuid,text,text,uuid) from anon, authenticated;
revoke execute on function public.submit_order_payment_receipt_v1(uuid,text,text,text,text,uuid) from anon, authenticated;
notify pgrst, 'reload schema';
commit;
