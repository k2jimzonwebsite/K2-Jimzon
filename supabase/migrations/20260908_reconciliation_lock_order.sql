-- MAP-023 / I-001 H-020. Prepared only; preserve physical-count and audit rules.
begin;
do $patch$
declare v_definition text; v_old text; v_new text;
begin
  select pg_get_functiondef('public.reconcile_product_batches(text,jsonb,text)'::regprocedure)
    into v_definition;
  if position('K2_RECONCILIATION_BALANCE_FIRST_V1' in v_definition)>0 then return; end if;
  v_old := $old$  perform 1 from public.products where sku = p_sku for update;
  if not found then raise exception 'Product not found'; end if;$old$;
  v_new := $new$  -- K2_RECONCILIATION_BALANCE_FIRST_V1
  -- Conflict checks also lock: take the balance before product/FK or lot locks.
  insert into public.inventory_balances(sku,location_code,on_hand,reserved)
  select p.sku,'MANILA_MAIN',coalesce(sum(b.quantity),0)::integer,
    coalesce(sum(b.reserved_quantity),0)::integer
  from public.products p left join public.product_batches b on b.sku=p.sku
  where p.sku=p_sku group by p.sku
  on conflict(sku,location_code) do nothing;
  perform 1 from public.inventory_balances where sku=p_sku and location_code='MANILA_MAIN' for update;
  perform 1 from public.product_batches where sku=p_sku order by id for update;
  perform 1 from public.products where sku = p_sku for update;
  if not found then raise exception 'Product not found'; end if;$new$;
  if position(v_old in v_definition)=0 then
    raise exception 'Reconciliation function changed; review balance-first patch';
  end if;
  execute replace(v_definition,v_old,v_new);
end;
$patch$;
notify pgrst,'reload schema';
commit;
