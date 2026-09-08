do $$
declare caught_constraint text;
begin
  if not exists(select 1 from inventory_reservations
    where id = '70000000-0000-4000-8000-000000000004' and status = 'released'
      and release_cause is null and released_at is null) then
    raise exception 'Migration fabricated historical release attribution';
  end if;
  begin
    update inventory_reservations set updated_at = now()
    where id = '70000000-0000-4000-8000-000000000004';
    raise exception 'Unattributed legacy update was allowed';
  exception when check_violation then
    get stacked diagnostics caught_constraint = CONSTRAINT_NAME;
    if caught_constraint <> 'inventory_reservations_released_has_cause_check' then raise; end if;
  end;
  begin
    insert into inventory_reservations(order_request_id, order_request_item_id, batch_id, sku, quantity, status)
    values ('70000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000003',
      '70000000-0000-4000-8000-000000000001', 'HISTORIC-RELEASE', 1, 'released');
    raise exception 'New unattributed release was allowed';
  exception when check_violation then
    get stacked diagnostics caught_constraint = CONSTRAINT_NAME;
    if caught_constraint <> 'inventory_reservations_released_has_cause_check' then raise; end if;
  end;
  if (select reserved from inventory_balances where sku = 'HISTORIC-RELEASE') <> 0
    or (select stock_available from products where sku = 'HISTORIC-RELEASE') <> 1 then
    raise exception 'Historical migration changed stock';
  end if;
end $$;
