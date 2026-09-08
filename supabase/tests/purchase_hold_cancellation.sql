do $$
declare
  order_id uuid;
  line_id uuid;
  old_batch uuid;
  mode text;
  event_count integer;
begin
  foreach mode in array array['submitted', 'confirmed'] loop
    insert into products (sku, name, srp, stock_available)
      values ('CANCEL-' || mode, 'Cancellation fixture', 100, 3);
    insert into product_batches (sku, quantity, expiry_date)
      values ('CANCEL-' || mode, 3, current_date + 180);
    insert into inventory_balances (sku, location_code, on_hand, reserved)
      values ('CANCEL-' || mode, 'MANILA_MAIN', 3, 0);
    select (submit_order_request_v2('Fixture', 'fixture@example.test', null,
      'Fixture address', 'Courier delivery', null,
      jsonb_build_array(jsonb_build_object('sku', 'CANCEL-' || mode, 'quantity', 2)),
      'cancel-' || mode, null)).id into order_id;
    if mode = 'confirmed' then perform confirm_order_request(order_id, 'Fixture confirmation'); end if;
    -- Historical released allocations must not be deducted again at cancellation.
    select id into line_id from order_request_items where order_request_id = order_id;
    insert into product_batches (sku, quantity, expiry_date)
      values ('CANCEL-' || mode, 0, current_date + 180) returning id into old_batch;
    insert into inventory_reservations(order_request_id, order_request_item_id, batch_id, sku, quantity, status, release_cause)
      values(order_id, line_id, old_batch, 'CANCEL-' || mode, 1, 'released', 'superseded');
    -- A corrupt lot counter must abort the whole cancellation, including the
    -- balance update that precedes it. Never clamp away the discrepancy.
    update product_batches set reserved_quantity = 1 where sku = 'CANCEL-' || mode and quantity = 3;
    begin
      perform cancel_order_request(order_id, 'Mismatch rollback fixture');
      raise exception 'Mismatched lot was silently cancelled';
    exception when raise_exception then
      if sqlerrm not like 'Lot reservation mismatch for %' then raise; end if;
    end;
    if (select reserved from inventory_balances where sku = 'CANCEL-' || mode) <> 2
      or (select status from order_requests where id = order_id) <> mode
      or not exists(select 1 from inventory_reservations where order_request_id = order_id and status = 'active') then
      raise exception 'Failed cancellation left partial mutations for %', mode;
    end if;
    update product_batches set reserved_quantity = 2 where sku = 'CANCEL-' || mode and quantity = 3;
    perform cancel_order_request(order_id, 'Customer requested cancellation');
    if exists(select 1 from inventory_reservations where order_request_id = order_id and status = 'active') then
      raise exception 'Cancelled % order still holds stock', mode;
    end if;
    if (select reserved from inventory_balances where sku = 'CANCEL-' || mode) <> 0
      or (select sum(reserved_quantity) from product_batches where sku = 'CANCEL-' || mode) <> 0
      or (select stock_available from products where sku = 'CANCEL-' || mode) <> 3 then
      raise exception 'Cancellation did not restore exact stock for %', mode;
    end if;
    if not exists(select 1 from inventory_reservations where order_request_id = order_id
      and quantity = 2 and release_cause = 'cancelled' and released_at is not null) then
      raise exception 'Cancellation cause/time missing for %', mode;
    end if;
    if (select sum(quantity) from inventory_events where reference_id = order_id and event_type = 'reservation_released') <> 2 then
      raise exception 'Cancellation audit included historical releases for %', mode;
    end if;
    select count(*) into event_count from inventory_events where reference_id = order_id;
    perform cancel_order_request(order_id, 'Repeated cancellation request');
    if (select count(*) from inventory_events where reference_id = order_id) <> event_count then
      raise exception 'Cancellation replay duplicated stock events';
    end if;
  end loop;
end $$;
