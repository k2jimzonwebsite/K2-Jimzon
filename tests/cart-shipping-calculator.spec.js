import { expect, test } from '@playwright/test'
import {
  calculateCartPackedWeightG,
  calculateCartShipping,
  formatWeight,
  getItemPackedWeightG,
  PHILIPPINES_REGIONS,
} from '../src/lib/cartShippingCalculator.js'

test.describe('cartShippingCalculator', () => {
  test('calculates item packed weight correctly from product attributes', () => {
    // 1. Explicit shipping_weight_g
    expect(getItemPackedWeightG({ shipping_weight_g: 1250 })).toBe(1250)

    // 2. Net weight 1000g coffee bag (+80g tare)
    expect(getItemPackedWeightG({ net_weight: '1000g', package_type: 'Foil Valve Bag' })).toBe(1080)

    // 3. Glass jar 600g (+220g tare)
    expect(getItemPackedWeightG({ size: '600 g jar', package_type: 'Glass Jar' })).toBe(820)

    // 4. Missing weight fallback
    expect(getItemPackedWeightG({})).toBe(500)
    expect(getItemPackedWeightG(null)).toBe(500)
  })

  test('calculates cart total packed weight across lines', () => {
    const lines = [
      { product: { shipping_weight_g: 1000 }, qty: 2 },
      { product: { shipping_weight_g: 500 }, qty: 1 },
    ]
    expect(calculateCartPackedWeightG(lines)).toBe(2500)
    expect(calculateCartPackedWeightG([])).toBe(0)
  })

  test('formats weight human-readably', () => {
    expect(formatWeight(450)).toBe('450 g')
    expect(formatWeight(1000)).toBe('1 kg')
    expect(formatWeight(1650)).toBe('1.7 kg')
    expect(formatWeight(2000)).toBe('2 kg')
  })

  test('calculates delivery options for Metro Manila (NCR)', () => {
    const lines = [{ product: { shipping_weight_g: 1200 }, qty: 1 }]
    const result = calculateCartShipping(lines, 'ncr')

    expect(result.totalWeightG).toBe(1200)
    expect(result.formattedWeight).toBe('1.2 kg')
    expect(result.options).toHaveLength(3)

    const standard = result.options.find(o => o.id === 'standard')
    expect(standard).toBeDefined()
    expect(standard.fee).toBe(95) // Base NCR fee 95

    const express = result.options.find(o => o.id === 'express')
    expect(express).toBeDefined()
    expect(express.fee).toBe(150)

    const pickup = result.options.find(o => o.id === 'pickup')
    expect(pickup).toBeDefined()
    expect(pickup.fee).toBe(0)
    expect(pickup.isFree).toBe(true)
  })

  test('calculates overweight fees for packages > 3kg', () => {
    // 5 kg package
    const lines = [{ product: { shipping_weight_g: 5000 }, qty: 1 }]
    const ncrResult = calculateCartShipping(lines, 'ncr')
    const ncrStandard = ncrResult.options.find(o => o.id === 'standard')
    // 95 + 2kg overweight * 30 = 155
    expect(ncrStandard.fee).toBe(155)

    const luzonResult = calculateCartShipping(lines, 'luzon')
    const luzonStandard = luzonResult.options.find(o => o.id === 'standard')
    // 85 + 2kg overweight * 35 = 155
    expect(luzonStandard.fee).toBe(155)
  })

  test('calculates delivery options for Visayas and Mindanao', () => {
    const lines = [{ product: { shipping_weight_g: 1000 }, qty: 1 }]
    const visayasResult = calculateCartShipping(lines, 'visayas')
    expect(visayasResult.options.find(o => o.id === 'standard').fee).toBe(100)

    const mindanaoResult = calculateCartShipping(lines, 'mindanao')
    expect(mindanaoResult.options.find(o => o.id === 'standard').fee).toBe(105)
  })

  test('exports 4 valid Philippine regions', () => {
    expect(PHILIPPINES_REGIONS).toHaveLength(4)
    expect(PHILIPPINES_REGIONS.map(r => r.id)).toEqual(['ncr', 'luzon', 'visayas', 'mindanao'])
  })
})
