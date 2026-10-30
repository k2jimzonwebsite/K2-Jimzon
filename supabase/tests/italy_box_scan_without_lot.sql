-- Actual signed command against the disposable packing database.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claim.role','Admin',false);
select set_config('request.jwt.claims','{"aal":"aal2"}',false);
insert into public.consignments(id,manifest_code) values('20000000-0000-4000-8000-000000000005','SYNTHETIC-BOX-ONLY');
do $$
declare p jsonb; r jsonb; k uuid:=gen_random_uuid(); item public.consignment_items; rev bigint;
begin
 p:=jsonb_build_object('operation','count','consignmentId','20000000-0000-4000-8000-000000000005',
   'itemId',null,'code','8001234567890','boxCode','BOX-1','batchCode',null,'bestBeforeDate',null,'delta',1,'source','barcode');
 r:=public.test_pack(p,k);
 select * into item from public.consignment_items where id=(r->>'itemId')::uuid;
 if item.italy_packed_qty<>1 or item.box_code<>'BOX-1' or item.batch_code is not null or item.best_before_date is not null
   then raise exception 'Unknown lot/date not retained faithfully'; end if;
 if public.test_pack(p,k)<>r then raise exception 'Historical box-only retry changed receipt'; end if;
 perform public.test_pack(p);
 if (select count(*) from public.consignment_items where consignment_id=item.consignment_id)<>1
   or (select italy_packed_qty from public.consignment_items where id=item.id)<>2 then raise exception 'Box-only count duplicated line or lost unit'; end if;
 insert into public.consignment_items(consignment_id,sku,batch_code,box_code,best_before_date,expected_qty)
 values(item.consignment_id,item.sku,'KNOWN-LOT','BOX-1',current_date+180,1);
 perform public.test_pack(p);
 if (select italy_packed_qty from public.consignment_items where id=item.id)<>3
   or (select italy_packed_qty from public.consignment_items where consignment_id=item.consignment_id and batch_code='KNOWN-LOT')<>0
   then raise exception 'Unknown scan inherited a planned product lot'; end if;
 perform public.expect_pack_refusal(p||jsonb_build_object('batchCode','KNOWN-LOT'),'K2_ADMIN_PAYLOAD_INVALID');
 perform public.expect_pack_refusal(p||jsonb_build_object('boxCode','BOX-2','itemId',item.id),'K2_PACKING_LOT_MISMATCH');
 select packing_revision into rev from public.consignments where id=item.consignment_id;
 perform public.test_pack(jsonb_build_object('operation','remove','consignmentId',item.consignment_id,
   'itemId',item.id,'packingRevision',rev,'reason','Wrong box-only count'));
 perform public.expect_pack_refusal(p,'K2_PACKING_ITEM_REMOVED');
 if exists(select 1 from public.products where stock_available<>0 or published) then raise exception 'Italy packing changed available stock'; end if;
end $$;
