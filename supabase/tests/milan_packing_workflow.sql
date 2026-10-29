-- Executed only in the marked disposable packing rehearsal database.
do $$ begin
 if to_regprocedure('k2_private.apply_consignment_packing_v1(uuid,jsonb)') is null then
  raise exception 'EXPECTED_MISSING_PACKING_WORKFLOW';
 end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claim.role','Admin',false);
select set_config('request.jwt.claims','{"aal":"aal2"}',false);
insert into public.consignments(id,manifest_code) values('20000000-0000-4000-8000-000000000001','SYNTHETIC-PACKING');
create function public.test_pack(p jsonb,k uuid default gen_random_uuid()) returns jsonb language plpgsql as $$
declare result jsonb;stamp bigint:=extract(epoch from clock_timestamp())::bigint;nonce uuid:=gen_random_uuid();signature text;message text;
begin
 message:='consignment_packing'||E'\n'||stamp||E'\n'||nonce||E'\n'||auth.uid()||E'\n'||k||E'\n'||encode(extensions.digest(convert_to(p::text,'UTF8'),'sha256'),'hex');
 signature:=encode(extensions.hmac(convert_to(message,'UTF8'),decode(repeat('2c',32),'hex'),'sha256'),'hex');
 result:=public.execute_admin_consignment_command_v1('consignment_packing',stamp,nonce,k,p::text,signature);
 return result;
end $$;
create function public.expect_pack_refusal(p jsonb,expected text) returns void language plpgsql as $$
begin
 begin perform public.test_pack(p); exception when others then
  if position(expected in sqlerrm)>0 then return; end if; raise;
 end;
 raise exception 'Expected refusal: %',expected;
end $$;
do $$
declare p jsonb; original_p jsonb; r jsonb; replay jsonb; item uuid; k uuid:=gen_random_uuid(); rev bigint;
begin
 p:=jsonb_build_object('operation','count','consignmentId','20000000-0000-4000-8000-000000000001','itemId',null,
   'code','8001234567890','boxCode','BOX-A','batchCode','LOT-A','bestBeforeDate',((clock_timestamp() at time zone 'Asia/Manila')::date+180)::text,'delta',1,'source','barcode');
 original_p:=p; r:=public.test_pack(p,k); item:=(r->>'itemId')::uuid;
 if (select count(*) from public.products)<>1 or (select italy_packed_qty from public.consignment_items where id=item)<>1
   or exists(select 1 from public.products where status<>'Draft' or published or is_human_reviewed or stock_available<>0)
   then raise exception 'Draft creation changed inventory/publication or failed initial count'; end if;
 replay:=public.test_pack(p,k);
 if r<>replay or (select italy_packed_qty from public.consignment_items where id=item)<>1 then raise exception 'Retry duplicated count'; end if;
 perform public.test_pack(p);
 if (select count(*) from public.products)<>1 or (select italy_packed_qty from public.consignment_items where id=item)<>2 then raise exception 'Repeated physical scan was not counted'; end if;
 p:=p||jsonb_build_object('itemId',item,'code',r->>'sku','source','counter','delta',-1);
 perform public.test_pack(p); perform public.test_pack(p);
 perform public.expect_pack_refusal(p,'K2_PACKING_COUNT_INVALID');
 perform public.expect_pack_refusal(p||jsonb_build_object('boxCode','OTHER'),'K2_PACKING_LOT_MISMATCH');
 perform public.test_pack(p||'{"delta":1}'::jsonb);
 select packing_revision into rev from public.consignments where id='20000000-0000-4000-8000-000000000001';
 perform public.expect_pack_refusal(jsonb_build_object('operation','remove','consignmentId',p->>'consignmentId','itemId',item,'packingRevision',rev-1,'reason','Wrong lot'),'K2_PACKING_REVIEW_STALE');
 perform public.test_pack(jsonb_build_object('operation','remove','consignmentId',p->>'consignmentId','itemId',item,'packingRevision',rev,'reason','Wrong lot'));
 if (select packing_removed_at is null or italy_packed_qty<>0 from public.consignment_items where id=item) then raise exception 'Removal not retained safely'; end if;
 perform public.expect_pack_refusal(p||'{"delta":1}'::jsonb,'K2_PACKING_ITEM_REMOVED');
 select packing_revision into rev from public.consignments where id='20000000-0000-4000-8000-000000000001';
 perform public.test_pack(jsonb_build_object('operation','restore','consignmentId',p->>'consignmentId','itemId',item,'packingRevision',rev,'reason','Restore correct lot'));
 if (select italy_packed_qty<>1 or packing_removed_at is not null from public.consignment_items where id=item) then raise exception 'Restore lost original count'; end if;
 select packing_revision into rev from public.consignments where id='20000000-0000-4000-8000-000000000001';
 perform public.test_pack(jsonb_build_object('operation','cancel','consignmentId',p->>'consignmentId','packingRevision',rev,'reason','Wrong shipment'));
 perform public.expect_pack_refusal(p||'{"delta":1}'::jsonb,'K2_PACKING_CLOSED');
 select packing_revision into rev from public.consignments where id='20000000-0000-4000-8000-000000000001';
 perform public.test_pack(jsonb_build_object('operation','reopen','consignmentId',p->>'consignmentId','packingRevision',rev,'reason','Packing resumed'));
 select packing_revision into rev from public.consignments where id='20000000-0000-4000-8000-000000000001';
 perform public.test_pack(jsonb_build_object('operation','dispatch','consignmentId',p->>'consignmentId','packingRevision',rev,'reason','Reviewed box handoff','acknowledgeVariance',false));
 perform public.expect_pack_refusal(p||'{"delta":1}'::jsonb,'K2_PACKING_CLOSED');
 replay:=public.test_pack(original_p,k);
 if replay<>r then raise exception 'Historical receipt lost after dispatch'; end if;
 if (select count(*) from public.products)<>1 or exists(select 1 from public.products where stock_available<>0 or published or is_human_reviewed)
   or (select manila_scanned_qty from public.consignment_items where id=item)<>0 then raise exception 'Packing changed stock, sale or Manila recount'; end if;
 perform set_config('request.jwt.claim.role','Customer',true);
 perform public.expect_pack_refusal(original_p,'K2_ADMIN_ACCESS_REQUIRED');
end $$;
