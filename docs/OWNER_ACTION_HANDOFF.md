# Owner action handoff — things Claude cannot do from this workstation

Written 29 August 2026. This is the list of work that is **blocked on account
access or on an owner decision**, separated from work that can be finished in
the repository. It exists so the blocked items can be done in one sitting
instead of being rediscovered each session.

Everything here was verified, not assumed. Where a claim could not be checked,
it says so.

---

## Why these are blocked

The Claude session is signed in as **`jerzelguerra26@gmail.com`**. The K2
production systems are owned by **`k2jimzonwebsite@gmail.com`**. Verified this
session:

| Connector | What it can actually see | K2 reachable? |
| :--- | :--- | :--- |
| Supabase | one project, `ScoutIT` (`yyixsuaimdzyiocswcgc`) | **No** — `pixplcjqivlfflickobf` is not visible |
| Vercel | team `edgerzxc's projects` (hobby): `scout-it`, `scoutit` | **No** — neither K2 project is present |
| Gmail / Drive / Calendar | the `jerzelguerra26` mailbox and drive | **No** — wrong account; deliberately unused for K2 |

Re-authorizing those connectors under the K2 account (claude.ai → connector
settings) would remove the access barrier for most of section 1. It would
**not** remove the authorization barrier in section 0 — that is a decision, not
a permission.

**One correction, found while working.** The *connectors* cannot reach K2, but
the git-ignored `.env.local` does hold a working owner-held **read-only**
Management API token for the K2 Supabase project. `npm run evidence:map024-catalog`
uses it and successfully re-read the live catalog on 29 August 2026. So
read-only inspection of the K2 database **is** possible from this workstation;
writes, DDL, deployments, and everything in sections 2 to 4 are not.

**Never send a credential, passphrase, connection string, or token through
chat.** Every item below is written so it can be done without doing that.

---

## 0. The live exposure — do this first

`OWNER_QUESTIONS.md` records, from a real audit of the live database:

> today an unauthenticated visitor can write to catalog tables and the product
> image bucket

Specifically: the anonymous role holds write privileges on `brands`,
`categories`, `warehouses`, `product_drafts`, and `products_old`; their RLS
policies are blanket `ALL USING(true)` rules that restrict nothing; and the
`product-images` bucket carries "Anyone can upload / update / delete" with no
size limit and no MIME allowlist.

The fix is written, rehearsed, and rolled back cleanly against the live schema.
It has never been applied. **This is an open hole in production, not a queued
improvement.** Everything else in this document is less urgent than closing it.

---

## 0b. The catalog is empty in production

From the real database projection taken 28 August 2026: **27 products, all
`status: Live`, none with `published = true`, none with any image.**

The storefront filters on `published = true`, so production currently shows an
empty catalog — nothing listed, nothing buyable, no products on the Interactive
Shop shelves. Publication is gated on a primary photo, and no product has one,
which is very likely the whole cause.

**Do:** load product photography, publish the catalog from the admin, then run
`npm run evidence:map024-catalog` and rebuild so the sitemap picks up the
product URLs. The Store Assets screen ranks which products to work on first.

Nothing else in this document matters commercially until this is done. Search
configuration, social cards, and channel connectors all point at a shop with
nothing in it.

*Confirmed by a live read on 29 August 2026 via `npm run evidence:map024-catalog`.*

---

## 1. `OWNER-005` — one owner confirmation left, then the migration can run

This is **not** awaiting authorization. The owner authorized it on 26 August,
the encrypted production backup was created on 27 August, and the database and
Storage restores both verified. The remaining gate is recovery custody, not a
new migration-authorization decision.

The named database and Storage backups, isolated restores, owner-only Drive
copy, all eight retrieval/checksum checks, whole-archive reassembly, and a
retrieved database-envelope decryption check are verified. Only the owner's
account-level recovery-access confirmation remains.

### Completed evidence — no owner action remains here

On 28 August 2026 the owner downloaded the **67,108,864-byte first Storage
chunk** from Drive. Its SHA-256 matched:

```
47BB9160986C5C306C9026171FCC1DB1C4C92A8CA8C40902C410AE04F26FA350
```

Reassembling it with part 002 also matched the original encrypted archive
digest. On 30 August 2026 an authenticated owner Drive session retrieved the
named database envelope and the fail-closed validator successfully decrypted
and authenticated it using the locally retained passphrase without logging the
secret. These checks are already recorded in `OWNER_QUESTIONS.md`, the database
recovery runbook, and `MASTER_ACTION_PLAN.md`; do not repeat them.

### 1a. Confirm durable owner recovery access

This account-level confirmation is still pending, which is why the guarded
executor refuses. Retrieval and decryption on the current recovery workstation
are already proven. The owner must now confirm all three remaining custody and
account-recovery facts:

- the backup passphrase is retained in the approved password manager;
- a separate offline copy is retained; and
- Google 2-Step Verification recovery email and phone are current.

Record only the confirmation and date in `OWNER_QUESTIONS.md`; never record the
passphrase, recovery email, or phone value.

### 1b. Then run the guarded apply

Once 1a is recorded as verified, the executor stops refusing. It
independently re-checks the project ref, the artifact SHA-256, the backup
evidence ID, the ledger version, and the findings count before it will proceed —
so a mistake in the recorded evidence stops it rather than being carried through.

> **Note on credentials:** a previous attempt failed because the local
> `.env.local` entries were the literal instructional placeholders rather than
> real values. The validator caught it and created nothing. The real Session
> pooler URI and a distinct, randomly generated, password-manager-held
> passphrase go **only** into the git-ignored `.env.local`, as
> `K2_PRODUCTION_DATABASE_URL` and `K2_BACKUP_PASSPHRASE`.

---

## 2. Vercel — needs the K2 Vercel account

| # | Action | Why |
| :--- | :--- | :--- |
| 2a | Confirm `VITE_GUEST_BFF_ENABLED` and `VITE_ADMIN_BFF_ENABLED` on both projects | Gate the customer chat and every admin command. Their deployed values are **unverified**; no connected behaviour can be claimed until they are read. |
| 2b | Confirm the server-side switch was enabled on preview and denial-tested **before** the browser switch | The deployment runbook requires this order. |
| 2c | Deploy a preview and capture real response headers, the SPA rewrite, and the function inventory | The only way to prove the deployment config is actually consumed. Local suites read the JSON directly and cannot prove this. |
| 2d | Record both project IDs, their env sets, and a rollback deployment ID | Needed before any promotion. |

Project IDs named in `vercel.ts`: storefront `prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL`,
admin `prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x`.

**30 August access correction:** the Vercel connector currently authenticated in
Codex is attached to team `team_hWRb9j8WjUJshQqZuBkAOTFz` and exposes only
`scout-it`, `mission-control`, and `receipt-auditor-app`. It cannot see either K2
project ID above and must not be used to deploy or certify K2. Reconnect the K2
owner/team before steps 2a–2d. A fresh public check confirms both K2 roots still
serve the old 1,268-byte shell, crawler paths still return HTML, and both BFF
start paths return 404; no local correction is live yet.

---

## 3. Search, discovery, and DNS — needs the K2 Google account and the registrar

| # | Action | Notes |
| :--- | :--- | :--- |
| 3a | Verify `www.k2jimzon.com` in Google Search Console | Prefer **DNS TXT** — it survives host changes and adds no public file. Record which method was used. |
| 3b | Verify in Bing Webmaster Tools | Optional but cheap once 3a is done. |
| 3c | Submit the sitemap once it is deployed | I can generate and wire it; submitting needs the console. |
| 3d | Decide on analytics, then provision it | Nothing currently measures production. This may be a paid service — an owner call. |
| 3e | Provide a CSP violation reporting endpoint | Without it the Report-Only policy collects nothing and the staged rollout cannot finish. May be a paid service. |
| 3f | Enable HSTS **after** every host is proven HTTPS-only | Deliberately withheld today. Do not add `preload` without a separate decision — it is very hard to reverse. |

---

## 4. Marketplace and social portals — needs the K2 seller accounts

For each of Shopee, Lazada, TikTok Shop:

1. Register the K2 developer application on the open platform.
2. Record the **exact shop ID for every K2 shop** on that marketplace — the
   model is two shops per marketplace, so one ID is not enough.
3. Capture the approved API scopes. A scope K2 was not granted is a capability
   K2 does not have.
4. Set the named secrets in **Supabase Edge Function settings only**.

Required secret names, already listed in the admin Channel Readiness screen:

- Shopee — `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY`, `SHOPEE_SHOP_ID`
- Lazada — `LAZADA_APP_KEY`, `LAZADA_APP_SECRET`, `LAZADA_SELLER_ID`
- TikTok — `TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET`, `TIKTOK_SHOP_ID`

> A marketplace key placed in a `VITE_` variable is compiled into the public
> browser bundle. That is a leak. Rotate any credential that has ever appeared
> in a chat, ticket, or screenshot.

Social messaging (Messenger, Instagram, WhatsApp, Viber, TikTok) requires Meta
and provider app review before any adapter can exist. Until then those channels
are answered in their own apps, and must not be marked connected.

---

## 5. Owner decisions — no account required, only a decision

| # | Decision | Blocks | Why it cannot be deferred |
| :--- | :--- | :--- | :--- |
| 5a | **The oversell rule.** When a marketplace sale and a website sale race for the last unit, does K2 oversell and apologise, or under-list and protect the account rating? | MAP-028 D5, and channel two | This is the defining failure mode of multi-channel retail. Marketplace accounts are penalised for cancellations in ways that are slow and expensive to recover. |
| 5b | **Shop identity on orders.** Must an order record *which* K2 shop it came from? | MAP-028 D1, MAP-026 | `order_requests.channel_source` is a fixed six-value list with no shop dimension. Shop identity cannot be backfilled onto orders that never carried it — it would be guesswork. |
| 5c | **Product page metadata strategy.** Prerender product routes, or accept that shared links show homepage metadata? | MAP-028 B5 | Social crawlers do not run JavaScript. Today every shared product link gets the homepage title and a canonical pointing at `/`. |
| 5d | `OWNER-002` reservation hold duration | MAP-023 | Still open from the existing register. |
| 5e | `OWNER-003` wholesale tiers and minimums | MAP-019 / MAP-023 | Still open. |
| 5f | `OWNER-004` monitored public contact numbers | Contact page | Still open. |
| 5g | `OWNER-006` customer retention and deletion policy | MAP-019 | Still open. |

---

## What is *not* blocked

For contrast, so this list is not mistaken for the whole project. All of the
following can be finished in the repository and verified locally, without any
account:

- verifying on preview that supported root `vercel.ts` supplies the expected
  rewrites, headers, and function limits (the remaining MAP-028 A1 provider gate);
- the channel-vocabulary migration and its constraints, rehearsed on the
  portable PostgreSQL runtime (D1);
- generating the sitemap into the build and fixing `robots.txt`, including
  removing the line that publicly advertises the admin path (B1–B3);
- B4/B7 raster social/PWA assets are locally prepared and build-verified; owner
  action is limited to representative real-platform share and installed-device
  acceptance during MAP-024/MAP-025;
- implementing product-route prerendering once 5c is decided (B5);
- adding the CSP reporting directive once 3e supplies an endpoint (C1);
- writing the Lazada and TikTok ingress functions on the proven Shopee pattern
  (D3);
- writing and rehearsing the remaining MAP-018/019/020/026 migrations.

Roughly four fifths of the remaining engineering work sits here, and it is the
half that must happen first regardless — a migration has to be written and
rehearsed before it can be applied, and each Vercel preview has to prove that
root `vercel.ts` selected only its reviewed target configuration before a
deployment can be promoted.
