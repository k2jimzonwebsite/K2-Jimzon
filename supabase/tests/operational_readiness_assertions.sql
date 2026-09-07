-- Exercise actual extracted SQL, not copies of the business functions.
do $$
declare
  manifest public.consignments;
  other_manifest public.consignments;
  normal public.consignment_items;
  short_dated public.consignment_items;
  order_id uuid := '10000000-0000-4000-8000-000000000001';
  event_count integer;
begin
  manifest := public.create_consignment_manifest('AUDIT-FLIGHT', 'Synthetic shipment');
  other_manifest := public.create_consignment_manifest('AUDIT-OTHER', 'Synthetic shipment');
  normal := public.add_consignment_item_v2(manifest.id, 'SKU-LAST-1', 'LOT-A', 'BOX-A', current_date+180, 2);
  short_dated := public.add_consignment_item_v2(manifest.id, 'SKU-LAST-1', 'LOT-B', 'BOX-B', current_date+45, 1);
  perform k2_test.assert_true(normal.italy_packed_qty=0 and normal.manila_scanned_qty=0,
    'manifest declaration copied quantities into scans');
  perform k2_test.assert_true((select count(*)=1 from public.product_batches),
    'manifest declaration created on-hand stock');
  perform k2_test.refuses(format('select public.advance_consignment(%L,%L)', manifest.id, 'In_Transit'),
    'Every expected unit must be scan-packed before transit');
  perform k2_test.refuses(format('select public.record_consignment_item_scan(%L,%L,%L)',
    other_manifest.id, normal.id, 'milan'), 'Manifest line not found');
  perform k2_test.refuses(format('select public.record_consignment_item_scan(%L,%L,%L)',
    manifest.id, normal.id, 'manila'), 'Consignment is not ready for Manila receiving');
  perform public.record_consignment_item_scan(manifest.id, normal.id, 'milan');
  normal := public.record_consignment_item_scan(manifest.id, normal.id, 'milan');
  perform k2_test.assert_true(normal.italy_packed_qty=2 and normal.manila_scanned_qty=0,
    'Milan scans populated Manila counts');
  perform k2_test.refuses(format('select public.record_consignment_item_scan(%L,%L,%L)',
    manifest.id, normal.id, 'milan'), 'Packed scans cannot exceed expected quantity');
  perform public.record_consignment_item_scan(manifest.id, short_dated.id, 'milan');
  perform public.advance_consignment(manifest.id, 'In_Transit');
  perform public.advance_consignment(manifest.id, 'Arrived_Manila');
  perform public.record_consignment_item_scan(manifest.id, normal.id, 'manila');
  perform public.record_consignment_item_scan(manifest.id, short_dated.id, 'manila');
  perform k2_test.refuses(format('select public.record_consignment_item_scan(%L,%L,%L)',
    manifest.id, short_dated.id, 'manila'), 'Received scans cannot exceed Milan packed quantity');
  perform public.finalize_consignment_receipt(manifest.id, 'One LOT-A unit missing on arrival.');
  perform k2_test.assert_true((select count(*)=2 and sum(quantity)=2
    from public.product_batches where source_consignment_item_id in (normal.id,short_dated.id)),
    'receipt did not create exactly the counted units');
  perform k2_test.assert_true((select box_code='BOX-A' and inventory_status='available'
    from public.product_batches where source_consignment_item_id=normal.id), 'normal lot lost physical identity');
  perform k2_test.assert_true((select box_code='BOX-B' and inventory_status='quarantine'
    from public.product_batches where source_consignment_item_id=short_dated.id), 'short-dated receipt is not quarantined');
  perform k2_test.assert_true((select stock_available=2 from public.products where sku='SKU-LAST-1'),
    'sellable stock includes short-dated receipt (one preexisting + one received eligible unit expected)');
  perform k2_test.assert_true((select on_hand=3 from public.inventory_balances where sku='SKU-LAST-1'),
    'physical balance lost quarantined units');
  perform k2_test.assert_true((select count(*)=1 and min(quantity)=1 and bool_and(actor_id=auth.uid())
    and bool_and(created_at is not null) and bool_and(reason='One LOT-A unit missing on arrival.')
    from public.inventory_events where metadata->>'result'='missing_on_arrival'), 'shortage evidence missing');
  select count(*) into event_count from public.inventory_events;
  perform public.finalize_consignment_receipt(manifest.id, 'Retry after lost response.');
  perform k2_test.assert_true((select count(*)=event_count from public.inventory_events)
    and (select count(*)=3 from public.product_batches), 'finalization retry duplicated effects');

  update public.order_requests set payment_status='not_requested' where id=order_id;
  perform k2_test.refuses(format('select public.set_order_request_payment_status(%L,%L,%L)',
    order_id,'verified','Premature verification'), 'Invalid payment-status transition');
  perform public.set_order_request_payment_status(order_id,'awaiting_instructions','Awaiting manual instructions');
  perform k2_test.refuses(format('select public.set_order_request_payment_status(%L,%L,%L)',
    order_id,'evidence_submitted',''), 'An evidence or reconciliation note is required');
  perform public.set_order_request_payment_status(order_id,'evidence_submitted','Synthetic reference received');
  perform public.set_order_request_payment_status(order_id,'verified','Synthetic merchant receipt matched');
  perform k2_test.assert_true((select count(*)=3 and bool_and(actor_id=auth.uid())
    and bool_and(created_at is not null) from public.order_request_events
    where order_request_id=order_id and metadata->>'event'='payment_status_changed'),
    'payment events did not preserve actor, timestamp and transition metadata');
  perform public.set_order_request_payment_status(order_id,'verified','Retry after lost response');
  perform k2_test.assert_true((select count(*)=3 from public.order_request_events
    where order_request_id=order_id), 'same-state payment retry duplicated events');
  perform public.set_order_request_payment_status(order_id,'refunded','Synthetic refund reconciliation');
  perform k2_test.assert_true((select payment_status='refunded' from public.order_requests where id=order_id),
    'manual refund state did not persist');
end $$;
select 'OPERATIONAL_RECEIVING_PAYMENT_ASSERTIONS_OK';
