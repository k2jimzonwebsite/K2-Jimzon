insert into public.products(id,sku,lifestyle_images,secondary_images) values('d74a4161-72ca-4d72-8f59-37aa690e1869','K2-FIXTURE','{}','{}');
update public.product_intake_sessions set product_id='d74a4161-72ca-4d72-8f59-37aa690e1869',assigned_sku='K2-FIXTURE' where id='e74a4161-72ca-4d72-8f59-37aa690e1869';
insert into storage.objects(bucket_id,name,metadata)
select 'product-images',actor_id::text||'/product-media/'||id::text||'-'||repeat('b',16)||'.png','{"mimetype":"image/png","size":1000}' from k2_private.intake_ai_jobs where kind='PRIMARY';
grant select on public.products to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','6a88b5f9-8be6-4f4d-a504-173c96f40df1',false);
select set_config('request.jwt.claims','{"aal":"aal2"}',false);
do $$
declare s uuid:='e74a4161-72ca-4d72-8f59-37aa690e1869'; j uuid; r jsonb; signed jsonb; path text; url text; assignment jsonb; before_state jsonb; payload jsonb;
begin
 r:=public.intake_test_call('read',jsonb_build_object('sessionId',s));
 select (value->>'id')::uuid into j from jsonb_array_elements(r->'jobs') where value->>'kind'='PRIMARY';
 path:=auth.uid()::text||'/product-media/'||j::text||'-'||repeat('b',16)||'.png';
 url:='https://fixture.supabase.co/storage/v1/object/public/product-images/'||path;
 signed:=public.intake_test_signed('product_media_upload',jsonb_build_object('objectPath',path,'contentType','image/png','size',1000,'width',1024,'height',1024,'sha256',repeat('b',64)),j);
 perform public.execute_admin_product_media_command_v1(signed->>'p_action',(signed->>'p_timestamp')::bigint,(signed->>'p_nonce')::uuid,j,signed->>'p_payload_text',signed->>'p_signature');
 before_state:=jsonb_build_object('sku','K2-FIXTURE','primary_image_url',null,'lifestyle_images','[]'::jsonb,'secondary_images','[]'::jsonb);
 assignment:=jsonb_build_object('sku','K2-FIXTURE','primary',jsonb_build_object('url',url,'objectPath',path),'lifestyle','[]'::jsonb,'secondary','[]'::jsonb,'reason','Reviewed fixture package fidelity');
 payload:=jsonb_build_object('sessionId',s,'jobId',j,'before',before_state,'assignment',public.intake_test_signed('product_media_assign',assignment,j));
 begin
   perform public.intake_test_call('attach',jsonb_set(payload,'{before,primary_image_url}','"https://fixture.invalid/stale.png"'));
   raise exception 'stale media snapshot accepted';
 exception when others then if sqlerrm not like '%AI_JOB_CONFLICT%' then raise; end if; end;
 r:=public.intake_test_call('attach',payload);
 if r->'job'->'attachment_result'->'media'->>'primary' is distinct from url then raise exception 'canonical attachment missing'; end if;
 r:=public.intake_test_call('attach',payload);
 if (select primary_image_url from public.products where sku='K2-FIXTURE') is distinct from url then raise exception 'canonical product not updated'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from k2_private.product_media_events)<>1 then raise exception 'duplicate canonical media event'; end if;
 if (select count(*) from k2_private.admin_command_receipts where action='product_media_assign')<>1 then raise exception 'duplicate assignment receipt'; end if;
end $$;
