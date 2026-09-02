# K2 Jimzon Interactive Shop — Product & Experience Concept

## Executive Summary

K2 Jimzon can add an optional **Interactive Shop Mode** without replacing the existing storefront.

The concept takes inspiration from the behavior of a sari-sari store or neighborhood specialty shop:

- products live visibly on shelves
- users browse by switching shelves/categories rather than walking in a full 360° world
- a K2 avatar/shopkeeper sits at the center of the experience
- clicking a product lets users buy, read common questions, or ask K2 staff
- product-specific FAQs answer common questions instantly
- uncommon questions go to live staff
- useful staff answers can later become approved FAQs
- those FAQs also enrich normal product pages and support long-tail SEO
- unavailable products naturally flow into Pasabuy

**Core principle:** the interactive shop is another interface into the existing K2 commerce system — not a second ecommerce system.


---

## 1. Normal Store vs Interactive Shop

### Normal Store
The standard K2 storefront remains the fastest path:

`Home → The Cabinet / Catalog → Product → Add to Bag → Review Order Request`

### Interactive Shop
Users may optionally choose **Enter the Store**.

Instead of a standard product grid, they see a controlled digital K2 shop with shelves for Coffee, Pantry, Sweets, Beauty, New Arrivals, and Pasabuy.

The user does not need to walk. They can use:
- Previous Shelf / Next Shelf
- category selectors
- direct product clicks
- Ask K2 Staff

Transitions can move the viewpoint between shelves so the store still feels spatial.


---

## 2. Why Shelf-Based Navigation Beats Full 360° for V1

A full 360° store is visually impressive but creates:
- mobile camera-control problems
- heavier performance cost
- accessibility challenges
- more 3D asset work
- longer build time
- greater risk of users getting lost
- slower shopping

The shelf-based approach keeps most of the magic while removing most of the friction.

This should feel like being **inside K2**, without forcing users to play a game just to buy coffee.


---

## 3. K2 as the Digital Shopkeeper

K2 sits at the center of the experience as a lightweight stylized shopkeeper/avatar.

Possible behaviors:
- subtle idle motion
- turns or points toward the selected shelf
- reacts when something is added to the basket
- indicates when staff is online
- opens product questions or staff chat

Do not begin with a realistic AI human, lip sync, voice assistant, or complex 3D NPC.

K2's role is simple: **there is someone here to help you.**


---

## 4. Product Interaction

Clicking a shelf item brings the product forward.

Example:

**LAVAZZA CREMA E GUSTO**  
₱XXX  
Strong · Full-bodied  
Available in Manila

Actions:
- **Add to Basket**
- **Common Questions**
- **Ask K2 Staff**
- **Full Product Details**

The user can buy, learn, ask, or leave for the standard product page.


---

## 5. Product FAQs — Primary Knowledge System

Instead of using a generative AI for every customer question, each product gets a curated FAQ section.

Example:

**Is this strong or mild?**  
Strong and full-bodied.

**Can I use this in a moka pot?**  
Yes, when this has been verified for the product.

**What does it taste like?**  
Verified tasting information.

**Where is it made?**  
Verified origin.

**How should I store it?**  
Verified storage instructions.

**What is the current best-before date?**  
Read from the current inventory record.

Recommended starting point: **4–8 genuinely useful FAQs per product.**


---

## 6. Static Knowledge vs Live Data

### Static / semi-static knowledge
Suitable for FAQs:
- taste
- roast / intensity
- preparation method
- ingredients
- allergens
- origin
- pairings
- packaging
- manufacturer information
- storage instructions
- certification explanations

### Live data
Always query the current database for:
- price
- stock
- batch
- best-before
- current arrival
- availability

Do not save changing values as permanent FAQ text.


---

## 7. Truth Rule

K2 must never invent product or operational information.

**Verified value exists → show it.**  
**Verified value does not exist → do not guess.**

Never fabricate:
- expiry
- batch
- stock
- origin
- certifications
- allergens
- preparation compatibility
- shipment details
- storage conditions
- supplier information

If K2 does not know:

> “We don’t have a verified answer for that yet.”

Then offer **Ask K2 Staff**.


---

## 8. Live Staff Chat

If FAQs do not answer the question, the user can open live chat.

The chat must preserve product context automatically.

Staff should receive:
- product name
- product ID
- current page / shelf
- user's question

Example:

Customer is asking about: **Lavazza Crema e Gusto**  
Question: “Pwede ba ito sa French press?”

The user should never have to explain which product they mean again.


---

## 9. Staff Online / Offline Behavior

### Staff Online
Show:
`● K2 staff is online`

User can send the question and receive a normal live response.

### Staff Offline
Show:
> K2 staff is currently offline. Leave your question and we’ll reply when someone is available.

Possible later reply destinations:
- K2 customer inbox
- email
- account notification
- external messaging integration

Do not promise immediate responses when staff is unavailable.


---

## 10. Customer Question → FAQ Learning Loop

This is one of the strongest parts of the system.

Flow:

`Customer asks unknown question → Staff answers → Conversation resolves → Save as FAQ? → Review/Edit → Approve → Publish`

Example:

Customer asks:  
“Pwede ba ito sa French press?”

Staff answers.

Afterward staff gets:
- Approve FAQ
- Edit
- Ignore

If approved, the next customer gets the answer instantly.

Do not auto-publish live-chat answers without staff review.


---

## 11. Repeated-Question Intelligence

K2 can count recurring questions internally.

Example:

- 12× “Pwede ba moka pot?”
- 9× “Matapang ba ito?”
- 7× “May nuts ba?”
- 5× “Okay ba sa bata?”
- 4× “Pwede French press?”

This tells K2 what information customers actually need.

The knowledge base should grow from **real customer behavior**, not from guessing hundreds of questions in advance.


---

## 12. SEO Benefit

Product FAQs enrich the normal product pages with useful long-tail content.

Example search relevance:
- Lavazza Crema e Gusto moka pot
- Lavazza Crema e Gusto strong
- Lavazza Crema e Gusto taste
- Lavazza Crema e Gusto Philippines
- Lavazza Crema e Gusto ingredients
- Lavazza Crema e Gusto expiry

Guardrails:
- do not keyword-stuff
- do not create fake customer questions
- do not generate unsupported answers
- do not duplicate identical FAQs across every product
- every FAQ must answer a real customer concern

The standard product pages remain the main SEO surface; the interactive mode is another interface into the same product entities.


---

## 13. Product Page Integration

The same FAQ system must appear on the standard product page.

Suggested structure:

**Product Details**  
**Product Passport**  
**Common Questions**  
**Ask K2 Staff**

There should be one knowledge source shared between:
- normal storefront
- interactive shop
- staff tools

No duplicate FAQ system.


---

## 14. Product Passport Integration

Product Passport remains the verified proof layer.

Possible conditional fields:
- Origin
- Arrival
- Batch
- Best Before
- Manila Stock

Rules:
- only verified values appear
- missing fields are hidden
- live values come from current inventory data
- no inferred or decorative filler


---

## 15. Pasabuy Integration

If a product is unavailable or a search returns no match:

Do not end with **0 products found** or **Sold Out**.

Instead:

> We don’t have that in Manila stock right now. Want us to look for it in Italy?

CTA: **Request from Italy**

Prefill the Pasabuy form with any available:
- product name
- search term
- product ID / SKU
- URL
- quantity
- customer context


---

## 16. Basket / Counter

Interactive Shop Mode can turn the cart into a physical-feeling basket or counter.

Example:

**YOUR BASKET**
- Lavazza Crema ×1
- Mutti Passata ×2
- Pan di Stelle ×1

K2 will confirm:
- current stock
- delivery
- final payment details

CTA: **Send Order Request**

This fits K2's human-confirmation model better than a generic instant-payment checkout metaphor.


---

## 17. Same Backend, Different Interface

Interactive Shop Mode must reuse the same:
- product database
- categories
- prices
- stock
- images
- cart
- accounts
- Pasabuy
- checkout/request flow
- FAQs
- live chat
- staff tools

Architecture:

`K2 Commerce Data → Normal Storefront + Interactive Shop → Same Backend`

The interactive mode is only a new presentation layer.

### 28 August 2026 implementation decision — synchronized guide layer

The owner approved a hybrid presentation rather than choosing between a 2D
companion and a spatial clerk. One derived store moment coordinates both:

- the 2D avatar pops out over the room, can be tucked away, explains the active
  shelf/product, and owns the accessible real-person question form;
- one 3D clerk moves only among authored scene bays and mirrors the same moment
  through wave, point, present, and celebrate gestures;
- the wood-and-canvas basket dock is a physical view of canonical cart lines,
  quantity, and subtotal, with no second cart state;
- welcome, explore, inspect, and confirmed-add moments may adjust restrained
  ambient light and parcel feedback without delaying an action;
- phones start with the guide tucked and use a compact basket; reduced motion
  preserves both functions while removing walking, pop, drift, wave, and parcel
  animation.

This decision keeps the store playful while preserving the controlled-scene,
single-backend, human-confirmation, and semantic-fallback contracts above.


---

## 18. Suggested Interactive Shop Scenes

V1 can use five controlled scenes:

1. **Counter / Overview**
2. **Coffee & Drinks**
3. **Pantry**
4. **Snacks & Sweets**
5. **Beauty / Personal Care**

Optional additional scene:
- **New Arrivals**

Always provide obvious navigation:
- Previous Shelf
- Next Shelf
- direct category controls

Do not require free camera navigation.


---

## 19. Mobile Version

Mobile should preserve the concept without recreating desktop spatial complexity.

Example:

**K2 INTERACTIVE SHOP**

[ Coffee Shelf Visual ]

Coffee & Drinks

[ Lavazza ] [ Illy ] [ Kimbo ]

`← Pantry`   `Sweets →`

**Ask K2 Staff**

Use animated scene changes rather than 3D walking.


---

## 20. Accessibility & Performance

Interactive mode must preserve:
- normal tap/click controls
- keyboard access on desktop
- semantic buttons
- visible focus states
- sufficient contrast
- text alternatives
- reduced-motion support
- accessible FAQ accordions
- accessible chat labels

The visual shelf must never be the only way to access a product.

Performance rule:
**Do not load the interactive experience until the user chooses Enter the Store.**

Prefer:
- lazy loading
- optimized images
- CSS transforms
- lightweight 2.5D scenes
- limited animation

Only use Three.js where it materially improves the experience.


---

## 21. Optional Future AI Layer

Generative AI is not required for V1.

Later, K2 could understand a request such as:

> “Ate gusto ko coffee na matapang pero hindi sobrang bitter, pang moka pot sana.”

Future flow:
1. interpret preference
2. query current inventory
3. read verified product facts
4. rank suitable products
5. move the shop to Coffee
6. highlight 2–3 recommendations
7. answer conversationally

If AI is added, use deterministic systems first:

`navigation → normal code`  
`known FAQ → stored answer`  
`price/stock/batch → database`  
`unknown complex question → AI or staff`

AI should be an optimization, not a dependency.


---

## 22. Suggested Product FAQ Data Model

Conceptual fields:

- faq_id
- product_id
- question
- answer
- category
- keywords
- answer_type
- source
- verified_by
- verified_at
- is_active
- display_priority
- times_opened
- times_helpful
- created_from_chat

Possible `answer_type` values:
- static
- live_stock
- live_price
- live_best_before
- live_batch
- staff_only


---

## 23. Suggested Live Chat Context Model

Conceptual fields:

- conversation_id
- customer_id / guest_id
- product_id
- product_name
- current_view
- category
- question
- staff_status
- created_at
- resolved_at
- converted_to_faq

The purpose is to preserve context automatically.


---

## 24. Visual Direction

The experience should feel:
- warm
- tactile
- Italian
- neighborhood-shop friendly
- curated
- human
- premium without becoming sterile luxury

It should not feel like:
- metaverse
- game lobby
- generic 3D showroom
- cyberpunk shop
- cartoon sari-sari parody

The sari-sari inspiration is about **interaction behavior**, not literally copying the visual appearance of a Philippine sari-sari store.

The visual language must remain unmistakably K2.


---

## 25. Recommended Development Phases

### Phase 1 — Product FAQ System
- product FAQs
- FAQ admin/editing
- live-value answer types
- product-page display
- Ask K2 Staff CTA
- product context

### Phase 2 — Live Staff Chat
- staff online/offline status
- product-context conversations
- message persistence
- offline question queue
- resolved status

### Phase 3 — FAQ Learning Loop
- convert chat answer to FAQ draft
- approval workflow
- repeated-question analytics
- helpful/not-helpful feedback
- FAQ popularity ordering

### Phase 4 — Pasabuy Integration
- zero-search → Pasabuy
- out-of-stock → Pasabuy
- product/search prefill
- context preservation

### Phase 5 — Interactive Shop MVP
- Counter
- Coffee
- Pantry
- Sweets
- Beauty
- K2 avatar
- product popup
- Add to Basket
- Common Questions
- Ask K2 Staff
- Product Details
- Pasabuy

### Phase 6 — Interactive Polish
- richer shelf transitions
- subtle avatar reactions
- animated basket
- arrivals shelf
- counter checkout
- packaging/reveal interactions

### Phase 7 — Optional AI Shopkeeper
Only when real usage justifies the complexity and cost.


---

## 26. Non-Goals for V1

Do not build initially:
- full 360 free-roaming store
- VR
- metaverse
- multiplayer
- complex 3D physics
- generative voice shopkeeper
- lip-sync avatar
- large RAG system
- AI answering every question
- separate interactive inventory
- separate checkout
- fake product knowledge
- dozens of generated FAQs per product


---

## 27. Core Strategic Advantage

The differentiator is not the virtual shelf alone.

The distinctive K2 experience comes from combining:

**physical-feeling shelf discovery**  
+ **verified product knowledge**  
+ **human staff fallback**  
+ **Pasabuy**  
+ **product proof**

The interactive store should feel like entering a small specialty importer where someone actually knows the products.


---

## 28. Final Experience Principle

K2 does not need to simulate reality perfectly.

It should capture the behavior of a real neighborhood store:

`Look around → notice something → pick it up → read common questions → ask the shopkeeper if needed → buy`

And when K2 does not know something:

> **K2 does not guess. K2 retrieves, shows verified information, or asks a human.**


---

## Final Product Definition

### K2 Interactive Shop

> **An optional navigable digital specialty store where products live on shelves, users browse spatially, common questions are answered through verified product FAQs, specific questions can be sent to live K2 staff, unavailable items flow naturally into Pasabuy, and real customer questions continuously improve the product knowledge base and SEO.**

It is:
- not a replacement for normal shopping
- not dependent on generative AI
- not a second ecommerce backend
- not a game

It is simply:

> **a new interface for the same K2 store.**
