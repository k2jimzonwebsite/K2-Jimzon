/**
 * Authoritative customer policies for K2 Jimzon.
 * Reconciled with manual launch operating facts:
 * - Direct Italian import verification.
 * - Order requests with QR payment before dispatch.
 * - Staff stock confirmation & courier delivery quotation.
 * - Manual GCash/MariBank QR transfers and independent funds verification.
 * - Case-by-case inspection & resolution for damaged/incorrect items within 48 hours.
 * - Zero selling or sharing of customer data with advertisers or data brokers.
 */

export const PRIVACY_POLICY = {
  id: 'privacy',
  title: 'Privacy & Data Protection',
  lastUpdated: '26 October 2026',
  summary: 'We use customer contact, delivery, and optional account details to manage requests, orders, and service updates. We never sell or share customer data with advertisers.',
  sections: [
    {
      heading: 'Optional Website Analytics',
      link: { href: 'https://policies.google.com/technologies/partner-sites', label: 'How Google uses information from sites and apps' },
      content: 'Google Analytics loads only after you choose Accept analytics. It measures public page visits using cookies and technical browser information. We exclude search terms, URL parameters, form contents, and private account, checkout, messages and confirmation pages. We do not enable advertising features or send customer contact or delivery details to Google Analytics. Declining keeps analytics off and does not affect shopping. You can change your choice using Analytics choices in the footer; withdrawal stops measurement and removes Analytics cookies. We remember your choice for up to 180 days and honor browser Do Not Track and Global Privacy Control signals. Google explains its processing at https://policies.google.com/technologies/partner-sites.',
    },
    {
      heading: 'Information We Collect',
      content: 'When you submit an order request, Pasabuy sourcing request, wholesale inquiry, or customer service message, we collect your name, email address, Philippine mobile number, delivery address, and any optional delivery notes you provide. If you create a verified customer account, we also store the name, delivery address, and in-app notification preference you save, plus private references to service updates and whether you have read them. Anonymous session state may be retained locally in your browser to remember your shopping cart.',
    },
    {
      heading: 'How Your Information Is Used',
      content: 'Your information is used to check physical inventory in Manila, calculate delivery rates, contact you about stock, payment and order status, and label parcels for dispatch. Saved account details can fill empty checkout fields. In-app updates show verified account holders references to staff replies, order or Pasabuy status changes, and confirmed payment; they do not replace staff payment verification.',
    },
    {
      heading: 'Zero Third-Party Data Selling or Advertising',
      content: 'We do not sell, rent, monetize, or trade your personal contact or delivery data to external advertising networks, brokers, or marketing platforms. Your information is accessed only by authorized K2 staff members conducting store operations.',
    },
    {
      heading: 'Courier & Fulfillment Handover',
      content: 'Once you approve an order quote and payment is verified, your delivery name, address, and mobile number are shared solely with the courier company (such as J&T Express or dedicated Manila riders) selected to deliver your physical parcel.',
    },
    {
      heading: 'Data Security & Inquiries',
      content: 'All communication with our services uses encrypted HTTPS. You may inquire about your saved request history, update contact details, or request deletion of outdated order records by contacting staff directly at k2jimzonwebsite@gmail.com.',
    },
  ],
}

export const TERMS_POLICY = {
  id: 'terms',
  title: 'Terms of Service & Order Requests',
  lastUpdated: '24 October 2026',
  summary: 'GCash and MariBank orders are paid before dispatch. Checkout records an order request; payment is a separate QR transfer and remains subject to staff verification.',
  sections: [
    {
      heading: 'Order Request Model',
      content: 'Website checkout records your order and selected payment method. Follow the order payment details when its final total is available. Pasabuy and wholesale forms request a quote; follow the payment terms agreed for the accepted quote. Submitting a form does not guarantee immediate dispatch.',
    },
    {
      heading: 'Stock & Price Verification',
      content: 'All products are authentic Italian imports. The catalog shows eligible products and recorded availability. Staff review item condition, batch dates and order details. Transfer only the final order total, including any pending delivery quote; contact staff if the amount or availability needs clarification.',
    },
    {
      heading: 'Payment Instructions',
      content: 'Choose GCash or MariBank and use the matching receiving details shown for your order when available. Check the final total and recipient before transferring, then upload your receipt and payment reference. Payment is required before dispatch for QR orders. Staff verify funds in the receiving account; uploading a receipt alone does not confirm payment.',
    },
    {
      heading: 'Courier Delivery & Timelines',
      content: 'Delivery fees vary by locality and parcel weight. Courier options (Metro Manila direct or regional courier) and estimated delivery timelines are provided during staff quotation. We do not promise instant, overnight, or fixed transit windows without courier confirmation.',
    },
    {
      heading: 'Pasabuy Sourcing Terms',
      content: 'Pasabuy items are sourced directly from stores, pharmacies, or suppliers in Italy upon customer request. Estimated arrival times depend on air or sea cargo schedules and customs processing. Staff will provide an all-inclusive quote before purchasing abroad.',
    },
  ],
}

export const RETURNS_POLICY = {
  id: 'returns',
  title: 'Returns, Replacements & Item Care',
  lastUpdated: '15 September 2026',
  summary: 'Every Italian import is inspected before dispatch. If an item arrives damaged or incorrect, contact staff within 48 hours for case-by-case resolution.',
  sections: [
    {
      heading: 'Direct Import Quality & Inspection',
      content: 'Every product is sourced authentically in Italy and inspected upon receipt in Manila before climate-controlled storage. Parcels are carefully packed with protective cushioning prior to courier handover.',
    },
    {
      heading: 'Inspection Upon Courier Delivery',
      content: 'Customers are advised to inspect their package immediately upon courier handover. Please record an unboxing video or take clear photographs of the package, shipping label, and contents upon arrival.',
    },
    {
      heading: 'Reporting Transit Damage or Discrepancies',
      content: 'If an item arrives damaged, leaking, broken, or differs from your confirmed order, notify K2 staff via our Contact page or Guest Messages within 48 hours of delivery. Please include your order reference number and clear photos of the issue.',
    },
    {
      heading: 'Case-by-Case Resolution',
      content: 'Because groceries, specialty foods, and personal care products cannot be resold once opened or delivered, we do not operate an automated self-service return or refund portal. Approved claims are resolved manually by K2 staff via item replacement, credit, or adjusted settlement.',
    },
  ],
}

export const ALL_POLICIES = [PRIVACY_POLICY, TERMS_POLICY, RETURNS_POLICY]

export function getPolicyById(id) {
  const cleanId = String(id || '').trim().toLowerCase()
  return ALL_POLICIES.find(p => p.id === cleanId) || PRIVACY_POLICY
}
