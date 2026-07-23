# K2 Jimzon — Pre-Deployment TODO

Running list of things intentionally deferred so we don't forget them before / after launch.
Last updated: 2026-07-23.

## Deferred on purpose (do later)

- [ ] **Payment integration.** Checkout (`src/views/Checkout.jsx`) uses a *simulated* QR — the code is a mock, not a scannable QR, and `placeOrder` just writes a `Pending` / `Unpaid` order. Wire a real GCash/Maya/QR-Ph or gateway later.
- [ ] **Real order history in "My Account."** The Orders tab in `src/components/CustomerProfileModal.jsx` is commented out (was showing mock orders). Orders now carry `customer_email`, so it can be queried per signed-in buyer. Re-enable = uncomment the one tab line + swap `mockOrders` for a Supabase query.
- [ ] **Category mapping for live products.** The storefront derives a product's category from an `origin` string hack (`src/context/StoreContext.jsx` merge). The real `products` table uses `category_id` (UUID) + `subcategory`. Live products may not land in the right category tile until this is mapped to the real `categories` table.
- [ ] **Newsletter backend.** `src/components/home/Newsletter.jsx` only flips to a "done" state — emails aren't stored anywhere. Wire to a `subscribers` table (or email tool) later.
- [ ] **Checkout customer/shipping form.** Checkout collects no name/address/contact, so guest orders save as "Website Guest." Add a form if we want real customer + delivery details on every order.

## Kept as-is on purpose

- **Mock product content** (`src/data/products.js`) is intentionally the visualization / fallback layer. Live Supabase data overrides it where present; mocks fill the gaps so the site always looks complete.

## Cleanup (safe, low priority)

- [ ] **Delete dead code:** `src/views/ProductDetail.jsx` is superseded by `MasterProduct.jsx` and is no longer reachable.

## Schema notes (source of truth = live Supabase, project `pixplcjqivlfflickobf`)

- Repo `supabase/migrations/*` and `seed-database.js` had drifted from the live DB. The live schema is authoritative: `products` use `name` / `srp` / `wholesale_price` / `stock_available`; `orders` now have `customer_name` / `customer_email` / `total_amount` (added via `20260723_orders_customer_fields.sql`).
- Seed/sim scripts and all product read/write code were realigned to these real columns.
