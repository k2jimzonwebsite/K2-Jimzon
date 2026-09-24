/**
 * Authoritative customer policies for K2 Jimzon.
 * Reconciled with manual launch operating facts:
 * - Direct Italian import verification.
 * - Manual order request model (no upfront charge).
 * - Staff stock confirmation & courier delivery quotation.
 * - Manual GCash/MariBank QR payment instructions after staff review.
 * - Case-by-case inspection & resolution for damaged/incorrect items within 48 hours.
 * - Zero selling or sharing of customer data with advertisers or data brokers.
 */

export const PRIVACY_POLICY = {
  id: 'privacy',
  title: 'Privacy & Data Protection',
  lastUpdated: '24 September 2026',
  summary: 'We use customer contact, delivery, and optional account details to manage requests, orders, and service updates. We never sell or share customer data with advertisers.',
  sections: [
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
  lastUpdated: '15 September 2026',
  summary: 'Placing a request on K2 Jimzon is an order request, not an automated transaction. Stock and delivery fees are confirmed by staff before payment.',
  sections: [
    {
      heading: 'Order Request Model',
      content: 'Submitting an order request on our website, Pasabuy form, or wholesale form does not collect upfront payment or guarantee immediate dispatch. It registers your requested items for review by K2 staff in Manila.',
    },
    {
      heading: 'Stock & Price Verification',
      content: 'All products are authentic Italian imports. While our catalog reflects available inventory, staff manually verifies physical item condition, batch expiry dates, and actual on-hand quantity before issuing a confirmed payment total.',
    },
    {
      heading: 'Payment Instructions',
      content: 'You may choose GCash or MariBank QR transfer for an order request. Do not send payment until K2 staff contacts you with confirmed stock availability, exact courier delivery fees, and verified recipient account details. Submitted payments are manually verified by staff.',
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
