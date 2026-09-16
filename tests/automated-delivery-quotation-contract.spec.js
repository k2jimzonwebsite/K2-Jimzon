import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import orderHandler from '../prepared-api/storefront/order.js'

test.describe('Automated delivery quotation contracts', () => {
  test('migration file defines valid preflight, update, and postflight guards', async () => {
    const sql = await readFile('supabase/migrations/20260916_automated_delivery_quotation.sql', 'utf8')
    expect(sql).toContain('submit_guest_order_v1')
    expect(sql).toContain('v_payload->>\'shippingAmount\'')
    expect(sql).toContain('v_shipping_num := (v_payload->>\'shippingAmount\')::numeric;')
    expect(sql).toContain('customer_delivery_confirmed_at = now()')
    expect(sql).toContain('total_amount = subtotal - discount_amount + v_shipping_num')
    expect(sql).toContain('grant execute on function public.submit_guest_order_v1(bigint,uuid,text,text,text,text) to anon')
  })

  test('rollback file safely restores baseline submit_guest_order_v1', async () => {
    const rollbackSql = await readFile('supabase/migrations/20260916_automated_delivery_quotation_rollback.sql', 'utf8')
    expect(rollbackSql).toContain('submit_guest_order_v1')
    expect(rollbackSql).not.toContain('v_payload->>\'shippingAmount\'')
    expect(rollbackSql).toContain('grant execute on function public.submit_guest_order_v1(bigint,uuid,text,text,text,text) to anon')
  })

  test.beforeEach(() => {
    process.env.NODE_ENV = 'production'
    process.env.K2_DEPLOYMENT_TARGET = 'storefront'
    process.env.K2_STOREFRONT_BFF_ENABLED = 'true'
    process.env.K2_STOREFRONT_ORIGINS = 'https://shop.example.test'
    process.env.K2_GUEST_BFF_SECRET = Buffer.alloc(32, 21).toString('base64')
  })

  test('storefront order BFF rejects non-numeric or out-of-range shipping amounts', async () => {
    const mockRes = () => {
      const res = { statusCode: 0, headers: {}, data: null }
      res.setHeader = (k, v) => { res.headers[k] = v }
      res.status = (c) => { res.statusCode = c; return res }
      res.end = (d) => {
        if (d) {
          try { res.data = JSON.parse(d) } catch { res.data = d }
        }
        return res
      }
      return res
    }

    const mockReq = (body) => ({
      method: 'POST',
      headers: {
        host: 'shop.example.test',
        origin: 'https://shop.example.test',
        'content-type': 'application/json',
      },
      socket: { remoteAddress: '127.0.0.1' },
      body,
    })

    // Negative shipping amount
    const resNegative = mockRes()
    await orderHandler(mockReq({
      customerName: 'Juan',
      email: 'juan@example.com',
      address: '123 Rizal St',
      fulfillmentMethod: 'Standard Courier Delivery',
      items: [{ sku: 'test-sku', quantity: 1 }],
      shippingAmount: -10,
    }), resNegative)
    expect(resNegative.statusCode).toBe(400)
    expect(resNegative.data?.error?.code).toBe('SHIPPING_AMOUNT_INVALID')

    // Non-numeric shipping amount
    const resString = mockRes()
    await orderHandler(mockReq({
      customerName: 'Juan',
      email: 'juan@example.com',
      address: '123 Rizal St',
      fulfillmentMethod: 'Standard Courier Delivery',
      items: [{ sku: 'test-sku', quantity: 1 }],
      shippingAmount: 'free',
    }), resString)
    expect(resString.statusCode).toBe(400)
    expect(resString.data?.error?.code).toBe('SHIPPING_AMOUNT_INVALID')
  })
})
