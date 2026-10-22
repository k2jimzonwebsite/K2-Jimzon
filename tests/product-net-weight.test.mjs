import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSync } from 'esbuild'
import { createRequire } from 'node:module'
import { buildProductStructuredData } from '../src/lib/productStructuredData.js'

const { outputFiles } = buildSync({
  stdin: { contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import ProductPassport from './src/components/ProductPassport.jsx'; export const render = product => renderToStaticMarkup(<ProductPassport product={product} stock={10}/>);`, resolveDir: process.cwd(), loader: 'jsx' },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom/server', 'react/jsx-runtime'],
})
const component = { exports: {} }
new Function('require', 'module', 'exports', outputFiles[0].text)(createRequire(import.meta.url), component, component.exports)

test('actual product passport labels canonical grams without losing precision', () => {
  assert.match(component.exports.render({ net_weight: 1000, package_type: 'Bag' }), />1 kg \(Bag\)</)
  assert.match(component.exports.render({ net_weight: 125.25 }), />125\.25 g</)
  assert.match(component.exports.render({ net_weight: '1650' }), />1\.65 kg</)
})

test('unknown or invalid canonical weights never become a customer claim', () => {
  for (const net_weight of [null, undefined, '', ' ', 0, -1, NaN, Infinity, 'unknown', true]) {
    assert.doesNotMatch(component.exports.render({ net_weight }), />Net Weight</)
    assert.equal(buildProductStructuredData({ product: { net_weight } }).weight, undefined)
  }
})

test('structured product weight uses canonical gram units and exact value', () => {
  assert.deepEqual(buildProductStructuredData({ product: { net_weight: 1000 } }).weight,
    { '@type': 'QuantitativeValue', value: 1000, unitCode: 'GRM' })
})


test('recorded volume pack sizes render independently of gram weight', () => {
  for (const size of ['1 L bottle', '750 ml bottle']) {
    const html = component.exports.render({ size, package_type: 'Bottle', net_weight: null })
    assert.match(html, />Pack size</)
    assert.ok(html.includes(size))
    assert.doesNotMatch(html, />Net Weight</)
  }
})

test('multipack size and canonical weight keep their separate meanings', () => {
  const html = component.exports.render({ size: '4 x 70 g cans', net_weight: 280, package_type: 'Tin' })
  assert.match(html, />Pack size</)
  assert.ok(html.includes('4 x 70 g cans'))
  assert.match(html, />280 g \(Tin\)</)
})

test('missing pack size is omitted without guessing from product names', () => {
  for (const size of [null, undefined, '', '   ', 750, true, {}]) {
    assert.doesNotMatch(component.exports.render({ size, name: 'Olive oil 1 L', net_weight: null }), />Pack size</)
  }
})
