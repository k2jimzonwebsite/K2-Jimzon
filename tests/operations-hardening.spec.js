import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('hardening migration preserves history and repairs the order product boundary', async () => {
  const sql = await read('../supabase/migrations/20260809_operations_hardening.sql')

  expect(sql).toContain('references public.products(sku) on delete restrict')
  expect(sql).toContain('create or replace function public.reconcile_product_batches')
  expect(sql).not.toContain('delete from public.product_batches')
  expect(sql).toContain('Existing lots cannot be removed')
})

test('packing is order-first and records one immutable event per unit', async () => {
  const sql = await read('../supabase/migrations/20260809_operations_hardening.sql')
  const hub = await read('../src/views/admin/OmniOperationsHub.jsx')

  expect(sql).toContain('create or replace function public.record_packing_scan')
  expect(sql).toContain('insert into public.packing_scan_events')
  expect(sql).toContain('p_order_request_id uuid')
  expect(hub).toContain("rpc('record_packing_scan'")
  expect(hub).toContain('Choose exact order')
  expect(hub).not.toContain("rpc('mark_order_line_packed'")
})

test('consignment scanning distinguishes flight, box, lot, and manifest line', async () => {
  const sql = await read('../supabase/migrations/20260809_operations_hardening.sql')
  const manager = await read('../src/views/admin/ConsignmentManager.jsx')

  expect(sql).toContain('consignment_items_manifest_lot_box_uniq')
  expect(sql).toContain('public.record_consignment_item_scan')
  expect(manager).toContain("rpc('add_consignment_item_v2'")
  expect(manager).toContain("rpc('record_consignment_item_scan'")
  expect(manager).toContain('p_consignment_item_id')
})

test('storefront coupon and delivery totals are server-backed and never browser-authored', async () => {
  const store = await read('../src/context/StoreContext.jsx')
  const checkout = await read('../src/views/Checkout.jsx')
  // The customer-facing delivery line moved out of Checkout.jsx and into
  // DeliveryEstimate.jsx when the courier quotation pilot was extracted. This
  // assertion kept reading Checkout.jsx, so it failed on a refactor that had
  // preserved the property it exists to protect. It now follows the component
  // that owns the line, and additionally pins where the fee comes from — the
  // part that actually matters — rather than trusting one copy string.
  const deliveryEstimate = await read('../src/components/DeliveryEstimate.jsx')

  expect(store).not.toContain("localStorage.getItem('k2_coupons')")
  expect(store).not.toContain("localStorage.setItem('k2_coupons'")
  expect(store).toContain("rpc('validate_coupon'")
  expect(store).toContain("rpc('submit_order_request_v2'")
  expect(deliveryEstimate).toContain('Quoted after review')
  // The only priced path is a server quote the server marked customer-visible.
  expect(deliveryEstimate).toContain('quoteGuestDelivery')
  expect(deliveryEstimate).toContain('result.quote?.customerVisible')
  expect(checkout).not.toContain('const SHIPPING =')
  expect(deliveryEstimate).not.toContain('const SHIPPING =')
})

test('Shopee intake durably queues incomplete pushes and never creates placeholder orders', async () => {
  const connector = await read('../supabase/functions/shopee-webhook/index.ts')
  const ingress = await read('../supabase/migrations/20260825_shopee_webhook_ingress_boundary.sql')

  expect(connector).toContain("rpc('capture_shopee_event_v1'")
  expect(ingress).toContain('insert into public.channel_event_inbox')
  expect(connector).not.toContain("from('orders')")
  expect(connector).toContain('status: 503')
  expect(connector).toContain('status: 202')
})
