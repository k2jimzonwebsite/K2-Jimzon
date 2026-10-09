-- IDEA-20261002-03 / MAP-023. Fresh-only canonical quote preparation, not activation.
-- Generated package supplies the checksum-pinned PSA reference at the one marker.
-- Caller must use one guarded root transaction after accepted guest/tariff stages.
set local client_encoding='UTF8';
do $admission$
begin
 if to_regclass('k2_private.customer_delivery_rate_versions') is null
    or to_regprocedure('k2_private.customer_delivery_fee_minor_v1(integer,text,integer)') is null
    or to_regprocedure('k2_private.verify_guest_bff_request(text,bigint,uuid,text,text,text)') is null
    or to_regclass('k2_private.delivery_psgc_locations') is not null
    or to_regprocedure('public.quote_customer_delivery_v1(bigint,uuid,text,text,text)') is not null
    or to_regprocedure('public.read_delivery_locations_v1(text)') is not null
    or to_regprocedure('k2_private.shipping_quantity_g_v1(text)') is not null
    or to_regprocedure('k2_private.shipping_packed_unit_v1(jsonb)') is not null
    or to_regprocedure('k2_private.resolve_customer_delivery_quote_v1(jsonb)') is not null
    or exists(select 1 from pg_attribute where attrelid='public.products'::regclass
      and attname='shipping_weight_g' and not attisdropped) then
  raise exception using errcode='55000',message='K2_CUSTOMER_QUOTE_FRESH_CONTRACT_REQUIRED';
 end if;
end $admission$;

alter table public.products add column shipping_weight_g integer;
alter table public.products add constraint products_shipping_weight_range_check
 check(shipping_weight_g is null or shipping_weight_g between 1 and 100000);
comment on column public.products.shipping_weight_g is
 'Measured packed unit grams only; null remains unmeasured. The versioned customer quote may use explicitly labelled canonical estimates without writing this field.';

create table k2_private.delivery_psgc_locations (
 code text primary key check(code~'^[0-9]{10}$'),
 name text not null check(length(btrim(name))>0),
 level text not null check(level in ('Reg','Prov','Group','City','Mun','SubMun','Bgy')),
 parent_code text references k2_private.delivery_psgc_locations(code),
 region_code text not null references k2_private.delivery_psgc_locations(code),
 area text not null check(area in ('NCR','Greater Luzon','Visayas','Mindanao')),
 source_version text not null default 'psgc-2026-06-30' check(source_version='psgc-2026-06-30'),
 check((level='Reg' and parent_code is null and region_code=code) or (level<>'Reg' and parent_code is not null))
);
create index delivery_psgc_parent_idx on k2_private.delivery_psgc_locations(parent_code,code);
alter table k2_private.delivery_psgc_locations enable row level security;
alter table k2_private.delivery_psgc_locations force row level security;
revoke all on k2_private.delivery_psgc_locations from public,anon,authenticated,service_role;
-- @@PSGC_DATA@@

create function k2_private.shipping_quantity_g_v1(p_text text)
returns numeric language plpgsql immutable set search_path='' as $$
declare v_text text;v_match text[];v_factor numeric;v_value numeric;v_scale integer;
begin
 if p_text is null or btrim(p_text)='' then return null;end if;
 if length(p_text)>500 then raise exception using errcode='22023',message='K2_SHIPPING_WEIGHT_INVALID';end if;
 v_text:=lower(regexp_replace(btrim(p_text),'[[:space:]]+',' ','g'));
 -- A label with no recognized quantity unit is unknown, not implicitly grams.
 if v_text !~ '(^|[^[:alpha:]])(kg|ml|cl|g|l)([^[:alpha:]]|$)' then return null;end if;
 v_match:=regexp_match(v_text,
  '^(?:[[:alpha:]]+(?:[- ][[:alpha:]]+)*[[:space:]]+)?(?:([0-9]+)[[:space:]]*[x×*][[:space:]]*)?([0-9]+(?:\.[0-9]+|,[0-9]{1,2})?)[[:space:]]*(kg|ml|cl|g|l)(?:[[:space:]]+[[:alpha:]]+(?:[- ][[:alpha:]]+)*)?(?:[[:space:]]*-?[[:space:]]*[0-9]+[[:space:]]*(?:pcs?|pieces?))?$');
 if v_match is null then raise exception using errcode='22023',message='K2_SHIPPING_WEIGHT_INVALID';end if;
 v_factor:=coalesce(v_match[1],'1')::numeric;
 v_value:=replace(v_match[2],',','.')::numeric;
 if v_factor<=0 or v_value<=0 then raise exception using errcode='22023',message='K2_SHIPPING_WEIGHT_INVALID';end if;
 v_scale:=case v_match[3] when 'kg' then 1000 when 'l' then 1000 when 'cl' then 10 else 1 end;
 return v_factor*v_value*v_scale;
end $$;
revoke all on function k2_private.shipping_quantity_g_v1(text) from public,anon,authenticated,service_role;

create function k2_private.shipping_packed_unit_v1(p_product jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare v_num numeric;v_quantity numeric;v_text text;v_unit text;v_weight numeric;v_tare integer;
begin
 if jsonb_typeof(p_product) is distinct from 'object' then raise exception using errcode='22023',message='K2_SHIPPING_WEIGHT_INVALID';end if;
 if p_product->'shipping_weight_g' is not null and p_product->'shipping_weight_g'<>'null'::jsonb then
  if jsonb_typeof(p_product->'shipping_weight_g') is distinct from 'number' then raise exception using errcode='22023',message='K2_SHIPPING_WEIGHT_INVALID';end if;
  v_num:=(p_product->>'shipping_weight_g')::numeric;
  if v_num<>trunc(v_num) or v_num not between 1 and 100000 then raise exception using errcode='22023',message='K2_SHIPPING_WEIGHT_INVALID';end if;
  return jsonb_build_object('weightG',v_num::integer,'basis','measured','estimatorVersion','k2-packed-v1');
 end if;
 v_text:=p_product->>'net_weight';
 if jsonb_typeof(p_product->'net_weight')='number' then
  if v_text::numeric<=0 then raise exception using errcode='22023',message='K2_SHIPPING_WEIGHT_INVALID';end if;
  v_unit:=lower(btrim(coalesce(p_product->>'unit_of_measure','')));
  if v_unit in ('g','kg','ml','l','cl') then v_text:=v_text||v_unit;end if;
 end if;
 v_quantity:=k2_private.shipping_quantity_g_v1(v_text);
 if v_quantity is null then v_quantity:=k2_private.shipping_quantity_g_v1(p_product->>'size');end if;
 if v_quantity is null then v_weight:=500;
 else
  v_tare:=case when concat_ws(' ',p_product->>'package_type',p_product->>'size',p_product->>'name')~*'jar|bottle|vasetto|glass' then 220 else 80 end;
  v_weight:=round(v_quantity+v_tare);
 end if;
 if v_weight not between 1 and 100000 then raise exception using errcode='22023',message='K2_SHIPPING_WEIGHT_INVALID';end if;
 return jsonb_build_object('weightG',v_weight::integer,'basis','estimated','estimatorVersion','k2-packed-v1');
end $$;
revoke all on function k2_private.shipping_packed_unit_v1(jsonb) from public,anon,authenticated,service_role;

create function public.read_delivery_locations_v1(p_parent_code text default null)
returns jsonb language plpgsql security definer stable set search_path='' as $$
declare v_children jsonb;v_count integer;
begin
 if p_parent_code is not null and (p_parent_code !~ '^[0-9]{10}$'
   or not exists(select 1 from k2_private.delivery_psgc_locations where code=p_parent_code)) then
  raise exception using errcode='22023',message='K2_DELIVERY_DESTINATION_INVALID';
 end if;
 select count(*) into v_count from k2_private.delivery_psgc_locations where parent_code is not distinct from p_parent_code;
 if v_count>1000 then raise exception using errcode='55000',message='K2_DELIVERY_REFERENCE_LIMIT';end if;
 select coalesce(jsonb_agg(jsonb_build_object('code',code,'name',name,'level',level,'sourceVersion',source_version) order by name,code),'[]'::jsonb)
 into v_children from k2_private.delivery_psgc_locations where parent_code is not distinct from p_parent_code;
 return jsonb_build_object('sourceVersion','psgc-2026-06-30','children',v_children);
end $$;
revoke all on function public.read_delivery_locations_v1(text) from public,anon,authenticated,service_role;
grant execute on function public.read_delivery_locations_v1(text) to anon,authenticated;

create function k2_private.resolve_customer_delivery_quote_v1(p_request jsonb)
returns jsonb language plpgsql security definer stable set search_path='' as $$
declare
 v_service text;v_item jsonb;v_sku text;v_qty numeric;v_product jsonb;v_unit jsonb;
 v_total bigint:=0;v_basis text:='measured';v_inputs jsonb:='[]'::jsonb;
 v_destination jsonb;v_path jsonb;v_code text;v_parent text;v_location k2_private.delivery_psgc_locations;
 v_area text;v_source text;v_version integer;v_fee integer;v_status text;v_message text;v_hash text;
begin
 if jsonb_typeof(p_request) is distinct from 'object' then raise exception using errcode='22023',message='K2_DELIVERY_INPUT_INVALID';end if;
 if not(p_request ?& array['service','items']) or p_request-array['service','items','destination']<>'{}'::jsonb
    or jsonb_typeof(p_request->'service') is distinct from 'string'
    or jsonb_typeof(p_request->'items') is distinct from 'array' then
  raise exception using errcode='22023',message='K2_DELIVERY_INPUT_INVALID';
 end if;
 v_service:=p_request->>'service';
 if v_service not in ('standard','pickup','express') or jsonb_array_length(p_request->'items') not between 1 and 50 then
  raise exception using errcode='22023',message='K2_DELIVERY_INPUT_INVALID';
 end if;
 if exists(select 1 from jsonb_array_elements(p_request->'items') x group by x->>'sku' having count(*)>1) then
  raise exception using errcode='22023',message='K2_DELIVERY_INPUT_INVALID';
 end if;
 for v_item in select x from jsonb_array_elements(p_request->'items') x order by x->>'sku' loop
  if jsonb_typeof(v_item) is distinct from 'object' or not(v_item ?& array['sku','quantity'])
     or v_item-array['sku','quantity']<>'{}'::jsonb or jsonb_typeof(v_item->'sku') is distinct from 'string'
     or jsonb_typeof(v_item->'quantity') is distinct from 'number' then
   raise exception using errcode='22023',message='K2_DELIVERY_INPUT_INVALID';
  end if;
  v_sku:=v_item->>'sku';v_qty:=(v_item->>'quantity')::numeric;
  if length(v_sku) not between 1 and 80 or v_sku !~ '^[A-Za-z0-9._/-]+$'
     or v_qty<>trunc(v_qty) or v_qty not between 1 and 99 then
   raise exception using errcode='22023',message='K2_DELIVERY_INPUT_INVALID';
  end if;
  select to_jsonb(p) into v_product from public.products p where p.sku=v_sku
   and p.is_human_reviewed is true and nullif(btrim(p.name),'') is not null
   and nullif(btrim(p.primary_image_url),'') is not null and coalesce(p.srp,p.retail_price,0)>0
   and (p.status::text='Unlisted' or (p.status::text in ('Live','Active') and p.published is true))
   and exists(select 1 from public.channel_listings l where l.sku=p.sku and l.channel_source='website'
    and l.shop_id is null and l.status='Active' and l.publication_status in ('ready','published') and l.validation_errors='[]'::jsonb);
  if not found then raise exception using errcode='K2WEB',message='K2_PRODUCT_NOT_OFFERED_ON_WEBSITE';end if;
  if v_service='pickup' then v_inputs:=v_inputs||jsonb_build_array(jsonb_build_object('sku',v_sku,'quantity',v_qty::integer));
  else
   v_unit:=k2_private.shipping_packed_unit_v1(v_product);
   v_total:=v_total+(v_unit->>'weightG')::bigint*v_qty::bigint;
   if v_unit->>'basis'='estimated' then v_basis:='estimated';end if;
   v_inputs:=v_inputs||jsonb_build_array(jsonb_build_object('sku',v_sku,'quantity',v_qty::integer,'packed',v_unit,
    'facts',jsonb_build_object('shippingWeight',v_product->'shipping_weight_g','netWeight',v_product->'net_weight',
     'unit',v_product->'unit_of_measure','size',v_product->'size','package',v_product->'package_type','name',v_product->'name')));
  end if;
 end loop;
 if v_service='pickup' then
  v_fee:=0;v_total:=null;v_basis:='not_applicable';v_status:='customer_confirmed';v_message:='PICKUP_ZERO';v_destination:='null'::jsonb;
 else
  if v_total not between 1 and 495000000 then raise exception using errcode='22023',message='K2_SHIPPING_WEIGHT_INVALID';end if;
  v_destination:=p_request->'destination';
  if jsonb_typeof(v_destination) is distinct from 'object' then raise exception using errcode='22023',message='K2_DELIVERY_DESTINATION_INVALID';end if;
  if not(v_destination ?& array['sourceVersion','path']) or v_destination-array['sourceVersion','path']<>'{}'::jsonb
     or v_destination->>'sourceVersion' is distinct from 'psgc-2026-06-30'
     or jsonb_typeof(v_destination->'path') is distinct from 'array' then
   raise exception using errcode='22023',message='K2_DELIVERY_DESTINATION_INVALID';
  end if;
  v_path:=v_destination->'path';
  if jsonb_array_length(v_path) not between 3 and 5 then raise exception using errcode='22023',message='K2_DELIVERY_DESTINATION_INVALID';end if;
  for v_item in select x from jsonb_array_elements(v_path) x loop
   if jsonb_typeof(v_item) is distinct from 'string' then raise exception using errcode='22023',message='K2_DELIVERY_DESTINATION_INVALID';end if;
   v_code:=v_item#>>'{}';
   select * into v_location from k2_private.delivery_psgc_locations where code=v_code;
   if not found or v_location.parent_code is distinct from v_parent then raise exception using errcode='22023',message='K2_DELIVERY_DESTINATION_INVALID';end if;
   v_parent:=v_code;
  end loop;
  if v_location.level<>'Bgy' then raise exception using errcode='22023',message='K2_DELIVERY_DESTINATION_INVALID';end if;
  v_area:=v_location.area;v_source:=v_location.source_version;
  if v_service='express' then
   if v_area<>'NCR' then raise exception using errcode='22023',message='K2_EXPRESS_DESTINATION_INVALID';end if;
   v_status:='pending_quote';v_message:='EXPRESS_QUOTE_REQUIRED';
  else
   select current_version into v_version from k2_private.customer_delivery_rate_heads where policy='jt_current' and active;
   if v_version is null then raise exception using errcode='55000',message='K2_CUSTOMER_TARIFF_NOT_CONFIGURED';end if;
   v_fee:=k2_private.customer_delivery_fee_minor_v1(v_version,v_area,v_total::integer);
   v_status:='customer_confirmed';v_message:='STANDARD_RATE';
  end if;
 end if;
 v_hash:=encode(extensions.digest(convert_to(jsonb_build_object('service',v_service,'items',v_inputs,'destination',v_destination)::text,'UTF8'),'sha256'),'hex');
 return jsonb_build_object('service',v_service,'status',v_status,'feeMinor',v_fee,'currency','PHP','rateVersion',v_version,
  'weightG',v_total,'weightBasis',v_basis,'inputFingerprint',v_hash,'area',v_area,'sourceVersion',v_source,'messageCode',v_message);
end $$;
revoke all on function k2_private.resolve_customer_delivery_quote_v1(jsonb) from public,anon,authenticated,service_role;

create function public.quote_customer_delivery_v1(
 p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_rate record;v_quote jsonb;
begin
 if not k2_private.verify_guest_bff_request('delivery_quote',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature) then
  return jsonb_build_object('ok',false,'error_code','REQUEST_REPLAYED','retry_after_seconds',0);
 end if;
 select * into v_rate from k2_private.consume_guest_rate('delivery_quote','ip',decode(p_ip_hash,'hex'),900,60);
 if not v_rate.allowed then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',v_rate.retry_after_seconds);end if;
 v_quote:=k2_private.resolve_customer_delivery_quote_v1(p_payload_text::jsonb);
 return jsonb_build_object('ok',true,'quote',v_quote);
end $$;
revoke all on function public.quote_customer_delivery_v1(bigint,uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.quote_customer_delivery_v1(bigint,uuid,text,text,text) to anon;
