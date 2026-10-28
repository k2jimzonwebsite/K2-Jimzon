\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ declare r jsonb; page2 jsonb; begin
 r:=k2_test.portfolio('{"operation":"list","cursor":null}');
 if r->>'ok'<>'true' or (r->'summary'->>'orderCount')::int<>21 or (r->'summary'->>'fulfilledItems')::int<>42
   or (r->'summary'->>'verifiedAmount')::numeric<>200 or (r->'summary'->>'unknownPaymentCount')::int<>1
   or jsonb_array_length(r->'orders')<>20 or r::text like '%FOREIGN%' then raise exception 'ALL_RECORD_SUMMARY_OR_SCOPE_FAILED: %',r; end if;
 page2:=k2_test.portfolio(jsonb_build_object('operation','list','cursor',r->'nextCursor'));
 if jsonb_array_length(page2->'orders')<>1 or page2->'nextCursor'<>'null'::jsonb then raise exception 'KEYSET_PAGINATION_FAILED: %',page2; end if;
 r:=k2_test.portfolio('{"operation":"proof","orderReference":"WEB-TEST-001","proofId":"50000000-0000-4000-8000-000000000099"}');
 if r->>'ok'<>'false' or r::text like '%FOREIGN%' then raise exception 'CROSS_CUSTOMER_PROOF_LEAK'; end if;
 r:=k2_test.portfolio('{"operation":"proof","orderReference":"WEB-TEST-001","proofId":"50000000-0000-4000-8000-000000000001"}');
 if r->>'ok'<>'true' or convert_from(decode(r->'proof'->>'base64','base64'),'UTF8')<>'synthetic proof bytes' then raise exception 'OWN_PROOF_FAILED'; end if;
 r:=k2_test.portfolio('{"operation":"list","cursor":null,"userId":"other"}');
 if r->>'ok'<>'false' then raise exception 'SELECTOR_ALLOWED'; end if;
end $$;
-- Centavos must be counted consistently in the summary and each order;
-- malformed historical amounts must remain unknown rather than becoming zero.
update public.order_requests set payment_evidence=jsonb_build_object('currency','PHP','amount',10.25) where public_reference='WEB-TEST-020';
update public.order_requests set payment_status='refunded',payment_evidence=jsonb_build_object('currency','PHP','amount',4.50) where public_reference='WEB-TEST-019';
update public.order_requests set payment_evidence=jsonb_build_object('currency','PHP','amount','10x25') where public_reference='WEB-TEST-018';
update public.order_requests set payment_evidence=jsonb_build_object('currency','PHP','amount','10'||chr(92)||'x25') where public_reference='WEB-TEST-017';
update public.order_requests set payment_evidence=jsonb_build_object('currency','USD','amount',10.25) where public_reference='WEB-TEST-016';
update public.order_requests set payment_evidence=jsonb_build_object('currency','PHP','amount','10.123') where public_reference='WEB-TEST-015';
do $$ declare r jsonb; decimal_payment jsonb; invalid_payment jsonb; begin
 r:=k2_test.portfolio('{"operation":"list","cursor":null}');
 select o->'payment' into decimal_payment from jsonb_array_elements(r->'orders') o where o->>'public_reference'='WEB-TEST-020';
 select o->'payment' into invalid_payment from jsonb_array_elements(r->'orders') o where o->>'public_reference'='WEB-TEST-018';
 if (r->'summary'->>'verifiedAmount')::numeric is distinct from 150.25::numeric
   or (r->'summary'->>'refundedAmount')::numeric is distinct from 4.50::numeric
   or (r->'summary'->>'unknownPaymentCount')::int is distinct from 5
   or (decimal_payment->>'amount')::numeric is distinct from 10.25::numeric
   or invalid_payment->'amount' is distinct from 'null'::jsonb then
   raise exception 'PORTFOLIO_CENTAVO_OR_UNKNOWN_AMOUNT_FAILED: %',r->'summary';
 end if;
end $$;
rollback;
select 'CUSTOMER_PORTFOLIO_ASSERTIONS_PASSED';
