begin;
-- Apply after the exact-lot function and compose with the payment boundary.
do $patch$
declare v_definition text; v_old text;
begin
 if to_regprocedure('public.record_packing_scan_exact_v1(uuid,text,uuid,boolean)') is null then
   raise exception 'Exact packing function required';
 end if;
 if to_regprocedure('public.execute_admin_fulfillment_command_v1(text,bigint,uuid,uuid,text,text)') is null then
   raise exception 'Signed fulfillment boundary required';
 end if;
 select pg_get_functiondef('public.execute_admin_fulfillment_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure) into v_definition;
 if position('record_packing_scan_exact_v1' in v_definition)>0 then return; end if;
 v_old := $old$select public.record_packing_scan(
      (v_payload->>'orderRequestId')::uuid, v_payload->>'scannedCode'
    ) into v_result;$old$;
 if position(v_old in v_definition)=0 then raise exception 'Packing wrapper changed; review before applying'; end if;
 v_definition:=replace(v_definition,$old$array['orderRequestId','scannedCode']$old$,$new$array['orderRequestId','scannedCode','reservationId','lotConfirmed']$new$);
 v_definition:=replace(v_definition,v_old,$new$select public.record_packing_scan_exact_v1(
      (v_payload->>'orderRequestId')::uuid, v_payload->>'scannedCode',
      (v_payload->>'reservationId')::uuid, (v_payload->>'lotConfirmed')::boolean
    ) into v_result;$new$);
 execute v_definition;
end;
$patch$;
notify pgrst,'reload schema';
commit;
