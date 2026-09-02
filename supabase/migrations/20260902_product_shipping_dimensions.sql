-- MAP-023 — real shipping dimensions on products.
--
-- products.net_weight is display text ('1000g', '600g'). It is a label, not a
-- measurement: it describes the contents, not the packed parcel, and it cannot be
-- used for rate arithmetic. It stays exactly as it is, for the product page.
--
-- These columns are the measured packed parcel. They are nullable on purpose: a
-- missing weight is unknown, and an order containing any unweighed SKU falls back
-- to the quoted-after-review path rather than being priced from a guess. Filling
-- them in is warehouse work, and the customer estimate activates per order as it
-- gets done.

begin;

alter table public.products
  add column if not exists shipping_weight_g integer,
  add column if not exists shipping_length_mm integer,
  add column if not exists shipping_width_mm integer,
  add column if not exists shipping_height_mm integer,
  add column if not exists shipping_profile text;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_shipping_weight_range_check'
  ) then
    alter table public.products add constraint products_shipping_weight_range_check
      check (shipping_weight_g is null or (shipping_weight_g > 0 and shipping_weight_g <= 100000));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'products_shipping_dimensions_range_check'
  ) then
    alter table public.products add constraint products_shipping_dimensions_range_check
      check (
        (shipping_length_mm is null or (shipping_length_mm > 0 and shipping_length_mm <= 5000))
        and (shipping_width_mm is null or (shipping_width_mm > 0 and shipping_width_mm <= 5000))
        and (shipping_height_mm is null or (shipping_height_mm > 0 and shipping_height_mm <= 5000))
      );
  end if;
  -- Dimensions are all-or-nothing: a partial box cannot produce a volumetric
  -- weight, and a partial one would silently under-state a light-bulky parcel.
  if not exists (
    select 1 from pg_constraint where conname = 'products_shipping_dimensions_complete_check'
  ) then
    alter table public.products add constraint products_shipping_dimensions_complete_check
      check (
        num_nulls(shipping_length_mm, shipping_width_mm, shipping_height_mm) in (0, 3)
      );
  end if;
end
$constraints$;

comment on column public.products.shipping_weight_g is
  'Measured packed parcel weight in grams. Null means unweighed: the order is quoted manually rather than priced from net_weight, which is display text.';

commit;
