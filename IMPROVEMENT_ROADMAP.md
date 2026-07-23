# K2 Jimzon — Roadmap to a Fully Functional Storefront + Omnichannel BOS

**Goal:** turn the current prototype (complete UI, complete DB schema, mostly-mocked logic) into a live storefront and back-office that syncs inventory and orders across **Shopee, Lazada, TikTok Shop**, and the website — with **one unified inbox** for social media, marketplace chat, and storefront messages.

**Current reality:** the storefront checkout and product/stock sync to Supabase work. Everything marketplace- and messaging-related is UI + database tables only. There are **no Supabase Edge Functions**, so nothing yet talks to any external channel. This roadmap is ordered so each phase unblocks the next.

---

## Phase 0 — Foundation (blocks everything else)

The integrations can't be built until the platform has a real backend layer and clean data.

- **Build the Edge Function layer.** `FUTURE_INTEGRATIONS.md` specifies it but none exists. Stand up `supabase/functions/` with a shared auth/secret-verification helper, structured logging, and a retry/queue pattern. This is the single biggest missing piece.
- **Add a channel-mapping table.** Create `channel_listings` linking one master `sku` to each platform's own listing ID (shopee_item_id, lazada_sku_id, tiktok_product_id, website). Without this, no cross-channel sync is possible.
- **Fix the products schema drift.** Migration 0002 defines `title/retail_price/vip_price/total_stock` but the app queries `srp/wholesale_price/stock_available/name` (added later in 0003). Consolidate to one canonical schema and remove the duplicate `0007` migration numbers (`0007_scan_receive` + `0007_unified_inbox`) to avoid ordering ambiguity.
- **Real authentication + roles.** Admin/VIP gating currently trusts `user_profiles.role` with permissive RLS (`USING (true)`). Lock down RLS so only true admins can read orders/messages/customers, and add a proper admin login gate on the whole `/admin` BOS.
- **Move all secrets server-side.** Marketplace API keys, webhook secrets, and messaging tokens must live in Edge Function env vars / Supabase Vault — never in the Vite client bundle.
- **Idempotency + sync log.** Add a `sync_events` table and idempotency keys so a re-delivered webhook or a retried stock push never double-counts an order or oversells.

---

## Phase 1 — Marketplace integrations (Shopee / Lazada / TikTok Shop)

Build these one channel at a time; the pattern repeats. Target: **inventory is one source of truth, orders flow in automatically, stock pushes out automatically.**

### Inbound orders (webhooks)
- Edge Function per channel (`/shopee-webhook`, `/lazada-webhook`, `/tiktok-webhook`) that **verifies the signature**, maps the channel listing ID → master SKU, and inserts into `orders` with the correct `channel_source`. New orders then appear live on the Pack & Ship Kanban (realtime is already wired).
- Extend the `channel_type` enum — it currently only has Shopee/website/b2b. Add `lazada`, `tiktok_shop`, and however many Shopee/Lazada shops exist.

### Outbound inventory sync
- Postgres trigger on `products.stock_available` fires a database webhook → Edge Function pushes the new count to **every** linked channel via their stock-update APIs. This is what actually prevents overselling across marketplaces.
- Handle the reverse too: when an order comes in from Shopee, decrement master stock and push the reduced count to Lazada/TikTok/website so they can't sell the same unit.

### OAuth + token lifecycle
- Each marketplace uses OAuth with refreshable tokens (Shopee/Lazada partner APIs, TikTok Shop Open Platform). Build a token store + auto-refresh job; expired tokens are the #1 cause of silent sync failure.

### Catalog & fulfillment sync
- Push new/edited products (price, title, images, batch/best-before) from the Product Master out to each channel, respecting per-channel category and attribute requirements.
- Pull fulfillment/tracking status back in (shipped, delivered, returned) so the Kanban reflects marketplace-side state, not just website orders.
- Reconcile pricing: the app already models retail vs. VIP/wholesale — extend to per-channel price overrides (marketplace fees differ).

### Rate limits & failure handling
- Add a job queue (pg-boss / Supabase cron + a `jobs` table) so bulk stock pushes respect each API's rate limits and failed calls retry with backoff instead of dropping silently. Surface sync health in the BOS ("Shopee sync: Auto" is currently a static label).

---

## Phase 2 — Unified messaging control (the one inbox)

The Inbox UI exists and `conversations`/`messages` tables exist, but the frontend still reads in-memory seed data and nothing connects to any messaging API.

- **Wire the Inbox to the database.** Replace `INITIAL_CONVERSATIONS` in `StoreContext` with live reads from the `conversations`/`messages` tables + realtime subscription, so messages persist and sync across devices.
- **Inbound message webhooks** (Edge Functions) for every channel into the same two tables:
  - **Meta Graph API** → Facebook Messenger + Instagram DMs + WhatsApp Business.
  - **Viber** Business Messages.
  - **TikTok, Shopee, Lazada in-app chat** (each marketplace has its own buyer-message API) — this is what makes it *truly* omnichannel rather than just social.
  - **Storefront chat** — the `ChatFab` on the website should create a conversation in the same inbox.
- **Outbound replies.** When an admin sends from the Inbox, route the reply back out through the correct channel's send API based on `conversation.platform`. Respect platform rules (e.g. WhatsApp's 24-hour customer-service window / template messages).
- **Extend the platform enum.** `chat_platform` is only `WhatsApp/Viber/Messenger` — add Instagram, TikTok, Shopee, Lazada, Website.
- **Unify customer identity.** Same buyer messaging on Viber and buying on Shopee should thread to one customer record. Add a `customers` table keyed across channel handles.
- **Assignment, status, and SLA.** Conversation ownership (who's handling it), open/pending/resolved already in schema — add unread counts, assignment, canned replies, and response-time tracking.

---

## Phase 3 — AI layer (already scaffolded in the UI)

- **AI catalog parsing.** The Scan-to-AI / Smart-Paste / AI-Drafts screens exist but do nothing. Wire an Edge Function that streams supplier PDFs/photos to a vision model, returns structured product JSON, and drops it into the Pending AI Products queue as `Draft`.
- **AI reply copilot.** "Ask AI to help reply" in the Inbox should call an Edge Function that pulls the last N messages + relevant product/order context and drafts a reply for admin approval (`is_draft` flag already in the messages schema).
- **Guardrails.** Human-in-the-loop approval before any AI product goes Live or any AI reply sends.

---

## Phase 4 — Storefront completion (revenue-blocking gaps)

- **Real payments.** Checkout inserts an order but there's no payment capture. Integrate a PH gateway (PayMongo / Xendit / GCash / Maya / cards) with server-side verification before an order is marked `Paid`.
- **Real customer accounts & order history.** Orders have no `user_id` link (noted in the migration comments). Add it so customers can log in and see their orders, and so RLS can scope "my orders."
- **Shipping & fulfillment.** Integrate a courier/rates layer (Lalamove, J&T, LBC) for real delivery quotes and tracking, instead of the static `fulfillment_method` strings.
- **Address, tax/VAT, and invoicing** for both retail and wholesale/B2B.
- **Transactional email/SMS** (order confirmation, shipping updates) — currently confirmation is UI-only.
- **Wholesale/VIP flow end-to-end:** application → admin approval → tier pricing unlocked → self-serve reordering. The pieces exist but aren't connected.
- **Pasabuy request lifecycle:** requests are in-memory. Persist them, route to the inbox, let admins quote → convert quote to order.
- **SEO/perf/a11y:** the 3D globe (Three.js) is heavy — lazy-load and gate on `prefers-reduced-motion` (design already asks for this); add real meta/OG tags via the `react-helmet-async` already installed.

---

## Phase 5 — Operations & reporting (BOS depth)

- **Purchase orders → receiving → stock.** The "Mark as Arrived" flow should atomically increment master stock and trigger the outbound sync to all channels.
- **Batch / best-before tracking.** The brand promise is printed dates and no near-expiry stock — model batches per SKU with expiry, FEFO picking, and near-expiry alerts. This is core to the value prop, not a nice-to-have.
- **Unified analytics.** Real KPIs (the dashboard shows a hardcoded `₱41,260`): revenue by channel, margin, best sellers, stockouts, sync error rate.
- **Notifications.** A `notifications` table exists (migration 0005) but the bell is a fake badge — wire real low-stock / new-order / new-message alerts.
- **Audit log.** Migration 0004 exists — surface it in the BOS for accountability across admin actions.

---

## Phase 6 — Deployment, reliability, and hygiene

- **CI/CD.** No pipeline exists. Add GitHub Actions: install → lint → build → run Playwright tests → deploy to Vercel on green.
- **Lint/typecheck gate.** No ESLint/TS config. Add one; consider migrating to TypeScript for the Edge Functions and data layer at minimum.
- **Error monitoring.** No Sentry or equivalent — add it to both frontend and Edge Functions.
- **Environment separation.** Distinct Supabase projects/branches for dev / staging / prod so marketplace webhooks can be tested without touching live inventory.
- **Repo cleanup.** Remove ad-hoc debug scripts from root (`temp.txt`, `webhook_real.cjs`, `screenshot.cjs`, `pd_hist.txt`, etc.); add a real README with setup + deploy + integration docs.
- **Commit the working tree.** ~26 modified files are uncommitted on `main` — reconcile what's deployed vs. local before building further.
- **Secrets audit.** Confirm no live keys land in the client bundle once real integrations are added.

---

## Suggested build order (dependency-first)

1. Phase 0 foundation (Edge Function layer, channel-mapping table, schema/RLS fixes, secrets).
2. **One** marketplace end-to-end (Shopee first — the app already assumes it) → inbound orders + outbound stock sync.
3. Wire the Inbox to the DB + **one** messaging channel (Meta/WhatsApp) end-to-end.
4. Real payments on the storefront (unblocks actual revenue).
5. Replicate the marketplace pattern for Lazada, then TikTok Shop.
6. Add remaining messaging channels (Viber, IG, marketplace chats, website chat) to the unified inbox.
7. AI layer, batch/expiry tracking, analytics, CI/CD, monitoring.

The theme throughout: **the UI is largely done — the work is the server-side integration layer and making one source of truth real.**
