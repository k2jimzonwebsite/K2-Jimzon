# J&T VIP Dashboard Safe Automation Investigation

**Investigation date:** 2026-09-01 (Asia/Manila)  
**Investigated surfaces:** [J&T VIP Philippines](https://vip.jtexpress.ph/), [J&T Philippines login](https://www.jtexpress.ph/login), and the J&T mobile store surface at [mvip.jtexpress.ph](https://mvip.jtexpress.ph/)  
**Scope:** Authorized, strictly read-only investigation of K2 Jimzon's own merchant account. No shipment, order, waybill, pickup, store connection, user change, payment, complaint, claim, or other provider-side state was created or modified.  
**K2 scope:** Analysis only. No K2 checkout, database, provider integration, configuration, or application code was changed.  
**Related existing idea:** `IDEA-20260901-01`  
**Related active dependency:** `G-013` in `MASTER_ACTION_PLAN.md`  

## Evidence and limitations

The investigation used a visible, non-persistent Chrome session with Playwright network listeners and targeted inspection of the JavaScript already delivered to the browser. Only navigation and other non-mutating reads were performed. The downloaded bulk template was inspected because downloading it does not create provider state.

No password, cookie, session identifier, authorization value, CSRF value, request-signature value, customer address, phone number, account balance, merchant name, waybill number, or other account/customer secret is retained in this report. Request and response examples below are structural examples, not captured account records.

Important evidence limits:

- The investigated account had no visible rows in the order, waybill, tracking, billing, claim, or complaint lists. Existing shipment detail and tracking-event schemas therefore could not be safely opened and remain unverified.
- The **Create Store Link** control was not exposed to this account. Its behavior was determined from the public frontend code and the public mobile-store frontend, without binding a name or creating an order.
- No rate-limit or load test was performed. The observations only cover low-volume normal navigation.
- Static frontend code reveals UI intent, not a stable or supported API contract.
- Required-field conclusions combine visible form controls, the downloaded template, and client-side validation. J&T may enforce additional server-side rules after final submission, which was deliberately not tested.

## 1. Executive summary

The safest useful no-API workflow is viable: K2 can prepare and validate shipment data, generate a J&T-compatible bulk workbook, and give staff a review screen. A staff member then signs in to J&T, uploads or enters the prepared data, checks J&T's own validation and fee, and personally performs the final submit/waybill/pickup actions. The resulting waybill number and later billed cost can then be recorded or imported back into K2.

The VIP dashboard does **not** expose a supported custom-store connector, API credentials, webhooks, or a generic integration facility. Two commerce-adjacent features were found:

1. **Shopify Pre Order**, a dedicated Shopify flow with manual synchronization and shipping controls.
2. **Create Store Link**, a conditional feature that creates a J&T-hosted mobile product catalog/order link. It is not a connector for K2, and using it as checkout would create a second source of product, customer, and order truth.

The account's order form offered two service labels, **J&T Super** and **EZ**. The site also supports saved sender/recipient addresses, rate inquiry, single-order staging, bulk spreadsheet import, order/waybill lists, print controls, tracking lookup, billing exports, and after-sales tools. Most reads use an authenticated, undocumented J&T VIP backend. Requests carry session authentication and per-request timestamp/signature material even though the client does not use credentialed cross-origin cookies. These private endpoints are unsuitable for direct K2 production use.

The practical conclusion is:

- Fully automate data preparation, validation, parcel calculations, and file generation inside K2.
- Allow human-supervised upload or form assistance only as an optional staff convenience.
- Keep shipment creation, waybill creation, pickup booking, cancellation, store binding, Shopify synchronization, and payments as explicit human J&T actions.
- Do not make checkout, fulfillment, tracking, or billing depend on J&T's undocumented VIP website endpoints.

## 2. Dashboard capability map

| Section | Purpose and visible capabilities | Read-only data / files | State-changing controls observed but not used | Safe automation value |
|---|---|---|---|---|
| Home | Account landing page, notices, summary cards, and navigation | Account-level summaries and message count | None used | Low; useful only to confirm staff reached the dashboard |
| My Order: Create Waybill | Prepare one order, calculate fee, stage an order locally on the page, or submit immediately | Saved sender addresses, location hierarchy, service choices, limits, calculated fee | **Order Immediately** and final staged-order submission | High for field mapping and supervised preparation; final submission remains human |
| My Order: Create Waybills In Bulk | Select sender/pickup defaults, download/import a template, validate/stage rows, clear/delete staged rows, and batch export | Public `.xls` template and client-side validation rules | Bulk upload/staging can lead to final batch submission; final submit was not used | Highest-value no-API handoff because K2 can generate the file |
| My Order: Order Tracking | Search/filter submitted orders and export/customize columns | Order identifiers, waybill number, status, receiver, service, COD, dates | None used | Medium for staff lookup; no records were available to validate details |
| My Order: Order Management | Search orders, preview/print waybills, open tracking, cancel, export, customize columns | Order/waybill list and print-template choices | Cancel, printing/finalization, and any order operation | Medium; useful after a human creates a shipment |
| My Order: Dimension Computation | Calculate volumetric weight | Client-side result only | None | High; formula can be reproduced locally, subject to J&T confirmation |
| My Order: Shopify Pre Order | Pull Shopify orders, review status buckets, and ship/synchronize orders | Paginated Shopify preorder list and status counts | Synchronize Shopify orders and Shipping | Shopify-specific only; not a K2 connector |
| My Waybill | Search/export waybills and customize columns | Status, waybill number, signing data, receiver, settlement weight, receivable freight, total shipping cost, COD, and RTS reason columns | No mutation used | High for later reconciliation if data is manually exported |
| Service Management: Express Tracking | Look up up to ten owned waybill numbers | Tracking results after a lookup | None observed before input | Medium as a staff tool; event schema could not be verified |
| Service Management: Shipping Fee Inquiry | Query an account-specific fee using route and parcel inputs | Saved locations, services, limits, calculated fee | None; the query is read-only | Useful for staff confirmation, not as an application dependency |
| Service Management: Service area query | Check province/city/barangay coverage | J&T location hierarchy and query results | None | Useful as a manual exception check |
| Service Management: Guidelines | Help/FAQ for orders, rates, bulk upload, insurance, and billable weight | Static guidance | **Send Complaint** was not used | Medium for staff training |
| Service Management: Problematic Shipment | Search/export exception shipments | Last scan, pending days, receiver and address columns | None used | Useful for exception reconciliation after shipment creation |
| Service Management: Export Records | Review asynchronous export jobs and download valid results | File name, record count, progress, status, and validity period | Download only when an authorized export exists | Medium for controlled human export/import |
| Bill Management: My Bill | Search/export freight and settlement statements | Freight, COD categories, deductions, adjustments, discount, payment amount, and status columns | None used | High for human-exported cost reconciliation |
| Bill Management: Transaction Inquiry | Review wallet/account movements | Before/after amounts, operation type, bank and audit metadata | None used | Low for shipping automation; sensitive finance surface |
| Bill Management: Feedback | Search billing issues and submit feedback | Problem types and feedback history | Submit feedback | Low; leave entirely human |
| Bill Management: Account Management | View enabled account/balance rows | Customer/branch/region/settlement/balance metadata | Refresh/top-up/payment-related controls | No automation value for K2 fulfillment; leave human |
| After-sales Management | Complaints, online claims, claim reports, and stop/return requests | Status/count/list data for owned shipments | Complaint, claim, stop, return, and related submissions | Read-only monitoring may help staff; all mutations remain human |
| Personal Settings | Pickup addresses, recipient addresses, and invoices | Saved address/invoice lists | New, edit, delete, and default-setting controls | Read-only source for staff; K2 must not modify provider settings |
| User Management | Search users and view roles/status/contact columns | User list and enable status | New user, permission or status changes | None for shipping workflow; RED boundary |
| Create Store Link | Conditionally binds a permanent shop name and exposes a J&T-hosted mobile catalog link/QR | Public product catalog after configuration | Name binding, product configuration, and customer order submission | Not a K2 integration; creates parallel commerce truth |

### Navigation structure observed

The primary navigation contained **Home**, **My Order**, **My Waybill**, **Service Management**, **Bill Management**, **After-sales Management**, **Personal Settings**, and **User Management**. **Create Store Link** is not a normal always-visible page: frontend logic conditionally displays either **Create Store Link** or **Exclusive Store Link** based on feature entitlement, administrator status, and whether a shop name already exists.

## 3. Create Store Link findings

### What it actually is

Create Store Link is a J&T-hosted, mobile product-catalog and preorder feature. It is **not** a generic ecommerce connector. When enabled for an eligible administrator:

1. The user enters a shop name, limited by the UI to 30 characters.
2. The frontend checks the name through an authenticated `bindShopName` operation in check-only mode.
3. A confirmation warns that the generated shop name is currently not modifiable.
4. Confirming performs the actual binding.
5. The dashboard then exposes an **Exclusive Store Link** and QR code with this pattern:

   ```text
   https://mvip.jtexpress.ph/#/?shopName=<URL-encoded shop name>
   ```

Binding was not attempted because it is a persistent merchant-setting mutation. The control was not available in the investigated account, so J&T must confirm entitlement before the feature can be considered at all.

The public link presents merchant-configured products with product detail, variants, quantity, and **Buy Now**. The customer form collects receiver and area data and its final submit creates a J&T preorder/order record. It does not appear to create an immediate waybill. The later order-detail surface can display a shipping/waybill number after merchant fulfillment.

### Platform and integration matrix

| Capability | Finding |
|---|---|
| Shopify | **Yes, separately.** The dashboard has a Shopify Pre Order page and Shopify bind/callback code. It is not part of Create Store Link. Connection was not attempted. |
| WooCommerce | No option, connector, or code path was observed in the investigated surfaces. |
| Shopee | No connector was observed in this VIP flow. |
| Lazada | No connector was observed in this VIP flow. |
| TikTok Shop | No connector was observed in this VIP flow. |
| Custom ecommerce store | No generic custom-store connection option was observed. Create Store Link hosts a separate J&T storefront instead. |
| API credentials | None exposed. |
| Webhooks | None exposed. |
| Generic order synchronization | None exposed. Shopify has dedicated manual pull/sync controls only. |
| Waybill/tracking synchronization to K2 | None exposed. |
| Merchant connector documentation | No custom connector or API documentation was revealed by this page. |

### Public mobile-store data structure

The public buyer form uses province, city, and barangay names plus internal area IDs. Its order payload conceptually contains:

```json
{
  "receiverName": "CUSTOMER_NAME",
  "receiverMobile": "CUSTOMER_PHONE",
  "receiverAddress": "STREET_ADDRESS",
  "receiverEmail": "OPTIONAL_EMAIL",
  "buyerRemarks": "OPTIONAL_REMARKS",
  "shopName": "MERCHANT_SHOP_NAME",
  "receiverProvinceName": "PROVINCE",
  "receiverProvinceId": "INTERNAL_ID",
  "receiverCityName": "CITY",
  "receiverCityId": "INTERNAL_ID",
  "receiverAreaName": "BARANGAY",
  "receiverAreaId": "INTERNAL_ID",
  "productList": [
    {
      "productId": "INTERNAL_PRODUCT_ID",
      "productCode": "INTERNAL_VARIANT_CODE",
      "number": 1
    }
  ]
}
```

This is a structural illustration only. No real merchant, customer, product, or area identifiers are shown.

The public catalog uses client-generated integrity headers implemented in the public frontend. Their values and algorithm are intentionally not reproduced here. Public visibility does not make this a supported K2 API.

### K2 conclusion

K2 should not use Create Store Link as its checkout or fulfillment bridge. Doing so would split canonical product, order, customer, payment, inventory, and reporting truth between K2 and a second J&T storefront. At most, the owner could deliberately operate it as a separate manual sales channel with explicit reconciliation, but that does not advance K2's desired canonical architecture.

## 4. Order creation workflow

### Single-order flow

The normal page is a combined preparation and staging interface:

1. Select a saved sender/pickup address.
2. Select a preferred pickup date.
3. Enter or parse receiver data.
4. Select J&T province, city, and barangay values.
5. Enter parcel, value, COD, pouch, service, and remarks data.
6. Let the page retrieve an account-specific freight estimate when enough inputs exist.
7. Use **Save The Order** to add the validated record to the page's local staging list.
8. Use **Order Immediately**, or the staged list's final submit action, to send the order to J&T.

No final action in step 8 was clicked.

Static frontend inspection showed an important distinction: **Save The Order** validates and adds/edits the row in the page's in-memory staging list. It does not itself call the provider submission operation. **Order Immediately** validates and calls the order-submission operation. A staged batch's final submit uses the same provider operation with an array of orders.

The safest browser assistance boundary is therefore immediately before **Order Immediately** or the staged list's final submit. Because J&T can change this behavior, K2 must not assume that a button named “save” will always remain non-mutating.

### Visible controls and fields

| Group | Field/control | UI type | Requirement observed | Default/source opportunity | Human judgment |
|---|---|---|---|---|---|
| Sender | Sender Address | Saved-address selector | Required for a complete order | Select a known J&T pickup record; K2 may suggest its matching warehouse | Human confirms correct pickup address |
| Sender | Sender name, phone, province, city, barangay, detail | Populated from the selected saved address rather than exposed as independent bulk columns | Required as part of sender profile | J&T address book | Human maintains it in J&T |
| Pickup | Preferred Pickup Date | Date control | Required by client validation | K2 may propose the operating date | Human confirms cutoff and warehouse readiness |
| Receiver helper | Address Parsing | Free-text textarea plus **Parse** | Optional helper | K2 can provide a copy-ready address | Parsed output must be reviewed |
| Recipient | Recipient Name | Free text | Required | K2 customer/order | Usually deterministic; human checks exceptions |
| Recipient | Phone Number | Free text | Required | K2 customer/order | Human checks malformed or shared numbers |
| Recipient | Province | Cascading dropdown | Required | K2-to-J&T location mapping | Review unmapped or ambiguous addresses |
| Recipient | City | Cascading dropdown | Required | K2-to-J&T location mapping | Review naming mismatches |
| Recipient | Barangay | Cascading dropdown | Required | K2-to-J&T location mapping | Review coverage/ODZ result |
| Recipient | Address | Free text | Required | K2 address line | Human confirms completeness/landmarks |
| Recipient | Postal code | No dedicated field observed | Not represented in the inspected form/template | Preserve in K2; include in address only if J&T instructs | J&T confirmation needed |
| Parcel | Item Name | Free text | Required | K2 order line summary | Human may generalize sensitive/long descriptions |
| Parcel | Item Weight | Numeric | Required; service limits apply | K2 packed actual weight | Human verifies measured packed weight |
| Parcel | Number Of Items | Numeric | Required | K2 packed quantity | Human verifies parcel count |
| Parcel | Express Type | Dropdown | Required for quotation/submission | Account returned J&T Super and EZ | Human confirms service/cutoff/eligibility |
| Parcel | COD | Numeric | Required by client validation but may be zero subject to account limits | K2 balance due | Human verifies payment state |
| Parcel | Calculated COD Fee | Disabled calculated display | Derived | J&T | Review only |
| Parcel | Payment Method | Disabled/derived display in the inspected flow | Account/configuration derived | J&T contract | No K2 override |
| Parcel | Item Value | Numeric | Required by client validation | K2 declared/insured value rule | Human confirms protection value |
| Parcel | Calculated Valuation Fee | Disabled calculated display | Derived | J&T | Review only |
| Parcel | Pouches Size | Dropdown | Conditional/selection dependent | K2 may suggest from packed parcel | Human verifies physical packaging |
| Parcel | Remarks | Free text | Optional; client limit of 200 characters | K2 fulfillment notes | Human removes internal/private notes not meant for courier |
| Invoice | Sender Company | Free text/selected invoice data | Conditional for the applicable payment/invoice flow | J&T invoice profile | Human/account configuration |
| Invoice | Company Address | Free text/selected invoice data | Conditional | J&T invoice profile | Human/account configuration |
| Invoice | Company Tax Number | Free text/selected invoice data | Conditional | J&T invoice profile | Human/account configuration |
| Invoice | Company Phone | Free text/selected invoice data | Conditional | J&T invoice profile | Human/account configuration |

### Services, package limits, and fee input

The account returned two selectable service labels during the investigation:

- **J&T Super**
- **EZ**

This is an account/date observation, not a promise that the same services will always be available. The frontend contains vocabulary for other codes, but code presence does not establish availability and those values should not be surfaced in K2 without a live J&T-approved source.

Client-side rules included these maximums:

- EZ and one recognized road/regular code: 50 kg
- J&T Super: 5 kg
- Other globally recognized service codes: 5 kg or 20 kg depending on code
- Pouch labels shown in the account: **Small (<=3KG)**, **Medium (<=5KG)**, and **Large (<=8KG)**

The numeric pouch-code mapping in minified code was not clear enough to treat as contractual. K2 should store the human-readable size and a separately versioned provider mapping rather than hard-code an inferred numeric code.

The authenticated fee request accepts sender province/city, receiver city, weight, number of items, declared/insurance value, other fee, pouch size, and service type. Its returned fee is displayed as the receivable amount. Length, width, and height are not sent to this fee operation.

### Dimensional computation

The separate **Dimension Computation** page performs a client-only calculation:

```text
volumetric weight = (length × width × height) / 3500
```

The result is rounded to two decimal places. The snapshot did not visibly label the length unit, so centimeters are plausible but **not verified** and must be confirmed with J&T before K2 treats this as an operational rule. The page does not prove whether final billable weight is `max(actual, volumetric)`, how multiple pieces are aggregated, or whether service-specific divisors apply. Those rules need contractual confirmation and bill reconciliation.

## 5. Required shipment fields

### Minimum K2-to-J&T handoff record

K2 can prepare the following canonical handoff without touching J&T:

| K2 handoff field | J&T destination | Preparation rule | Exception owner |
|---|---|---|---|
| K2 order/reference ID | Internal K2 reference; include in remarks only if approved | Never replace J&T order/waybill IDs | K2 staff |
| Pickup warehouse key | Saved Sender Address | Map to an existing J&T address-book record | Fulfillment lead |
| Preferred pickup date | Preferred Pickup Date | Propose only after pack readiness and cutoff checks | Fulfillment staff |
| Receiver name | Recipient Name / Receiver | Normalize spacing; do not silently truncate | Staff if invalid |
| Receiver phone | Phone Number | Validate Philippine phone format; preserve source value for audit | Staff/customer service |
| Province | J&T Province | Map against a versioned J&T location snapshot | Staff if unmapped |
| City/municipality | J&T City | Map against the selected province | Staff if ambiguous |
| Barangay | J&T Barangay/Region | Map against selected city | Staff if unmapped/ODZ |
| Full address | Receiver Address | Preserve unit, street, subdivision, landmark as allowed | Staff/customer service |
| Postal code | K2 only unless J&T confirms placement | Do not invent a dedicated J&T field | Staff |
| Parcel description | Item Name / Parcel Name | Create a courier-safe concise description | Fulfillment staff |
| Packed quantity/pieces | Number Of Items / Total parcels | Use packed parcel count, not merely cart line count | Fulfillment staff |
| Actual packed weight | Weight (kg) | Require measured value | Fulfillment staff |
| Dimensions | K2 calculation input only in observed flow | Store L/W/H with unit and formula version | Fulfillment staff |
| Proposed chargeable weight | K2-only preparation | Keep separate from J&T settlement weight | J&T bill is final truth |
| Express service | Express Type | Suggest from approved rules; human selects/confirms | Fulfillment staff |
| Pouch/package | Pouches Size | Suggest only; physical pack determines selection | Fulfillment staff |
| Declared/item value | Item Value / Parcel Value | Apply owner-approved protection rule | Fulfillment lead |
| COD amount | COD | Derive from unpaid amount at handoff time | Fulfillment/finance |
| Remarks | Remarks | Courier-safe notes only, maximum 200 characters in single form | Fulfillment staff |

### Location hierarchy

The authenticated `getAddress` read returns the province/city/barangay hierarchy used by the forms. The initial response contained 82 top-level records. Nodes expose a display name (`n`), with `c` used as the nested child collection at province and city levels, plus provider flags at lower levels for service/coverage logic. No separate province/city/barangay ID was observed in the normal VIP form selection or final order payload; the selected hierarchy is submitted as names. The browser caches a version marker and the address list locally for performance.

K2 should not equate its free-text address values with these codes. A durable mapping needs:

- the original customer text;
- normalized K2 province/city/barangay names;
- the exact J&T display-name hierarchy last confirmed by staff, plus any formally supplied provider identifier or coverage flag where one exists;
- the snapshot/version date;
- mapping confidence and a manual-review state;
- an ODZ/service-availability result when available.

The mobile-store area endpoint also returns public hierarchical area IDs and names. Those IDs belong to the mobile storefront's implementation and must not be assumed interchangeable with VIP form codes without explicit evidence.

## 6. Bulk import/export findings

### Import availability and file format

Bulk import is available through **Create Waybills In Bulk**. The screen exposes:

- **Bulk Upload**
- **BatchExport**
- **Download Template**
- **Clear Up**
- **Delete**
- sender-address, invoice, and preferred-pickup-date defaults
- a staging table for imported rows

The file chooser advertises `.xlsx` and `.xls`; the client-side drop handler also recognizes `.csv`. It accepts one file smaller than 10 MB. The browser parses the first worksheet client-side with SheetJS, validates rows, and stages them before final provider submission.

The official English template downloaded read-only from:

```text
https://ylvipapi.jtexpress.ph/feilvbin-vip-interface/static/excel/exptemplete_en.xls
```

It returned HTTP 200 as a genuine legacy OLE `.xls` workbook (`application/vnd.ms-excel`) with a size of 4,094,976 bytes on the investigation date. Language-specific templates follow the observed `exptemplete_<language>.xls` naming pattern; only the English file was inspected.

The workbook contains an example row and an address/valid-location guide. Example data is not reproduced here.

### Exact import columns

The template's shipment columns, in order, are:

1. `Receiver(*)`
2. `Receiver Telephone (*)`
3. `Receiver Address (*)`
4. `Receiver Province (*)`
5. `Receiver City (*)`
6. `Receiver Region (*)`
7. `Express Type (*)`
8. `Parcel Name (*)`
9. `Weight (kg) (*)`
10. `Total parcels(*)`
11. `Parcel Value (Insurance Fee) (*)`
12. `COD (PHP) (*)`
13. `Remarks`

The starred columns are required by the template. Sender fields are absent because staff select the saved sender address, invoice profile, and pickup date in the dashboard before submission.

The staging table displays sender and receiver data, item name, weight, pieces, service, COD, item value, payment method, remarks, and **ODZ**. Template guidance uses `NO` to denote ODZ (out of delivery zone).

### Bulk action boundaries

| Action | Behavior | Classification |
|---|---|---|
| Download official template | Static file read; no account change | GREEN/read-only |
| Generate matching workbook in K2 | Local file creation only | GREEN |
| Upload/drag file | Client parses, validates, and stages rows; still capable of leading to submission | YELLOW; staff performs in visible session |
| Clear/delete staged rows | Changes only current staging state according to inspected code, but UI behavior may change | YELLOW; staff controls |
| BatchExport | Produces a server-side/downloadable template from staged data when rows exist | YELLOW/read operation, but unnecessary if K2 creates the source workbook |
| Final Submit Orders | Sends an array of orders to the provider order endpoint | RED; human only |
| Batch waybill print | Available later from Order Management, not from initial import | RED/YELLOW boundary; human selects and prints only after review |
| Bulk pickup | No separate safe bulk-pickup tool was established | Unverified; do not automate |
| Bulk tracking | Express Tracking accepts up to ten waybills; list/export tools also exist | YELLOW; owned waybills only |

This makes a K2-generated workbook the preferred no-API bridge. It eliminates repetitive typing while preserving J&T's validation and the staff member's final decision.

## 7. Waybill workflow

### Observed list and controls

**My Waybill** exposes these columns:

- Serial Number
- Creator Code
- Status
- Waybill Number
- Sign For Pictures
- SigningTime
- Receiver
- Receiver Cellphone
- Province
- City
- Barangay
- Address
- Payment Method
- Settlement Weight
- Receivable Freight
- Receipt Waybill No
- Total Shipping Cost
- COD
- Pouches Size
- Submission Time
- RTS Reason
- Remarks
- Operating

Filters include waybill number, order-date range, order status, and a secondary selector. Buttons include **Search**, **Reset**, **Export**, and **The Custom Column**.

**Order Management** additionally exposes **J&T Waybill Print**, **Express Tracking**, **Cancel Order**, **Waybill Print Preview**, and custom columns. Its table holds both order and waybill identifiers. A read-only print-template configuration request returns available template names and definitions.

### What is and is not established

- Order submission is the provider mutation that precedes order/waybill management.
- Orders and waybills are separately represented, and order rows can later contain a waybill number.
- Print/preview tools exist, including batch-oriented selection in Order Management.
- The dashboard loads local LODOP/CLodop print-helper script addresses, so printing may depend on workstation software and is not a portable web-only contract.
- No row was available, so label dimensions/format, download behavior, timing of number assignment, reprint behavior, and whether every service immediately receives a waybill are unverified.
- No waybill was generated, previewed, printed, regenerated, canceled, or changed.

K2's packing slip or packing QR must remain distinct from the carrier waybill. K2 should store a J&T waybill only after a human has completed the J&T action and copied/imported the provider-issued identifier.

## 8. Tracking workflow

Three read-oriented tracking surfaces were observed:

1. **Order Tracking** lists J&T orders and their order status, order number, waybill number, receiver, location, service, payment method, COD, pouch, submission time, preferred pickup date, and remarks.
2. **Express Tracking** accepts up to ten waybill numbers separated by commas or newlines.
3. **Problematic Shipment** lists last scan time/type, pending days, receiver/address data, and item name for exception handling.

The authenticated frontend contains read operations for order lists/status counts and tracking/waybill detail, including paths named `trackingList.do` and `findWaybillNoDetail.do`. No arbitrary identifiers were tested and no mutation was replayed.

Because the account had no visible legitimate shipment rows, the following requested details remain unverified:

- tracking-event field names and complete event chronology;
- facility/location precision;
- proof-of-delivery image behavior;
- delivery, failed-attempt, return-to-sender, and terminal-state codes;
- whether the final event-detail call is fulfilled wholly by the VIP backend or proxied internally to another J&T service.

The page-level reads are sent to the VIP API base, not directly to the public J&T tracking website. That establishes a VIP gateway, but not the ultimate internal source.

### Synchronization conclusion

K2 can safely store tracking numbers and human-confirmed statuses. It can also import a staff-downloaded order/waybill export if a stable key is available. It should **not** poll the private VIP tracking endpoints in production or automate arbitrary tracking-number enumeration. A real automatic tracking sync should wait for an official J&T API/webhook or other explicitly approved data feed. Until then, status remains a manual or human-triggered import workflow.

## 9. Billing/reconciliation findings

### Available evidence

**My Waybill** exposes settlement weight, receivable freight, total shipping cost, COD, signing time, and return-to-sender reason alongside the waybill number.

**My Bill** has a searchable/exportable statement grid with fields for:

- bill number/date and settlement/service/branch metadata;
- COD categories and amounts;
- COD commission, VAT, and withholding-tax fields;
- freight and settled fee;
- shipping withholding tax;
- return shipping and related withholding tax;
- super/value-added fees;
- adjustments and discounts;
- payment amount, deductions, and differences;
- creation, confirmation, billing, and email statuses.

**Transaction Inquiry** exposes account movements with operation type, before/operation/after amounts, bank, creator/auditor, and remarks. **Export Records** provides progress and download handling for generated exports.

No rows were present, so actual export column values and cross-file identifiers could not be validated.

### Requested cost-field assessment

| Cost fact | Observed availability | Caveat |
|---|---|---|
| Actual/receivable shipping fee | Yes: receivable freight, total shipping cost, freight/settled-fee columns | Meaning and timing need reconciliation against a real bill |
| Charged weight | Settlement Weight is present in My Waybill | No record was available to compare with actual weight |
| Volumetric weight | No explicit billed volumetric-weight column was verified | Dimension helper alone is not billing evidence |
| Insurance/protection fee | Fee calculation accepts declared/insurance value; bill has value-added-fee categories | A distinct per-waybill insurance column was not verified |
| COD fee | COD commission, VAT, and withholding-tax categories are visible | Contract-specific interpretation is needed |
| Discounts | Yes | No live example was inspected |
| Adjustments | Yes | No live example was inspected |
| Final billed charge | Payment/settled/difference fields are present | Define the authoritative total with finance after a real statement |
| Downloadable statements | Export controls and Export Records exist | A zero-row export was not created merely for testing |

### Recommended reconciliation key and process

Use J&T waybill number as the provider-side reconciliation key, with K2 order/fulfillment ID as the internal key. Preserve each value separately. Staff should export the statement, import it into a quarantined reconciliation step, review unmatched/duplicate rows, and then compare:

```text
K2 customer shipping charge
K2 pre-shipment estimate
J&T quoted receivable freight at submission
J&T settlement weight
J&T final billed freight/fees/adjustments
variance and review outcome
```

K2 must never describe its estimate as the final J&T charge. Finance/billing mutations, top-ups, approvals, and feedback remain human-only.

## 10. Network architecture

### Authenticated VIP client

The frontend's API base was:

```text
https://ylvipapi.jtexpress.ph/feilvbin-vip-interface
```

Most reads use `POST`, including list and lookup operations. The Axios client was configured with a 120-second timeout and `withCredentials: false`. Non-sensitive configured/request headers include:

```http
Content-Type: application/json
langType: <interface language>
Accept: application/json, text/plain, */*
Origin: https://vip.jtexpress.ph
Referer: https://vip.jtexpress.ph/
```

Authenticated requests use an envelope containing `parameter` plus session authentication and per-request timestamp/signature fields. Their values were neither displayed nor retained. A sanitized read shape is:

```json
{
  "parameter": {
    "current": 1,
    "size": 50
  }
}
```

The actual authenticated envelope contains additional omitted authentication/signature material.

A common response envelope has this structure:

```json
{
  "success": true,
  "code": 200,
  "desc": "RESULT_DESCRIPTION",
  "data": {
    "records": [],
    "total": 0,
    "current": 1,
    "size": 50
  },
  "traceId": "OMITTED"
}
```

This is a structural example, not a captured response. Trace identifiers must be treated as operational metadata and not copied into K2 logs unless J&T explicitly requires them for support.

No separate CSRF field was observed. That does not mean the application lacks request-integrity checks: authenticated body material and a per-request signature serve that role. Browser login is required to obtain the session state. VIP endpoints were not tested as unauthenticated standalone APIs, because they are visibly private and independently reproducing their signing would be outside the safe workflow. They should be treated as **authentication required, session/signature required, and not independently supported**.

### Read endpoints observed or mapped

Unless stated otherwise, each URL below is under the authenticated VIP base above, requires the signed authenticated request envelope, returns JSON, and should not be called independently by K2. The list combines operations observed during safe navigation with read operations statically mapped by the corresponding visible frontend page. A statically mapped operation was not invoked when doing so required a waybill/row that the account did not have.

| Purpose | Method and full URL/path | Sanitized `parameter` keys | Relevant response shape | Read/mutation |
|---|---|---|---|---|
| Address hierarchy | `POST https://ylvipapi.jtexpress.ph/feilvbin-vip-interface/api/getAddress.do` | Initial hierarchy/version request | Array/tree of names (`n`), nested children (`c`), and provider flags | Read |
| Saved addresses | `POST .../api/queryList.do` | Address type, search fields, page/pageSize | Paginated saved-address rows | Read |
| Invoice profiles | `POST .../api/customer/invoice/queryInvoicePage.do` | Pagination/search | Invoice profile page | Read |
| Account services | `POST .../api/getExpressTypesNew.do` | Pickup/sender/receiver province-city-area context | Array of `id`, `value`, `remark`, `enName`, `estimatedTime`, `serviceFee` | Read |
| City service flags | `POST .../api/getCityFlagList.do` | Area/service context | City support flags | Read |
| COD/item limits | `POST .../api/getLimitDatas.do` | Account/order context | `totalItem` and COD min/max limits | Read |
| Freight inquiry | `POST .../api/getFee.do` | `expressType`, `insuranceFee`, `numbers`, `othersFee`, `receivecity`, `sendcity`, `sendprov`, `weight`, `packageSize` | Fee array; first row contains displayed `fee` | Read |
| Orders | `POST .../api/getOrders.do` | Date range, IDs, order/status/service/payment filters, page/pageSize | Paginated order list | Read |
| Order status counts | `POST .../api/getStatusCountData.do` | Order/status/date filters | Status/count data | Read |
| Waybill list | `POST .../api/getSendOrders.do` | Waybill/order/status/date filters and pagination | Paginated waybill rows | Read |
| Waybill status counts | `POST .../api/countSendOrders.do` | Waybill/order/status/date filters | Status/count data | Read |
| Waybill freight detail | `POST .../api/getFreight.do` | Owned order/waybill context | Freight-detail data | Read; statically mapped, no row available |
| Tracking list | `POST .../api/trackingList.do` | Owned waybill list/context | Tracking/status data | Read; statically mapped, no number submitted |
| Waybill detail | `POST .../api/waybill/findWaybillNoDetail.do` | Owned waybill context | Waybill-detail data | Read; statically mapped, no row available |
| Print templates | `POST .../api/printTemplateConfig.do` | Account/context | Template rows with `templet` and `templetName` | Read |
| Problematic shipments | `POST .../api/getAbnormalOrders.do` | Filters and pagination | Paginated exception rows | Read |
| Export jobs/results | `POST .../api/listExportTask.do` and `POST .../api/getExportResult.do` | Filters/job context | Export-job page and result/file metadata | Read; result requires an authorized existing job |
| Bill statements | `POST .../api/getYlNwmCustomerBillResult.do` | Start/end dates, current, size | Paginated bill rows | Read |
| Account transactions | `POST .../api/getCustomerAccountRecordResult.do` | Date range, current, size | Paginated transaction rows | Read |
| Account summary | `POST .../api/getCustomerAccountResult.do` | Account context | Account/balance metadata | Sensitive read |
| Wallet status | `POST .../api/wallet/getStatus.do` | Account context | Wallet/auth status | Sensitive read |
| Billing problem types | `POST .../api/billProblemFeedback/getProblemTypes.do` | Empty/context | Problem type code/name rows | Read |
| Billing feedback list | `POST .../api/billProblemFeedback/page.do` | Status, dates, current, size | Paginated feedback rows | Read |
| Complaint types/list | `POST .../api/getVipWOrkOrderType.do` and `POST .../api/getWorkOrderDetailPage.do` | Category/filter/pagination | Type rows and complaint page | Read |
| Claim status/list | `POST .../claim/status.do` and `POST .../claim/page.do` | Status/filter/pagination | Status options and claim page | Read |
| Stop/return list | `POST .../orderIntercept/list.do` | Filters/pagination | Paginated intercept rows | Read |
| Shopify counts/list | `POST .../vip/shopify/findCountByStatus` and `POST .../vip/shopify/page` | Status/date/page filters | Status counts and paginated preorders | Read |
| Notification count | `POST .../api/messageNotification/getMessageNotificationCount` | Empty context | Numeric unread count | Read/background polling |

Ellipses in the URL column expand to `https://ylvipapi.jtexpress.ph/feilvbin-vip-interface`; they do not conceal a separate host.

### Static/public reads

| Purpose | Method and full URL | Request | Response | Authentication / independent use |
|---|---|---|---|---|
| Bulk workbook | `GET https://ylvipapi.jtexpress.ph/feilvbin-vip-interface/static/excel/exptemplete_en.xls` | None | Legacy Excel binary | No authenticated envelope observed; worked as a standalone static download |
| Mobile catalog page | `POST https://ylvipapi.jtexpress.ph/feilvbin-vip-interface/api/spu/h5/page` | `page`, `size`, `shopName` plus public-client integrity headers | Product page or empty/missing-shop result | No VIP login; valid shop name and current frontend signing expected; not an official API |
| Mobile product detail | `POST .../api/spu/h5/detail` | Shop/product context | Product detail | Public mobile flow; not called with an arbitrary product |
| Mobile variant detail | `POST .../api/h5/product/detail` | Product/order context depending on view | Detail/result data | Public mobile flow; identifiers still must not be enumerated |
| Mobile area linkage | `GET .../api/h5/product/getAreaLinkageInfoByParentId?parentId={id}&current=1&size=9999` | Parent area ID and pagination | Area IDs and `nativeName` | Public mobile flow; not a stable K2 contract |

The mobile-store frontend creates its own integrity headers. Reproducing that implementation would couple K2 to an unsupported public client and is not recommended.

### Mutation endpoints revealed by normal UI/static code but never invoked

| Purpose | Method/path | Mutation boundary |
|---|---|---|
| Submit one or many orders from the inspected single/bulk flows | `POST .../api/insertOrder.do` | Creates provider order/shipment state; human only |
| Bind/check store name | `POST .../api/bindShopName.do` | Check mode reads availability; confirm mode permanently binds the merchant setting. K2 should invoke neither |
| Pull Shopify orders | `POST .../vip/shopify/pull/order` | Changes/synchronizes merchant-channel state; human only |
| Ship/sync Shopify order | `POST .../vip/shopify/sync/order` | Creates/updates fulfillment state; human only |
| Public mobile purchase | `POST .../api/h5/product/buy` | Creates a J&T mobile-store preorder/order; customer action only |

Cancel, complaint, claim, stop/return, address, invoice, user, payment, and other write operations also exist behind visible controls. Their private paths were not probed because documenting every mutation is unnecessary and replaying them is forbidden.

### Session, CSRF, and independent-use assessment

| Question | Finding |
|---|---|
| Cookies required? | The API client sets `withCredentials: false`, and API authentication was carried in the request envelope. The web login/session is still required. No cookie names or values were inspected or retained. |
| Authentication required? | Yes for VIP operations. |
| CSRF/token validation? | No separate CSRF field was observed. Session authentication plus timestamp/signature fields are present and must be treated as request validation. |
| Works independently of webpage? | Static template: yes. Public mobile catalog: technically accessible through its current frontend contract with a valid shop, but unsupported. Authenticated VIP reads/mutations: no supported independent use and not tested that way. |
| Rate-limit behavior? | Normal low-volume navigation returned HTTP 200 and no 429. Background notification polling occurred. No stress test was performed, so limits and enforcement are unknown. |
| Stable API contract? | No versioning, public schema, SLA, change notice, or reuse guarantee was found. |

## 11. Automation opportunities

### GREEN — fully inside K2

| Opportunity | Safe scope |
|---|---|
| Recipient preparation | Validate names, phones, and address completeness; retain original input and normalization audit |
| Address normalization | Map to a versioned, reviewed J&T location snapshot; route uncertain mappings to staff |
| Parcel calculation | Store measured weight/dimensions and calculate a proposed volumetric/chargeable weight with an explicit formula version |
| Rate estimate | Use a K2-owned, owner-approved/versioned table; keep it labeled as an estimate |
| Service suggestion | Suggest from approved rules, without silently selecting a provider action |
| COD/declared-value preparation | Derive candidate values from K2 payment/order state and require final staff review |
| Bulk export generation | Generate the exact J&T workbook columns and validate them locally |
| Copy-ready shipout summary | Present all J&T fields in dashboard order with warnings and source links |
| Duplicate/idempotency guard | Prevent staff from preparing the same K2 fulfillment twice without an override |
| Tracking storage | Store a human-entered/imported J&T waybill and status history with provenance |
| Billing comparison | Import a human-downloaded statement and calculate variances without modifying J&T |

### YELLOW — browser-assisted with a person controlling J&T

| Opportunity | Safe boundary |
|---|---|
| Bulk file upload | Staff signs in, selects the K2-generated file, and reviews every validation/error before proceeding |
| Order form autofill | Visible, supervised assistance may fill deterministic fields; it stops before any save/submit whose behavior is not guaranteed |
| J&T fee inquiry | Staff requests and reviews the account-specific fee in the dashboard |
| J&T service-area check | Staff runs it for unmapped/ODZ exceptions |
| Waybill lookup/export | Staff searches or exports owned records |
| Waybill preview/printing | Staff selects confirmed shipments and initiates print on the authorized workstation |
| Tracking lookup | Staff queries only owned waybills; K2 receives copied or exported results |
| Billing export | Finance staff downloads an authorized statement and imports it into K2's reconciliation staging area |

Any browser helper must be optional, visible, short-lived, allowlisted to known fields, unable to click final actions, and designed to fail closed when labels/routes change. It must not save credentials or session material.

### RED — do not automate without an official API or explicit J&T approval

| Opportunity | Reason |
|---|---|
| Direct calls to authenticated VIP endpoints | Private signed session contract; unstable and unsupported |
| Unattended browser login or stored J&T credentials | Account-compromise and secret-custody risk |
| Shipment/order submission | Irreversible provider state, fees, and pickup consequences |
| Waybill creation/finalization | Creates carrier truth and may trigger operational obligations |
| Pickup booking | Commits provider/warehouse operations |
| Order/waybill cancellation or edits | Changes live fulfillment truth |
| Automated waybill printing | Can print wrong/duplicate labels and depends on workstation helper state |
| Private tracking polling | Undocumented authenticated dependency and possible rate-limit/account risk |
| Billing/payment/top-up actions | Financial mutation |
| Store-link binding or product/order automation | Creates persistent configuration and parallel order truth |
| Shopify pull/sync/ship actions | External-channel and provider mutations |
| User, permission, address, invoice, or service-setting changes | Security/merchant configuration mutation |

### Requested opportunity classification

| Requested item | Classification |
|---|---|
| Rate calculation | GREEN using K2-owned approved rates; YELLOW for staff VIP inquiry; RED for direct private-endpoint use |
| Recipient preparation | GREEN |
| Address normalization | GREEN with manual exception queue |
| Parcel calculation | GREEN as a proposal; final packed measurements remain staff evidence |
| Bulk export generation | GREEN |
| Bulk file upload | YELLOW |
| Order form autofill | YELLOW |
| Shipment creation | RED / human J&T action |
| Waybill creation | RED / human J&T action |
| Waybill printing | YELLOW only after human selection; no unattended print |
| Pickup booking | RED / human J&T action |
| Tracking sync | YELLOW via human entry/export; automatic private polling is RED |
| Billing reconciliation | GREEN after a human export; statement download is YELLOW; J&T financial actions are RED |

## 12. Human-in-the-loop opportunities

### Preferred option: K2-generated bulk workbook

```text
Customer order in K2
        |
        v
K2 validates recipient + address + payment state
        |
        v
Staff packs and records measured weight/dimensions
        |
        v
K2 proposes J&T location, service, pouch, COD, value, and fee estimate
        |
        v
Staff resolves warnings and marks READY FOR J&T HANDOFF
        |
        v
K2 generates J&T-compatible workbook + review summary
        |
        v
Human signs in to J&T, uploads, reviews J&T validation/fee
        |
        v
HUMAN clicks final Submit / creates waybill / handles pickup
        |
        v
Human copies or imports J&T order + waybill into K2
        |
        v
K2 tracks manual status and reconciles later J&T bill export
```

This option has the best labor reduction and lowest browser fragility. It also leaves an auditable handoff artifact.

### Secondary option: copy-ready order card

For one-off or exception shipments, K2 can show every field in J&T's screen order with one-click copy controls. Staff manually pastes/selects values and sees J&T validation before final submission. This is slower than bulk import but resilient when the template changes.

### Optional option: supervised browser autofill

A local staff helper could fill deterministic fields after the person logs in. It should:

- run only on explicit staff command in a visible browser;
- verify the expected host, page title, and field labels;
- fill only allowlisted non-secret shipment fields;
- never capture or export session/authentication material;
- never click Parse, Save, Submit, Order Immediately, Shipping, Synchronize, Print, Pickup, Cancel, Bind, Confirm, Pay, or Save Settings;
- display a clear “review in J&T” stop state;
- discard its session and test data on exit;
- stop if the page/version/schema differs.

This is a convenience, not a production integration. The bulk workbook should be built first because it is simpler to audit and less coupled to DOM selectors.

## 12A. Owner-authorized VIP rate observations — 1 September 2026

These are read-only observations from the authenticated **Shipping Fee Inquiry**
screen in the owner's J&T VIP account. No shipment, waybill, pickup, account
setting, credential, cookie, session identifier, or authentication material was
created, changed, copied, or retained.

The owner-confirmed Warehouse A sender is:

```text
Blk 48 Lot 2, Phase 1, San Jose Heights
Barangay Muzon East
San Jose del Monte City, Bulacan
Landmark/business: Guerra Pharmacy
```

The calculator hierarchy used for every final verification was
`BULACAN / SAN-JOSE-DEL-MONTE-CITY / MUZON EAST`. Earlier exploratory Poblacion
results are superseded by the Muzon East observations below.

### EZ ordinary parcel observations

The following searches used one item, no pouch, and PHP 0 declared value. The
representative destination barangay is recorded to make the test reproducible;
these observations do not prove that every barangay in the city has the same
contract row.

| Destination tested | Representative barangay | Weight | Receivable freight | Valuation fee | Total |
|---|---|---:|---:|---:|---:|
| San Jose del Monte City, Bulacan | Muzon East | 1 kg | PHP 85.00 | PHP 0 | PHP 85.00 |
| San Jose del Monte City, Bulacan | Muzon East | 50 kg | PHP 85.00 | PHP 0 | PHP 85.00 |
| Angeles City, Pampanga | Agapito del Rosario | 1 kg | PHP 85.00 | PHP 0 | PHP 85.00 |
| Calamba City, Laguna | Bagong Kalsada | 1 kg | PHP 85.00 | PHP 0 | PHP 85.00 |
| Dagupan City, Pangasinan | Bacayao Norte | 1 kg | PHP 85.00 | PHP 0 | PHP 85.00 |
| Baguio City, Benguet | A. Bonifacio-Caguioa-Rimando (ABCR) | 1 kg | PHP 85.00 | PHP 0 | PHP 85.00 |
| Caloocan, Metro Manila | Barangay 1 | 1 kg | PHP 95.00 | PHP 0 | PHP 95.00 |
| Cebu City, Cebu | Apas | 1 kg | PHP 100.00 | PHP 0 | PHP 100.00 |
| Davao City, Davao del Sur | Agdao | 1 kg | PHP 105.00 | PHP 0 | PHP 105.00 |

Controlled exploratory tests also returned the same ordinary EZ freight for
0.1, 0.5, 1, 3, 3.1, 4, 5, 6, 10, 10.1, 20, 30, 40, and 50 kg on the tested
Caloocan route; Cebu returned PHP 100.00 at 1, 3, 10, and 50 kg; Davao returned
PHP 105.00 at 1, 3, and 50 kg. This is evidence of the calculator's observed
account response, not proof that J&T will settle every physical parcel at a
weight-independent amount. K2 must not generalize these samples into a national
rate table without owner review and bill reconciliation.

### EZ pouch observations

Selecting a pouch disabled the ordinary weight input and made pouch size the
pricing selector in the inquiry screen.

| Destination tested | Small (<=3KG) | Medium (<=5KG) | Large (<=8KG) |
|---|---:|---:|---:|
| San Jose del Monte City / Muzon East | PHP 70 | PHP 120 | PHP 160 |
| Caloocan / Barangay 1 | PHP 70 | PHP 90 | PHP 120 |
| Cebu City / Apas | PHP 90 | PHP 150 | PHP 180 |
| Davao City / Agdao | PHP 95 | PHP 160 | PHP 190 |

The non-monotonic route comparison—for example, Muzon East medium/large pouch
rates exceeding the tested Caloocan rates—means K2 must preserve the observed
contract rows rather than derive price from geographic distance.

### Additional calculation behavior

- J&T Super on the tested Caloocan route returned PHP 95.00 receivable freight
  plus a PHP 15 service fee, for PHP 110.00 total at zero declared value. The
  result remained unchanged from 0.1 through 5 kg in the controlled test.
- A zero declared value returned a zero valuation fee. A positive declared
  value returned a minimum PHP 5 valuation fee and then approximately 1% of
  declared value rounded to the nearest peso with `.50` rounding upward:
  PHP 100 -> PHP 5, PHP 500 -> PHP 5, PHP 501 -> PHP 5, PHP 550 -> PHP 6,
  PHP 999 -> PHP 10, PHP 1,000 -> PHP 10, PHP 2,000 -> PHP 20, and
  PHP 5,000 -> PHP 50.
- Changing Number Of Items from one to three did not change the tested Cebu
  large-pouch result. The field must not be treated as a freight multiplier.
- The VIP inquiry screen exposed no length, width, or height inputs. It did not
  establish a VIP volumetric divisor or dimensional-price rule. K2 must not
  import the public calculator's dimensional rule into the VIP contract without
  written provider confirmation or reconciled billing evidence.

For the observed paths, the displayed total behaved as:

```text
total = observed route/package freight
      + J&T Super service fee when selected
      + valuation fee
```

This is a tested description, not an approved production pricing formula. The
production checkout source remains a K2-owned, versioned, owner-approved rate
table with effective dates, sample provenance, and actual-bill variance review.
The authenticated VIP request remains unsuitable as a live checkout dependency.

## 13. Security/account risks

### Primary risks

- **Private session dependency:** VIP calls depend on authenticated and signed request material. Capturing/reusing it would create a secret-custody problem and an unsupported integration.
- **Accidental mutation:** Labels such as Save, Shipping, Synchronize, Print, Confirm, and Submit can create provider or operational state. A browser helper must be incapable of invoking them.
- **PII exposure:** Workbooks contain names, phone numbers, and full addresses. Generate them only for authorized staff, minimize retention, prevent public links, and delete them according to K2 policy.
- **Finance exposure:** Bill, wallet, bank, COD, and account screens are sensitive. Shipping helpers do not need access to payment/top-up operations.
- **Duplicate shipments:** Repeated upload/submit can create duplicate orders or waybills. K2 needs a preparation lock and a human-confirmed provider-ID capture step.
- **Stale location/service data:** Cached address versions, coverage flags, service options, and account limits can change.
- **Parallel source of truth:** Shopify Pre Order or Create Store Link can create orders outside K2. Without an approved connector/reconciliation design, inventory and reporting diverge.
- **Customer-browser storage:** The mobile J&T storefront stores prior receiver form information in browser local storage. This is another reason not to make it K2 checkout.
- **Local printing dependency:** LODOP/CLodop-style local print helpers add workstation configuration and duplicate/wrong-label risk.
- **Unknown rate limits:** No rate-limit contract or SLA was found, and no stress test was allowed.

### What would break if J&T changes the website

An unofficial browser or endpoint dependency can break if J&T changes any of the following:

- hostname, route, base path, or SPA navigation;
- DOM labels, component IDs, validation rules, or button semantics;
- request envelope, authentication, signature, timestamp, CAPTCHA, or WAF behavior;
- endpoint paths, parameter names, response envelopes, status codes, or pagination;
- service IDs/names, account entitlement, location codes, coverage flags, or fee rules;
- Excel filename, workbook type, sheet layout, column order, required markers, or import parser;
- when “Save The Order” changes from local staging to a provider mutation;
- waybill timing, print-template format, or local print-helper requirements;
- Shopify permissions/sync behavior;
- Store Link entitlement, URL shape, product model, or public-client signing;
- export columns, statement identifiers, or retention windows.

The bulk-file workflow is still subject to template drift, but it fails more visibly and safely than a hidden direct API dependency: J&T can reject the file before a human submits it. K2 should version the supported template fingerprint and block generation when its mapping has not been recently reviewed.

### Production dependency assessment

Production dependency on the authenticated VIP website or its private endpoints is **not advisable**. There is no observed public contract, API version, SLA, stable schema, webhook guarantee, permission statement, or change-notification mechanism. The site should remain the human-operated system of record until J&T provides an official integration agreement.

## 14. Recommended K2 workflow

K2 should implement a provider-neutral shipping handoff, not a J&T web-client replica:

1. **Checkout estimate:** K2 quotes from its own versioned, owner-approved rate table. Label the amount as an estimate or configured customer charge, not a live J&T final fee.
2. **Fulfillment preparation:** After payment/order readiness, staff packs the order and records measured weight, dimensions with unit, piece count, pouch/package, item description, declared value, COD, and warehouse.
3. **Location mapping:** K2 maps province/city/barangay against a reviewed J&T snapshot and blocks unmapped/ODZ/low-confidence rows for human correction.
4. **Review gate:** K2 calculates proposed volumetric/chargeable weight, service, and customer-vs-provider estimate while clearly identifying every assumption.
5. **Handoff artifact:** K2 generates the exact J&T bulk workbook plus a manifest containing K2 fulfillment IDs, row hashes, warnings, and generation time. The J&T workbook itself should contain only provider-required data.
6. **Human J&T action:** Staff logs in directly, chooses the correct saved sender and pickup date, uploads the workbook, reviews J&T validation and fee, and personally submits. Staff handles waybill creation/preview/print and pickup.
7. **Provider-ID capture:** Staff records or imports J&T order/waybill numbers into K2. K2 changes its state only after this explicit confirmation and never invents a carrier number.
8. **Status handling:** Staff updates critical milestones or imports a human-exported owned-waybill report. Customer-facing tracking links point to an official J&T tracking surface when appropriate.
9. **Billing reconciliation:** Finance exports J&T billing data, imports it to a quarantine/review screen, resolves duplicates/unmatched rows, and records actual settlement weight/cost/fees and variance.
10. **Escalation path:** Repeated volume or sync needs trigger a request for J&T's official API/partner agreement rather than deeper VIP scraping.

Required K2 state distinctions should remain explicit:

```text
PREPARED IN K2
READY FOR J&T HANDOFF
EXPORTED FOR J&T
SUBMITTED IN J&T — HUMAN CONFIRMED
WAYBILL RECORDED
PICKUP/IN TRANSIT/DELIVERED — MANUAL OR APPROVED IMPORT
BILL RECONCILED
```

“Exported” must never imply “submitted,” and “submitted” must never imply “waybill created” unless the provider-issued identifiers are present.

## 15. Implementation priority

This is a proposed dependency order for consideration under existing `IDEA-20260901-01` and `G-013`; it is **not** a new backlog and does not authorize implementation.

1. **Define the manual handoff contract first.** Confirm owner rules for sender warehouse, packed-weight evidence, dimensions/unit, service, pouch, insurance/value, COD, pickup timing, status vocabulary, and who may submit in J&T.
2. **Build local validation and the copy-ready review card.** This delivers value without depending on J&T HTML or private calls.
3. **Add versioned J&T bulk-workbook generation.** Match the inspected 13 columns, keep sender/pickup selection human, add duplicate-preparation protection, and retain a manifest outside the PII workbook.
4. **Add explicit human confirmation and provider-ID capture.** Require staff to record the J&T order/waybill after submission; distinguish prepared/exported/submitted/waybill states.
5. **Add human-exported tracking and billing reconciliation.** Start with guarded manual import, provenance, duplicate detection, and unmatched-row review.
6. **Consider supervised autofill only if bulk import leaves material pain.** Keep it local, visible, fail-closed, and technically unable to submit.
7. **Pursue an official J&T integration for unattended behavior.** Only an approved API/webhook should enable automatic booking, waybill generation, pickup, status sync, or final-cost retrieval.

Before any implementation, the active Master Action Plan gate and owner/provider decisions remain authoritative.

## BEST PRACTICAL NO-API WORKFLOW

**What can K2 automate fully?**  
K2 can fully automate recipient/address validation, versioned J&T location mapping, parcel and proposed volumetric-weight calculations, COD/declared-value preparation, service suggestions, duplicate checks, copy-ready summaries, J&T-compatible workbook generation, provider-ID storage, and variance calculations from a human-imported bill. It should use K2-owned approved rates for checkout estimates, not the private VIP rate request.

**What can browser assistance safely automate?**  
In a visible staff-controlled session, it can optionally fill deterministic fields or help select a local K2-generated workbook. It may verify that expected fields are present and then stop. A person must review J&T's location, service, fee, validation, and warnings. Bulk upload is the preferred assistance because it is less fragile than DOM autofill.

**What must remain a human J&T action?**  
Login, final upload review, final order/shipment submission, waybill creation/finalization, print selection, pickup booking, cancellation/editing, Store Link binding, Shopify pull/sync/ship, complaint/claim/stop-return actions, settings/users/addresses/invoices changes, and all billing/payment actions.

**Can K2 connect/store-sync with J&T using an existing supported feature?**  
No generic K2/custom-store connector, API credential, or webhook feature was found. Shopify has a dedicated page, but K2 is not Shopify. Create Store Link is a separate J&T-hosted catalog/order channel and would fork canonical K2 order and inventory truth; it is not a K2 connector.

**Is bulk import available?**  
Yes. J&T provides an English `.xls` template with 13 shipment columns, accepts spreadsheet upload into a validation/staging screen, and supports final batch submission by a human. This is the best practical handoff mechanism.

**Can tracking be synchronized?**  
Only manually or through a human-triggered/export-import workflow under the no-API constraint. Automatic polling of private VIP endpoints is not recommended. Reliable unattended sync should wait for an official J&T tracking API or webhook.

**How much repetitive manual work can realistically be eliminated?**  
Most data retyping can be eliminated: K2 can prepare and validate every shipment row and generate the upload file. Staff still must pack/measure, resolve address or service exceptions, log in, review J&T's fee and validation, click final actions, handle labels/pickup, and return the provider identifiers. For clean bulk orders, this can reduce the workflow from re-entering every field to one reviewed upload plus exception handling and final confirmation.

**Overall recommendation: SAFE ONLY AS FALLBACK.** Use the J&T VIP dashboard as a human-operated fulfillment system with K2-generated preparation artifacts. Direct production dependency on its private endpoints or unattended browser automation is **NOT RECOMMENDED**.
