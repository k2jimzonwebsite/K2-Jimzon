# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wholesale-inquiry-ui.spec.js >> secure wholesale inquiry returns only a server receipt and no commercial authority
- Location: tests\wholesale-inquiry-ui.spec.js:3:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByRole('navigation', { name: 'Mobile storefront' }).getByRole('button', { name: 'Wholesale' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]: Italy-sourced goods, fulfilled in Manila · Final stock and delivery are confirmed by K2 staff
    - generic [ref=e6]:
      - link "K2 Jimzon home" [ref=e7] [cursor=pointer]:
        - /url: /
        - generic [ref=e14]:
          - text: K2 Jimzon
          - generic [ref=e15]: Direct Italian imports
      - button "Customer account" [ref=e16] [cursor=pointer]
      - button "Open cart, 0 items" [ref=e19] [cursor=pointer]
      - button "Switch to dark mode" [ref=e22] [cursor=pointer]
    - generic [ref=e26]:
      - generic [ref=e27]: Search the catalog
      - searchbox "Search the catalog" [ref=e28]
  - main [ref=e29]:
    - generic [ref=e31]:
      - generic [ref=e32]:
        - generic [ref=e33]: Italy to Manila
        - heading [level=1] [ref=e38]:
          - text: Italy, chosen well.
          - emphasis [ref=e39]: Delivered to Manila.
        - paragraph [ref=e40]: Shop Italian favorites from our Manila stock, or request a specific item through Pasabuy.
        - generic [ref=e41]:
          - link "Shop the Collection" [ref=e42] [cursor=pointer]:
            - /url: /catalog
          - link "Request from Italy" [ref=e45] [cursor=pointer]:
            - /url: /pasabuy
        - button "Chat with K2 staff" [ref=e47] [cursor=pointer]
      - generic [ref=e50]:
        - generic "Explore the collection" [ref=e51]:
          - paragraph [ref=e52]: A little Italy, for your everyday.
          - paragraph [ref=e54]: Explore the collection or request a favorite from Italy.
        - generic [ref=e55]:
          - generic [ref=e56]:
            - generic [ref=e57]:
              - paragraph [ref=e58]: Sourcing route
              - paragraph [ref=e59]: Milano to Manila
            - generic [ref=e60]: Direct shipment
          - generic [ref=e61]:
            - group "Sourcing route stops" [ref=e62]:
              - button "Milano Sourcing" [ref=e63] [cursor=pointer]: Milano
              - button "In Flight & Transit" [ref=e64] [cursor=pointer]: In transit
              - button "Manila Hub" [pressed] [ref=e65] [cursor=pointer]: Manila
            - generic [ref=e67]:
              - generic [ref=e68]:
                - paragraph [ref=e69]:
                  - text: Manila Hub
                  - generic [ref=e70]: (Checked in Manila)
                - paragraph [ref=e71]: Checked by hand in Manila and delivered to your doorstep.
              - generic [ref=e72]: Step 3 of 3
          - generic [ref=e73]:
            - paragraph [ref=e74]:
              - generic [ref=e75]: Genuine catalog
              - text: Checked items in Manila
            - paragraph [ref=e76]:
              - generic [ref=e77]: Personal confirmation
              - text: Help from our Manila team
    - generic [ref=e79]:
      - generic [ref=e80]: Authentic Italian imports
      - generic [ref=e84]: Direct flights from Milan
      - generic [ref=e88]: Manila stock and Pasabuy options
      - generic [ref=e92]: Personal support from our Manila team
    - region "The Italian Cabinet" [ref=e96]:
      - generic [ref=e98]:
        - paragraph [ref=e99]: Browse By Category
        - heading "The Cabinet" [level=2] [ref=e100]
        - paragraph [ref=e101]: Browse the categories in our current catalog.
      - group "Cabinet categories" [ref=e102]:
        - button "Pasabuy su Misura Custom order Request something from Italy" [ref=e103]:
          - generic [ref=e108]:
            - generic [ref=e109]:
              - generic [ref=e110]: Pasabuy su Misura
              - generic [ref=e111]: Custom order
            - generic [ref=e112]: Request something from Italy
      - generic [ref=e115]:
        - paragraph [ref=e116]: Drag or swipe to browse. Use the arrows for more categories.
        - generic [ref=e117]:
          - button "Previous categories" [disabled] [ref=e118]
          - button "Next categories" [disabled] [ref=e121]
    - region "New arrivals" [ref=e124]:
      - generic [ref=e125]:
        - generic [ref=e127]:
          - paragraph [ref=e128]: Fresh Consignment
          - heading "New Arrivals" [level=2] [ref=e129]
          - paragraph [ref=e130]: Our latest catalog additions from Italy — stock is confirmed before anything is promised.
        - generic [ref=e131]: The arrivals could not be loaded. Check your connection and try again.
    - region "Interactive review globe" [ref=e133]:
      - generic [ref=e134]:
        - generic [ref=e135]:
          - paragraph [ref=e136]: Interactive review globe
          - heading "Reviews, mapped to the products." [level=2] [ref=e139]
          - paragraph [ref=e140]: Spin the product globe and open an item to read its published customer feedback.
        - status [ref=e142]:
          - paragraph [ref=e144]: Loading review globe…
    - region [ref=e145]:
      - generic [ref=e146]:
        - generic [ref=e147]:
          - generic [ref=e151]: Transit Pipeline
          - paragraph [ref=e152]: The sourcing journey
          - heading "From an Italian shelf straight to your home." [level=2] [ref=e153]
          - paragraph [ref=e154]: No drop-shipping uncertainty, no near-expiry mystery batches. Every item is physically handled by our own team from Milan to Manila.
          - generic [ref=e155]:
            - generic [ref=e156]:
              - generic [ref=e157]: Active Route
              - generic [ref=e158]: MXP (Milan) ➔ MNL (Manila)
            - generic [ref=e160]:
              - generic [ref=e161]: Inventory Model
              - generic [ref=e162]: Single Physical Master Stock
        - list "K2 sourcing journey" [ref=e164]:
          - listitem [ref=e165]:
            - button "01 MILANO · 45°28′ N, 9°11′ E Origin Verification Sourced directly from Italian shelves Our personal buyers in Milan shop directly from licensed supermarket chains (Esselunga, Conad, Coop) and regional Italian distributors, securing genuine European goods with original Italian packaging and lot codes." [pressed] [ref=e168] [cursor=pointer]:
              - generic [ref=e169]: "01"
              - generic [ref=e171]:
                - generic [ref=e172]:
                  - generic [ref=e173]: MILANO · 45°28′ N, 9°11′ E
                  - generic [ref=e174]: Origin Verification
                - heading "Sourced directly from Italian shelves" [level=3] [ref=e175]
                - paragraph [ref=e176]: Our personal buyers in Milan shop directly from licensed supermarket chains (Esselunga, Conad, Coop) and regional Italian distributors, securing genuine European goods with original Italian packaging and lot codes.
          - listitem [ref=e177]:
            - button "02 TRANSIT · MXP ➔ MNL (10,400 KM) Quoted sea or air option Freight agreed before purchase For Pasabuy requests, we check availability in Italy and quote the product, the agreed sea or air shipping option, and timing before purchase. Review and approve your quote before we buy." [ref=e180] [cursor=pointer]:
              - generic [ref=e181]: "02"
              - generic [ref=e183]:
                - generic [ref=e184]:
                  - generic [ref=e185]: TRANSIT · MXP ➔ MNL (10,400 KM)
                  - generic [ref=e186]: Quoted sea or air option
                - heading "Freight agreed before purchase" [level=3] [ref=e187]
                - paragraph [ref=e188]: For Pasabuy requests, we check availability in Italy and quote the product, the agreed sea or air shipping option, and timing before purchase. Review and approve your quote before we buy.
          - listitem [ref=e189]:
            - button "03 MANILA HUB · 14°35′ N, 120°58′ E Single Master Inventory Physical stock inspection & fast doorstep delivery Every box is opened, checked for Best-Before dates, and registered into our single master inventory. When you order, staff verify the physical lot in Manila before issuing your payment QR." [ref=e190] [cursor=pointer]:
              - generic [ref=e191]: "03"
              - generic [ref=e193]:
                - generic [ref=e194]:
                  - generic [ref=e195]: MANILA HUB · 14°35′ N, 120°58′ E
                  - generic [ref=e196]: Single Master Inventory
                - heading "Physical stock inspection & fast doorstep delivery" [level=3] [ref=e197]
                - paragraph [ref=e198]: Every box is opened, checked for Best-Before dates, and registered into our single master inventory. When you order, staff verify the physical lot in Manila before issuing your payment QR.
    - generic [ref=e200]:
      - generic [ref=e203]:
        - paragraph [ref=e204]: Pasabuy Requests
        - heading "Looking for a specific item from Italy? We can source it for you." [level=2] [ref=e207]
        - paragraph [ref=e208]: Tell us what you need. We check availability in Italian stores and send you a clear quote to approve before we buy.
      - link "Send a Pasabuy request" [ref=e209] [cursor=pointer]:
        - /url: /pasabuy
    - generic [ref=e213]:
      - generic [ref=e217]:
        - paragraph [ref=e218]: Wholesale & Food Service
        - heading "Wholesale supply for cafés and restaurants." [level=2] [ref=e219]
        - paragraph [ref=e220]: Order case packs, whole beans, or pantry staples — pricing and delivery quoted per order after staff review.
      - link "Inquire about wholesale" [ref=e221] [cursor=pointer]:
        - /url: /trade
    - region [ref=e224]:
      - generic [ref=e225]:
        - generic [ref=e226]:
          - generic [ref=e230]: Transparent Operations
          - paragraph [ref=e231]: Good to know
          - heading "Questions, answered honestly." [level=2] [ref=e232]
          - paragraph [ref=e233]: Clear information on stock, payment, expiry dates, delivery, and Italian sourcing.
          - generic [ref=e234]:
            - generic [ref=e235] [cursor=pointer]: Search questions
            - searchbox "Search questions" [ref=e236]
          - generic [ref=e237]:
            - paragraph [ref=e238]: Need an immediate answer?
            - paragraph [ref=e239]: Our Manila team confirms product lots, expiry dates, and courier quotes directly.
            - generic [ref=e240]:
              - link "0931 864 9654" [ref=e241] [cursor=pointer]:
                - /url: tel:09318649654
              - link "Family Pin Italy" [ref=e245] [cursor=pointer]:
                - /url: https://www.facebook.com/FamilyPinItaly
        - generic [ref=e251]:
          - group "FAQ categories" [ref=e252]:
            - button "All" [pressed] [ref=e253] [cursor=pointer]
            - button "Ordering & Stock" [ref=e254] [cursor=pointer]
            - button "Freshness & Dates" [ref=e255] [cursor=pointer]
            - button "Delivery & Pickup" [ref=e256] [cursor=pointer]
            - button "Pasabuy & Flights" [ref=e257] [cursor=pointer]
            - button "Wholesale & B2B" [ref=e258] [cursor=pointer]
          - region "Frequently Asked Questions" [ref=e259]:
            - generic [ref=e260]:
              - button "Ordering & Stock How does your Single Master Inventory work?" [expanded] [ref=e261] [cursor=pointer]:
                - generic [ref=e262]:
                  - generic [ref=e263]: Ordering & Stock
                  - heading "How does your Single Master Inventory work?" [level=3] [ref=e264]
              - region "Ordering & Stock How does your Single Master Inventory work?" [ref=e268]:
                - paragraph [ref=e270]: K2 staff manage products and stock in one master inventory. Only products assigned to Website and eligible for sale appear in our catalog. Marketplace connectors are not yet live, so staff reconcile those sales manually.
            - generic [ref=e271]:
              - button "Ordering & Stock How do payments work and why is confirmation not instant?" [ref=e272] [cursor=pointer]:
                - generic [ref=e273]:
                  - generic [ref=e274]: Ordering & Stock
                  - heading "How do payments work and why is confirmation not instant?" [level=3] [ref=e275]
              - paragraph [ref=e279]: Pay by GCash or MariBank QR before dispatch. Use your order payment details once the final total is ready. Upload your receipt and reference; staff verify the funds. A receipt alone does not confirm payment.
            - generic [ref=e280]:
              - button "Freshness & Dates Are your Italian grocery items really authentic and fresh?" [ref=e281] [cursor=pointer]:
                - generic [ref=e282]:
                  - generic [ref=e283]: Freshness & Dates
                  - heading "Are your Italian grocery items really authentic and fresh?" [level=3] [ref=e284]
              - paragraph [ref=e288]: We source products in Italy and record batch and best-before details as stock is received. Eligible lots follow FEFO (First-Expired, First-Out) rules. Check the reviewed product information and ask staff for the current package dates before confirming your purchase.
            - generic [ref=e289]:
              - button "Freshness & Dates Why do your Milano fragrances say \"inspired scent\"?" [ref=e290] [cursor=pointer]:
                - generic [ref=e291]:
                  - generic [ref=e292]: Freshness & Dates
                  - heading "Why do your Milano fragrances say \"inspired scent\"?" [level=3] [ref=e293]
              - paragraph [ref=e297]: Inspired scents are sold under their own product names. They are not presented as designer-brand originals. Check each listing and package for the reviewed maker, origin and fragrance details.
            - generic [ref=e298]:
              - button "Delivery & Pickup What are your delivery options and can I pick up in Manila?" [ref=e299] [cursor=pointer]:
                - generic [ref=e300]:
                  - generic [ref=e301]: Delivery & Pickup
                  - heading "What are your delivery options and can I pick up in Manila?" [level=3] [ref=e302]
              - paragraph [ref=e306]: You can request Metro Manila express delivery, provincial shipping, or pickup at our Manila hub. Staff confirm the courier, fee, packing and handover arrangements for your order. Submitting a request does not confirm a delivery date. For pickup, wait until staff tell you the order is ready.
            - generic [ref=e307]:
              - button "Delivery & Pickup How are delivery rates calculated?" [ref=e308] [cursor=pointer]:
                - generic [ref=e309]:
                  - generic [ref=e310]: Delivery & Pickup
                  - heading "How are delivery rates calculated?" [level=3] [ref=e311]
              - paragraph [ref=e315]: Standard delivery uses K2’s published regional and package-weight rates. Express delivery requires a staff quote for your actual route and parcel. Any pending delivery fee must be included in your final total before you transfer; a courier estimate is not a confirmed delivery booking.
            - generic [ref=e316]:
              - button "Pasabuy & Flights What is Pasabuy and how do scheduled flights work?" [ref=e317] [cursor=pointer]:
                - generic [ref=e318]:
                  - generic [ref=e319]: Pasabuy & Flights
                  - heading "What is Pasabuy and how do scheduled flights work?" [level=3] [ref=e320]
              - paragraph [ref=e324]: Pasabuy lets you request an item from Italy that is not in our regular catalog. Send a photo, product name, or link. Staff check sourcing, price, freight and the available flight schedule before confirming a quote. The request itself does not reserve stock or guarantee an arrival date.
            - generic [ref=e325]:
              - button "Wholesale & B2B Can restaurants, cafés, or bakeries order at wholesale prices?" [ref=e326] [cursor=pointer]:
                - generic [ref=e327]:
                  - generic [ref=e328]: Wholesale & B2B
                  - heading "Can restaurants, cafés, or bakeries order at wholesale prices?" [level=3] [ref=e329]
              - paragraph [ref=e333]: Restaurants, cafés and bakeries can submit an inquiry through our Wholesale portal or contact us directly. Staff confirm available products, quantities and applicable case or carton pricing. An inquiry does not reserve stock or confirm a wholesale order.
  - contentinfo [ref=e334]:
    - generic [ref=e335]:
      - generic [ref=e336]:
        - generic [ref=e337]:
          - generic [ref=e342]:
            - text: K2 Jimzon
            - generic [ref=e343]: Direct Italian imports
          - paragraph [ref=e344]: Italian goods for homes and businesses in the Philippines. Shop what is in stock or ask us to source something from Italy.
          - paragraph [ref=e345]: Website · Shopee · TikTok Shop · Lazada · Pasabuy
        - generic [ref=e346]:
          - heading "Shop" [level=3] [ref=e347]
          - list
        - generic [ref=e348]:
          - heading "Services" [level=3] [ref=e349]
          - list [ref=e350]:
            - listitem [ref=e351]:
              - link "Request from Italy" [ref=e352] [cursor=pointer]:
                - /url: /pasabuy
            - listitem [ref=e353]:
              - link "Wholesale orders" [ref=e354] [cursor=pointer]:
                - /url: /trade
            - listitem [ref=e355]:
              - link "Browse products" [ref=e356] [cursor=pointer]:
                - /url: /catalog
            - listitem [ref=e357]:
              - button "Review your basket" [ref=e358] [cursor=pointer]
        - generic [ref=e359]:
          - heading "Contact" [level=3] [ref=e360]
          - list [ref=e361]:
            - listitem [ref=e362]:
              - link "Contact us" [ref=e363] [cursor=pointer]:
                - /url: /contact
            - listitem [ref=e364]:
              - link "Call 0931 864 9654" [ref=e365] [cursor=pointer]:
                - /url: tel:09318649654
                - generic [ref=e368]: 0931 864 9654
            - listitem [ref=e371]:
              - link "Email K2 Jimzon" [ref=e372] [cursor=pointer]:
                - /url: mailto:k2jimzonwebsite@gmail.com
            - listitem [ref=e378]:
              - link "Facebook · Family Pin Italy" [ref=e379] [cursor=pointer]:
                - /url: https://www.facebook.com/FamilyPinItaly
            - listitem [ref=e385]:
              - link "Instagram · @kaikiko8" [ref=e386] [cursor=pointer]:
                - /url: https://www.instagram.com/kaikiko8/
            - listitem [ref=e393]:
              - generic [ref=e394]: Manila, Philippines
      - region [ref=e398]:
        - heading "Find our shops" [level=3] [ref=e399]
        - paragraph [ref=e400]: These links open our marketplace shops. Stock and messages there stay in each marketplace until a connector is approved.
        - generic [ref=e401]:
          - generic [ref=e402]:
            - paragraph [ref=e403]: Pasabuy Italy by K2
            - list [ref=e404]:
              - listitem [ref=e405]:
                - link "Lazada" [ref=e406] [cursor=pointer]:
                  - /url: https://s.lazada.com.ph/s.Z777zD?c=x
              - listitem [ref=e409]:
                - link "Shopee" [ref=e410] [cursor=pointer]:
                  - /url: https://s.shopee.ph/9V1fXWQ0gK
              - listitem [ref=e413]:
                - link "TikTok" [ref=e414] [cursor=pointer]:
                  - /url: https://vt.tiktok.com/ZS9Afhgs231Wm-Zj3hN/
          - generic [ref=e417]:
            - paragraph [ref=e418]: Jworldbasket
            - list [ref=e419]:
              - listitem [ref=e420]:
                - link "Lazada" [ref=e421] [cursor=pointer]:
                  - /url: https://s.lazada.com.ph/s.Z77ieU?c=x
              - listitem [ref=e424]:
                - link "Shopee" [ref=e425] [cursor=pointer]:
                  - /url: https://s.shopee.ph/5fowyVvX1R
              - listitem [ref=e428]:
                - link "TikTok" [ref=e429] [cursor=pointer]:
                  - /url: https://vt.tiktok.com/ZS9AfhVYjAJUb-HhBEF/
      - generic [ref=e432]:
        - link "Privacy & Data" [ref=e433] [cursor=pointer]:
          - /url: /privacy
        - link "Terms of Service" [ref=e434] [cursor=pointer]:
          - /url: /terms
        - link "Returns & Replacements" [ref=e435] [cursor=pointer]:
          - /url: /returns
        - button "Analytics choices" [ref=e436] [cursor=pointer]
      - generic [ref=e437]:
        - paragraph [ref=e438]: GCash and MariBank orders are paid before dispatch. Follow your order payment details and upload your receipt for funds verification. Pasabuy requests receive a custom quote.
        - paragraph [ref=e439]: © 2026 K2 Jimzon · Direct Italian imports
        - paragraph [ref=e440]: "Development preview: fallback products and reviews are illustrative. Production displays database-backed published records."
  - navigation "Mobile storefront" [ref=e442]:
    - generic [ref=e443]:
      - link "Home" [ref=e444] [cursor=pointer]:
        - /url: /
      - link "Inventory & Catalog" [ref=e449] [cursor=pointer]:
        - /url: /catalog
        - generic [ref=e452]: Shop
      - link "Pasabuy" [ref=e453] [cursor=pointer]:
        - /url: /pasabuy
      - link "Wholesale" [ref=e457] [cursor=pointer]:
        - /url: /trade
      - link "Contact" [ref=e461] [cursor=pointer]:
        - /url: /contact
  - region "Optional analytics" [ref=e465]:
    - button "Close analytics choices" [ref=e466] [cursor=pointer]
    - heading "Optional analytics" [level=2] [ref=e469]
    - paragraph [ref=e470]: With your permission, Google Analytics helps us understand visits to our public pages. We exclude your search terms, forms and private account or order pages.
    - generic [ref=e471]:
      - button "Accept analytics" [ref=e472] [cursor=pointer]
      - button "Decline" [ref=e473] [cursor=pointer]
    - button "Privacy & Data" [ref=e474] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect,test } from '@playwright/test'
  2  |
  3  | test('secure wholesale inquiry returns only a server receipt and no commercial authority',async({page})=>{
  4  |   let requestBody=null
  5  |   await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**',route=>route.fulfill({contentType:'application/javascript',body:`window.turnstile={render:(_,options)=>{options.callback('verified-test-token');return 1},remove:()=>{}}`}))
  6  |   await page.route('**/api/storefront/wholesale',async route=>{
  7  |     requestBody=route.request().postDataJSON()
  8  |     await route.fulfill({status:201,contentType:'application/json',headers:{'Set-Cookie':'k2_guest_access='+('a'.repeat(64))+'; Path=/; HttpOnly; SameSite=Lax'},body:JSON.stringify({ok:true,receipt:{public_reference:'WI-0123456789ABCDEF',conversation_reference:'CV-0123456789ABCDEF',status:'submitted',created_at:'2026-08-22T08:00:00Z',pricing_approved:false,credit_approved:false,terms_approved:false}})})
  9  |   })
  10 |   await page.goto('/',{waitUntil:'domcontentloaded'})
  11 |   await expect(page.getByRole('main')).toBeVisible({timeout:30000})
> 12 |   await page.getByRole('navigation',{name:'Mobile storefront'}).getByRole('button',{name:'Wholesale'}).click()
     |                                                                                                        ^ Error: locator.click: Test timeout of 45000ms exceeded.
  13 |   await expect(page.getByRole('heading',{name:/Tell us what you need to order/i})).toBeVisible({timeout:15000})
  14 |   await page.getByLabel(/Registered Company Name/i).fill('Launch Test Cafe')
  15 |   await page.getByLabel(/Contact Person Full Name/i).fill('Maria Buyer')
  16 |   await page.getByLabel(/Work Email/i).fill('buyer@example.com')
  17 |   await page.getByLabel(/Mobile.*WhatsApp.*Viber/i).fill('09171234567')
  18 |   await page.getByLabel(/Delivery City.*Area/i).fill('Makati City')
  19 |   await page.getByLabel(/Target Italian Items/i).fill('Coffee beans, 30 units')
  20 |   await page.getByLabel(/I am authorized to make this inquiry/i).check()
  21 |   await expect(page.getByRole('button',{name:'Record Wholesale Inquiry'})).toBeEnabled({timeout:10000})
  22 |   await page.getByRole('button',{name:'Record Wholesale Inquiry'}).click()
  23 |   await expect(page.getByRole('heading',{name:'Inquiry recorded'})).toBeVisible()
  24 |   await expect(page.getByText(/WI-0123456789ABCDEF.*CV-0123456789ABCDEF/)).toBeVisible()
  25 |   await expect(page.getByText(/does not approve a business account, wholesale pricing, stock, credit/i)).toBeVisible()
  26 |   expect(requestBody).toMatchObject({organizationName:'Launch Test Cafe',customerName:'Maria Buyer',deliveryArea:'Makati City',targetItems:'Coffee beans, 30 units',botToken:'verified-test-token'})
  27 |   for(const key of ['pricingApproved','creditLimit','termsApproved','customerId','organizationId','registrationNumber']) expect(requestBody).not.toHaveProperty(key)
  28 |   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
  29 | })
  30 |
```
