-- A historical row has no release_cause column yet. Its stock is already free.
insert into products (sku, name, srp, stock_available) values ('HISTORIC-RELEASE', 'Historical fixture', 100, 1);
insert into product_batches (id, sku, quantity, reserved_quantity, expiry_date)
values ('70000000-0000-4000-8000-000000000001', 'HISTORIC-RELEASE', 1, 0, current_date + 180);
insert into inventory_balances (sku, location_code, on_hand, reserved)
values ('HISTORIC-RELEASE', 'MANILA_MAIN', 1, 0);
insert into order_requests (id, status, idempotency_key)
values ('70000000-0000-4000-8000-000000000002', 'cancelled', 'historic-release');
insert into order_request_items (id, order_request_id, sku, quantity, line_total)
values ('70000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000002', 'HISTORIC-RELEASE', 1, 100);
insert into inventory_reservations (id, order_request_id, order_request_item_id, batch_id, sku, quantity, status)
values ('70000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000001', 'HISTORIC-RELEASE', 1, 'released');
