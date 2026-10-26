// Public marketing routes only. Keep these claims aligned with the visible page.
export const STOREFRONT_SEO_PAGES = {
  home: {
    path: '/',
    title: 'K2 Jimzon — Italian imports, direct to the Philippines',
    description: 'Italian products sourced in Italy and fulfilled in Manila. Pay by GCash or MariBank QR before dispatch.',
  },
  catalog: {
    path: '/catalog',
    title: 'Italian Imported Goods in Manila | K2 Jimzon',
    description: 'Italian groceries, coffee and pantry goods in Manila. GCash and MariBank QR payment before dispatch.',
  },
  pasabuy: {
    path: '/pasabuy',
    preloadImage: '/ambient/pasabuy.jpg',
    title: 'Pasabuy from Italy to the Philippines | K2 Jimzon',
    description: 'Pasabuy from Italy to the Philippines. Request Italian goods and review an itemized product and shipping quote from K2 Jimzon before we buy.',
  },
  wholesale: {
    path: '/trade',
    title: 'Italian Grocery Wholesale | K2 Jimzon',
    description: 'Italian grocery wholesale in Manila. Ask K2 Jimzon for stock and a quote.',
  },
  contact: {
    path: '/contact', sitemap: false,
    title: 'Contact K2 Jimzon | Italian Imports & Pasabuy',
    description: 'Contact K2 Jimzon about Italian products, Pasabuy from Italy to the Philippines, wholesale supply or an existing request.',
  },
  privacy: {
    path: '/privacy', sitemap: false,
    title: 'Privacy & Data | K2 Jimzon',
    description: 'How K2 Jimzon handles customer details, order conversations and optional consent-first website analytics.',
  },
  terms: {
    path: '/terms', sitemap: false,
    title: 'Terms of Service | K2 Jimzon',
    description: 'Read the terms for K2 Jimzon product orders, staff confirmation, payments, delivery and quoted Pasabuy requests.',
  },
  returns: {
    path: '/returns', sitemap: false,
    title: 'Returns & Replacements | K2 Jimzon',
    description: 'Contact K2 Jimzon about damaged or incorrect items and read the inspection, return and replacement policy.',
  },
  policies: {
    path: '/policies', canonicalPath: '/privacy', sitemap: false,
    title: 'Privacy & Data | K2 Jimzon',
    description: 'How K2 Jimzon handles customer details, order conversations and optional consent-first website analytics.',
  },
  store: {
    path: '/store', canonicalPath: '/catalog', sitemap: false,
    title: 'Interactive Italian Store | K2 Jimzon',
    description: 'Explore K2 Jimzon Italian products in the interactive store. Browse the same reviewed catalog and request staff-confirmed stock.',
  },
}
