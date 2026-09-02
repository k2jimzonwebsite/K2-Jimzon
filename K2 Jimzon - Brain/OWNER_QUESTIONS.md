# K2 Jimzon Master Owner Actions and Questions

This file contains only actions and business decisions that require the owner.
It is not an engineering backlog; implementation remains exclusively in
`MASTER_ACTION_PLAN.md`.

## Owner action priority

| Priority | Owner item | Needed before | Current action |
| --- | --- | --- | --- |
| **Immediate** | `OWNER-005` public-write-boundary migration | MAP-017 remediation of live critical findings | Verify owner recovery access, then apply the authorized migration through its guarded executor |
| Early | `OWNER-002` reservation holds | MAP-023 reservation activation | Choose hold, expiry, and extension rules |
| Early | `OWNER-003` wholesale and response claims | MAP-019/MAP-023 commercial activation | Choose eligibility, pricing, credit, minimums, and any SLA |
| Early | `OWNER-006` customer retention and deletion | MAP-019 privacy workflow | Approve record-specific retention, legal holds, anonymization, and request ownership |
| Early | `OWNER-007` paid AI intake controls | MAP-018/MAP-023 optional Automatic API path | Controls are prepared; confirm provider/model, per-product/session/monthly caps, retention, and activation evidence |
| Early | `OWNER-004` public contact channels | Public Contact page activation | Supply the monitored business numbers/channels |
| Before domains | `OWNER-001` domain and DNS | MAP-024 activation | Resolved 27 August 2026: authenticated Hostinger access proved authority; the pre-cutover zone had no MX/TXT records |

## OWNER-005 — Authorize the public-write-boundary production migration

**Decision:** Authorized

**Backup evidence ID:** `map017-pixplcjqivlfflickobf-20260827T134506.742Z-be6b75c0db0d`

**Backup/restore verification:** Verified

**Owner recovery access:** Verified

**Owner attestation recorded 2 September 2026.** The owner confirmed that the
`K2_BACKUP_PASSPHRASE` is now retained in the approved password manager with a
separate offline recovery copy held apart from the recovery workstation, and that
the `k2jimzonwebsite@gmail.com` 2-Step Verification plus its recovery email and
phone are current.

This closes the gate honestly but note what it is: an **owner attestation**, not a
machine-measured check. Software cannot see inside a password manager or a drawer.
The measured half was already recorded on 30 August 2026 — that workstation
retrieved the exact named envelope from Drive and decrypted it with the retained
passphrase, proving the key works. What the owner has now added is that the key
survives the loss of this laptop, which was the real exposure: until today the
only known copy of the key to every encrypted backup sat in `.env.local` on one
machine, while the locked archives sat in Drive.

**Re-attest this whenever the passphrase rotates, the recovery workstation
changes, or the Google recovery contacts change.**

The named production database and Storage object-byte backups, both isolated
restores, owner-only Drive upload, all eight independent retrieval checks, and
whole-archive reassembly are verified. The account-level recovery-access check
remains pending and is enforced separately by the guarded executor.

**Owner decision recorded 26 August 2026:** the prepared phase-one migration is
authorized, but execution must wait for a named, verified production backup and
restore point. `prepare backup first` is an execution gate, not permission to
invent a receipt or treat an unverified provider backup as recovery evidence.
No production DDL has been applied by recording this decision.

**Production database backup evidence recorded 27 August 2026:** the exact
production project was read over TLS using PostgreSQL 17, encrypted directly into
an AES-256-GCM envelope without a plaintext dump, and restored into the dedicated
loopback database `k2_map017_restore_verification_production_20260827`. The
redacted receipt verifies 51 public relations, the required tables and migration
ledger, and exact equality of the authenticated 14-row `products_old`
fingerprint. Ten Supabase Vault-owned archive entries were explicitly excluded
because plain PostgreSQL does not include the managed `supabase_vault` extension.
That database receipt by itself does not claim Vault, Storage objects, provider
configuration, or off-site recovery. The later Drive evidence below covers the
upload and retrieval portion; the executor must continue to refuse until the
remaining Storage and owner-recovery gates are durably evidenced here.

**Production Storage evidence recorded 27 August 2026:** backup
`map017-storage-pixplcjqivlfflickobf-2026-08-27T141713000Z-6e60fb24d07a`
contains all 36 production `product-images` objects and 115,573,916 bytes in an
AES-256-GCM envelope. Its redacted receipt proves exact count, byte total, and
collection-fingerprint equality after restore into the dedicated local evidence
directory. Object paths and per-object hashes exist only inside the encrypted
archive. This is file-level recovery evidence, not proof of bucket-policy,
provider-configuration, or live re-upload behavior. The owner later explicitly
authorized the encrypted/redacted off-site upload; its evidence is recorded next.
No production DDL has been applied.

**Owner-only Drive evidence recorded 27 August 2026:** eight encrypted/redacted
artifacts are in `K2 Production Backups` (folder ID
`1mQuU8Jj6eWhDr-lpZV3YJDtaEwfAh8yo`). Google reports exact uploaded sizes,
`shared: false`, and only the owner permission for
`k2jimzonwebsite@gmail.com`. Seven artifacts were independently downloaded and
matched their local SHA-256 values, including the full database envelope and the
48,471,830-byte second Storage chunk. The owner then downloaded the
67,108,864-byte first Storage chunk through a normal authenticated Drive session;
its SHA-256 matched
`47BB9160986C5C306C9026171FCC1DB1C4C92A8CA8C40902C410AE04F26FA350`.
Reassembly with part 002 matched the original 115,580,694-byte archive digest
`6E60FB24D07A80CB8FDBDBBC7F0EE3EFF86FEE0EE0A9657E9D4F5C94607AE312`.
Owner recovery access remains unproven, so the guarded production executor must
still refuse.

**30 August 2026 recovery evidence:** an authenticated Google Drive profile read
confirmed the active account is `k2jimzonwebsite@gmail.com`; that same account
listed the owner-only backup folder, read both restore-verification receipts, and
downloaded the complete 674,413-byte encrypted database envelope. A local
fail-closed authentication check then used the retained `K2_BACKUP_PASSPHRASE`
without printing it and successfully decrypted that exact named envelope,
verified its authenticated manifest, required PostgreSQL custom-dump signature,
674,413 encrypted bytes, and dump SHA-256
`8ED220049E7611D471C7165FEAE3FFA490317197C55C24542DE4D1FA2893581D`.
This proves retrieval and decryption capability on the current recovery
workstation. `Owner recovery access` remains `Pending` until the owner confirms
that the passphrase is retained in the approved password manager with a separate
offline recovery copy and that the Google account's 2-Step Verification plus
recovery email/phone are current. No production DDL was attempted.

**Prepared backup tooling recorded 26 August 2026:** the repository can now
create an encrypted custom-format database envelope and redacted manifest without
writing plaintext or placing credentials in command arguments. It now requires
the 14-row `products_old` fingerprint to remain stable across the dump and binds
that redacted fingerprint to the AES-GCM envelope. At that checkpoint the
owner-controlled Drive destination existed, but the environment still lacked the
explicit production database URL, owner-held backup passphrase, and isolated
restore target. Those credentials and the database restore were supplied later
on 27 August as recorded above; a writable folder alone remains insufficient
off-site recovery evidence.

**Provider inventory checked 26 August 2026:** the exact project reports PITR
disabled, WAL-G enabled, and zero available backup entries. WAL-G enablement is
not a named restore point, so the owner fields remain `Pending`. No provider
backup or restore operation was started.

**Restore tooling checked 26 August 2026:** a real local PostgreSQL 17.11 custom
archive passed authenticated encryption, isolated empty-target restoration, and
schema/ledger boundary checks, including exact equality of all 14 legacy rows by
redacted fingerprint. That verifies the prepared command only. It does
not supply a production backup ID or prove production database, Storage-object,
or off-site recovery, so both owner fields remain `Pending`.

**Fresh gate evidence 27 August 2026:** the complete portable lifecycle passed
again with 12 authorization groups, encrypted archive creation, exact 14-row
fingerprint equality, and isolated restore; 51/51 focused contracts also pass.
The exact provider inventory still reports no named backup. A redacted linked-
project dump dry-run succeeds through the credential held in native Supabase CLI
storage, but the approved envelope command intentionally will not extract it.
Smallest owner action: obtain the session-pooler connection string/database
password from Supabase, create and retain a 24-plus-character backup passphrase
in the approved password manager, and place both only in the ignored local
`.env.local` as `K2_PRODUCTION_DATABASE_URL` and `K2_BACKUP_PASSPHRASE`. Do not
send either through chat. No production dump or DDL has been run.

**Rejected handoff later 27 August:** both local entries were detected as the
literal instructional placeholders, not credentials. The fail-closed validator
rejected the URL before any connection attempt and no backup was created. Replace
them with the real Session pooler URI plus a distinct randomly generated
password-manager-held passphrase; never send either value through chat.

**Needed for:** MAP-017 remediation. This is the only thing now standing between
the live database and the removal of anonymous write access. Raised 22 August
2026 after the first real live schema audit.

**What was found.** The audit had never been run against the real database. Once
the exporter was repaired and executed, the live result was
`NON_CONFORMANT_CRITICAL` with 21 findings. Independently confirmed against the
catalog, not merely reported by the tool:

- The anonymous role holds broad write privileges on `brands`, `categories`,
  `warehouses`, `product_drafts`, and `products_old`.
- Those tables do have Row Level Security switched on, but their policies are
  blanket `ALL USING(true)` rules named "Admin Full Access", "Admins manage
  products", and "Staff manage product_drafts". A blanket policy does not
  restrict anything, so RLS is not containing the grant.
- The `product-images` storage bucket still carries "Anyone can upload", "Anyone
  can update", and "Anyone can delete" policies, with no file size limit and no
  MIME type allowlist.

In plain terms: today an unauthenticated visitor can write to catalog tables and
the product image bucket.

The first report incorrectly attributed a `realtime.messages` grant to
`public.messages`. The schema-qualified correction removed that false finding;
`public.messages` is not part of this phase-one write exposure. The corrected
subset remains 21 findings: 13 critical, 7 high, and 1 medium.

**Why this is not simply an engineering fix.** The correction already exists.
`20260812_map017_public_write_boundary_hardening` was written on 12 August, was
executed inside a live transaction and rolled back cleanly, and is the single
migration genuinely absent from the applied ledger. It was never applied because
MAP-016 gated all production changes. MAP-016's blockers are now closed, so the
remaining gate for this phase-one migration is the standing rule that permanent
production DDL requires explicit owner authorization. The later exhaustive audit
also found separate provider-owned and coordinated-cutover work; authorization
of phase one does not falsely close those findings.

**Fresh rehearsal result (22 August 2026):** Codex re-ran the exact migration and
postflight against today's production schema inside an explicit transaction that
ended in `ROLLBACK`. After correcting the missing safe-stock projection, the
postflight and an anonymous stock read passed, and a separate read-only query
passed all nine sampled restoration checks. The exhaustive audit now records 55
findings (47 critical, 7 high, 1 medium) after the 24 authenticated-RPC evidence
gaps were closed with a live guard matrix; the earlier 21-finding result is the
phase-one contract subset. All live findings remain present because nothing was
committed.

The local behavioral runner now derives 12 phase-one assertion groups from its
SQL manifest instead of reporting a hard-coded test count. The full isolated
bootstrap, rollback/restoration, apply, role/Storage/Realtime/default-privilege
behavior, and idempotent replay pass without retaining test rows. This strengthens
local evidence but does not replace the owner's production authorization.

The permanent executor is now prepared and exercised only against the isolated
PostgreSQL rehearsal database. It binds the exact SQL payload to SHA-256
`D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62`, writes
ledger version `20260824143000` in the same transaction, never retries the
write, and independently verifies the receipt plus 11 post-commit invariants.
It will refuse production unless this OWNER-005 section records the exact
decision `Authorized`, a named backup-evidence identifier exists, and every
project/payload/ledger/live-finding/recovery gate matches. No production apply
has been attempted.

**Options now:**

1. **Authorize the prepared migration.** Applies the reviewed, rollback-validated
   remediation and clears the verified phase-1 findings while restoring the
   minimal public stock projection without exposing lot rows. Recommended.
2. **Defer.** The anonymous write paths stay open until a later decision.

**What the owner must decide:** whether to permit this permanent DDL change.
Engineering must not apply production DDL without that authorization.

**Related decision surfaced at the same time:** `products_old` is a legacy table
that is still anonymously writable, still published in the realtime feed, and
confirmed on 22 August to be anonymously **readable** — all 14 of its rows are
returned to an unauthenticated caller. Whether it is retired, archived, or
retained is a data-retention decision, not a purely technical one. It is recorded
here rather than assumed.

**Owner decision recorded 26 August 2026:** archive the 14 legacy rows privately,
verify the archive and recovery path, then retire `products_old` from anonymous
access and Realtime. Retirement must preserve any still-required historical
references and must be included in the reviewed migration/postflight/rollback
evidence; this decision does not authorize an ad-hoc destructive table drop.

**Prepared archive verification recorded 26 August 2026:** the backup command
now refuses any source other than the expected 14-row archive, detects changes
during `pg_dump`, cryptographically authenticates the redacted count/fingerprint,
and requires exact fingerprint equality after isolated restore. A real local
PostgreSQL 17.11 rehearsal passed with 14 seeded rows; no production archive or
retirement has occurred, so the decision remains gated by the pending OWNER-005
backup/restore evidence.

**Payload identity correction recorded 26 August 2026:** after Codex showed that
the earlier documented token did not identify the final committed SQL, the owner
requested the correction. OWNER-005 is therefore bound to the reviewed final
preflight/migration/postflight payload at SHA-256
`D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62`. This
correction does not waive the named backup and verified-restore gate.

**Scope note — this decision covers one migration, not the queue behind it.**
Five further migrations are prepared and unapplied. Four are safe to apply once
authorized, but `20260822_catalog_spreadsheet_commit` must **not** be applied yet:
it revokes direct write access to the products table from staff sessions, and
three Admin screens still write that table directly, so applying it early would
break product creation, spreadsheet editing, bulk status change, and bulk paste.
Each of those five will come back as its own authorization request when its
application-side prerequisites are actually met. Authorizing `OWNER-005` does not
authorize any of them.

**One reassuring result worth stating plainly.** A read-only behavioural test of
the live database confirmed that customer and staff data is *not* anonymously
readable: `user_profiles`, `orders`, and `product_batches` all refuse anonymous
requests outright, and `messages`, `conversations`, `channel_credentials`, and
`staff_allocations` return nothing. The problem described above is a write-side
and legacy-table exposure, not a customer-data leak.

**A second, customer-visible issue rides on the same migration.** Anonymous
callers currently cannot read `v_product_stock_from_batches`, the view holding
authoritative stock counts. The live storefront is throwing HTTP 401s for it
right now. The catalogue still displays because the deployed code quietly falls
back to the older stock column, which means shown availability may not be the
authoritative figure. This is the same permission gap the 21 August provider log
review recorded as repeated "permission denied for view" errors. Restoring that
grant is part of the same MAP-017 remediation, so authorizing it fixes a real
customer-facing accuracy problem as well as closing the write exposure.

## OWNER-001 — Production domain and DNS control

**Needed for:** `MAP-024` custom-domain activation only. Other local and platform
hardening can continue without this answer.

**Decision state:** Resolved on 27 August 2026 for domain choice and DNS control.
The exact domain is `k2jimzon.com`; the owner authorized the connector work and
authenticated Hostinger access successfully read and changed its DNS zone. The
pre-cutover zone contained no MX or TXT records. Sitemap, absolute
canonical/share metadata, Supabase Auth callbacks, and complete real-host SEO
acceptance remain MAP-024 implementation/verification work, not owner-decision
blockers.

**Public registration and DNS evidence recorded 27 August 2026:** Verisign RDAP
reports `K2JIMZON.COM` registered through `HOSTINGER operations, UAB` on
27 August 2026, expiring 27 August 2027, with transfer lock enabled. Public DNS
uses `COSMOS.DNS-PARKING.COM` and `NOVA.DNS-PARKING.COM`; the apex resolves to
`2.57.91.91`, and `www` aliases to the apex. HTTPS returns `200` for both hosts,
but both pages identify themselves as Hostinger parked-domain pages.
`admin.k2jimzon.com` does not resolve, and no apex MX or TXT record was visible
in the check. This proves public registration and current resolution, not who
controls the account or whether an unobserved business dependency must be
preserved.

**Resolution evidence:** Hostinger API reads showed only the parking apex A
record and `www` CNAME. The authorized cutover replaced them with the Vercel
targets and added the dedicated Admin CNAME; public DNS and all three Vercel
domain verifications passed. `k2jimzonwebsite@gmail.com` remains the owner/login
address and is not a `@k2jimzon.com` mailbox. Domain email must remain unclaimed
until MX/SPF/DKIM/DMARC are intentionally configured and tested.

**Recommendation:** use `www.<domain>` as the canonical storefront host, redirect
the apex `<domain>` to it, and use `admin.<domain>` only for the separate admin
Vercel project. Never point the admin hostname at the storefront project. Inspect
and preserve mail/verification DNS records before changing nameservers.

**Why the owner must answer:** choosing the production brand domain and granting
registrar access is a business ownership decision, not a safe engineering default.

The current case-by-case delivery, customer-resolution, and Pasabuy pricing
practices are recorded in `SYSTEM_BRAIN_CURRENT.md`. Add another question here
only when the owner must make a new business-policy decision that cannot be
answered by the Brain or handled safely as configurable system behavior.

## OWNER-002 — Reservation hold and release policy

**Decision:** Answered 2 September 2026. **Resolved, with one clarification the
owner confirmed the stock lifecycle on read-back 2 September 2026.**

The owner's answers separate two things that had been conflated in the original
question. A saved cart and a stock reservation are different mechanisms:

1. **Cart — permanent, and holds no stock.** The cart persists like Shopee's:
   a customer can leave items in it indefinitely and find them later. It is a
   saved shopping list, **not** a claim on inventory. *Confirmed by the owner
   2 September 2026: "stock only deducts after a purchase has been made."* This is
   deliberate. If a permanent cart reserved stock, abandoned
   carts would lock inventory forever and the catalog would show sold-out for
   goods K2 still holds. Availability is therefore re-checked at purchase, which
   is the behavior customers already expect from Shopee.
2. **Reservation — 30 minutes, starting when the customer clicks purchase.**
   That is the window in which the exact units are held for them.
3. **Staff extension — minimum 30 minutes, maximum 7 days.** An extension must
   be attributed to the staff member and carry a reason.
4. **Pasabuy and wholesale do not use a hold at all.** They are conversation-led
   and run through live chat, so each commitment becomes a durable **history
   record** on the customer instead: a Pasabuy history and a wholesale history.
   The purpose the owner states is continuity of contact inside live chat and
   never losing track of a request. These records are permanent operational
   truth, not expiring reservations.

**Confirmed stock lifecycle, 2 September 2026.** Four distinct states, so that
"reserved" is never confused with "sold":

| Event | Effect on stock |
| --- | --- |
| Item sits in a cart, for any length of time | **None.** The cart is a saved list. |
| Customer clicks purchase | **Reserved for 30 minutes.** Held for them, not yet sold. |
| Payment verified / staff confirms | **Deducted.** Units leave inventory permanently. |
| 30 minutes pass with no completion | **Released.** Exact lots return, idempotently. |

Availability is therefore re-checked at the moment of purchase, never assumed from
when the item entered the cart.

**Engineering consequences recorded here so they are not rediscovered later:**

- A permanent cart for a signed-in customer is a stored record. A permanent cart
  for a guest needs either an account or a long-lived browser grant; the guest
  case must degrade honestly rather than silently losing the cart.
- Because the cart holds no stock, the existing pre-submit availability
  revalidation (MAP-028 G-005/G-009) is load-bearing, not optional.
- The 30-minute reservation needs an explicit deadline per reservation, a staff
  warning before expiry, and idempotent release of the exact lots at expiry.
- Pasabuy/wholesale history widgets are scoped by customer role — see OWNER-003.


**Needed for:** MAP-023 production activation of confirmed-order and wholesale
reservations. Schema, commands, audit, and release/recovery tests can be built
with a configurable duration before this answer.

Please confirm:

1. How long K2 should hold stock after staff confirms a direct/website order but
   before verified payment or another approved completion condition.
2. Whether Pasabuy and wholesale commitments use different hold durations.
3. Who may extend a hold, the maximum extension, and what customer communication
   is required before automatic or manual release.

**Recommendation:** store an explicit deadline on every temporary reservation;
notify staff before expiry; allow only authorized, reasoned extensions; and
release exact lots idempotently when the deadline passes. Never silently keep a
temporary reservation forever.

**Why the owner must answer:** the system can enforce and audit a configurable
policy, but engineering cannot invent how long K2 promises stock to a customer.

## OWNER-003 — Wholesale commercial policy and public response-time claims

**Decision:** Partially answered 2 September 2026. **Two of four resolved; one
deferred by the owner; one accepted in principle but still missing its value.**

1. **Eligibility — answered as an identity model, not a criteria list.**
   Wholesale and Pasabuy are **roles granted to signed-in customers**. The
   Pasabuy history and wholesale history widgets are scoped to the customers
   holding those roles. What business evidence staff must review before granting
   a role is not yet defined; until it is, granting stays a manual staff decision
   with an audit record, which is safe.
2. **Pricing — not yet determined.** Wholesale therefore remains **manual quote
   only**. No account price list, tier table, or minimum-order rule is activated.
3. **Payment terms and credit — not yet determined.** The owner records this as
   easy to add later and explicitly not urgent. **No credit is offered**, and no
   credit-limit code path activates. This is the safe default: credit risk is the
   one item here that can cost real money if guessed.
4. **Public response-time promise — the owner wants one**, so customers are not
   left waiting without knowing when to expect a reply. **The value is still
   missing.** A promise cannot be published as "we reply quickly"; it needs an
   exact number of hours and the exact business hours it is measured against
   (for example, "within 12 business hours, Monday to Saturday, 9am-6pm").
   Until that value exists, the previously hard-coded and unapproved 24-hour
   Pasabuy claim stays removed and every surface continues to say
   `Staff review required`.

**Blocking question for the owner:** what is the promised response time, and
during which days and hours is it measured? Nothing else in this item is waiting.


**Needed for:** MAP-019/MAP-023 activation of server-authorized wholesale pricing,
terms, reordering, and any promised response time. Secure inquiry and manual
review can remain available without these answers.

Please confirm:

1. Who qualifies for wholesale and what business evidence staff must review.
2. Whether pricing uses approved account price lists, quantity tiers, manual
   quotes, or a controlled combination; include minimum order/case rules.
3. Whether K2 will offer payment terms or credit limits, and who may approve or
   suspend them.
4. Whether K2 wants to publish a response-time promise for retail, Pasabuy, or
   wholesale inquiries. If yes, define the measured business hours and owner.

**Recommendation:** begin with staff-approved organizations, immutable quote or
price-list versions, server-side eligibility, shared-stock revalidation, and no
credit until an explicit limit/approval policy exists. Remove the current
hard-coded 24-hour Pasabuy promise unless K2 adopts and measures it.

**Why the owner must answer:** eligibility, prices, credit risk, minimums, and a
public SLA are commercial promises, not safe engineering defaults.

## OWNER-006 — Customer-data retention and deletion policy

**Decision:** **Deferred by the owner on 2 September 2026** as too complex to
answer now. This is a legitimate deferral, not an oversight, and it is recorded
with its exact consequence so it is not mistaken for completed work.

**Consequence while deferred:** the system continues to preserve every
operational record, which is the safe direction. K2 therefore **cannot yet honour
a customer data-deletion request**, because no approved retention period, legal
hold, or anonymization rule exists to execute against. No privacy workflow is
activated and none is claimed anywhere in the UI.

**When to revisit:** before launch if K2 will publish a privacy notice promising
erasure, and in any case before the first real deletion request arrives. The
answer needs Philippine accounting/tax retention advice, not an engineering
default.


**Needed for:** MAP-019 customer privacy request, anonymization, and deletion
activation. Source guards preserve operational records until this is decided.

Please confirm with appropriate Philippine legal/accounting advice:

1. Retention periods for customer contact/delivery PII, orders, payments,
   invoices, quotations, fulfillment evidence, Pasabuy/Wholesale inquiries,
   conversations, security evidence, and backups.
2. Which active operations, disputes, chargebacks, warranties, tax/accounting
   duties, fraud/security investigations, or legal holds pause anonymization.
3. Who receives and verifies a request, who may approve irreversible execution,
   the response channel, and whether an appeal/recovery window is required.
4. Which fields may be anonymized while the operational record remains, and
   when the Supabase Auth identity may be disabled or deleted.

**Recommendation:** revoke access promptly after verified approval, preserve
restricted financial/operational truth for its approved basis, anonymize
eligible PII transactionally, never cascade-delete the canonical customer, and
let backup copies age out under the documented backup schedule.

**Why the owner must answer:** engineering cannot invent legal/tax retention or
promise erasure while K2 still needs a record for fulfillment, disputes,
accounting, security, or recovery.

## OWNER-004 — Public phone, Viber, and WhatsApp details

**Decision:** Answered 2 September 2026. **Resolved.**

- Public business number: **+63 931 864 9654**
- The owner states this one number carries every K2 contact channel: calls, SMS,
  Viber, and WhatsApp.
- All of those channels may be published on the storefront Contact page.

**Remaining before publication:** test every generated link (`tel:`, Viber,
WhatsApp `wa.me`) from a real phone, and confirm the Viber and WhatsApp accounts
on this number are actually installed and monitored. A published channel that
nobody watches is worse than no channel, so the link test is part of the
acceptance, not an optional extra.


**Needed for:** publishing direct phone-based channels on the storefront Contact
us page. Email, Messenger, Shopee, and secure Website messaging can proceed
without this answer.

Please confirm:

1. The exact public K2 business phone number, including country code.
2. Whether that same number is active for calls, SMS, Viber, and WhatsApp, or
   whether each channel uses a different number.
3. Which of those channels K2 wants customers to use publicly.

**Recommendation:** publish only dedicated business numbers that staff actively
monitor, format them with `+63`, and test every public link from a real phone
before launch.

**Why the owner must answer:** engineering must not invent or expose a private
number, and a configured channel name does not prove the account is monitored.

## OWNER-007 — Paid AI product-intake controls

**Measured cost model recorded 2 September 2026** at the owner's request, so the
caps below are chosen against real numbers rather than a guess. Prices read from
OpenAI's published pricing on 2 September 2026; re-check before activation, as
provider pricing changes without notice.

*Assumed work per product:* one structured text call (label/context in, then
description, usage notes, SEO fields, and a media brief out; roughly 3,000 input
and 1,500 output tokens), plus two generated 1024x1024 images.

| Configuration | Text model | Image tier | Cost per product | Approx PHP |
| --- | --- | --- | ---: | ---: |
| Economy | gpt-5-mini | low | ~$0.022 | ~PHP 1.30 |
| **Recommended** | gpt-5-mini | medium | **~$0.072** | **~PHP 4.20** |
| Premium | gpt-5 | high | ~$0.285 | ~PHP 16.50 |

PHP figures use an approximate rate of PHP 58 to USD 1 and are indicative only.

**Model note — time-sensitive.** `gpt-image-1` is retired on **23 October 2026**.
Do not name it as the approved snapshot; use `gpt-image-1.5`, whose 1024x1024
output prices are $0.009 low, $0.034 medium, $0.133 high per image.

**Recommended caps, derived from the middle row.** These carry roughly double the
expected cost so a retry or a longer description cannot trip the cap mid-intake:

- **Per product: $0.15** (about PHP 8.70)
- **Per intake session: $3.00** (about PHP 175, roughly 40 products)
- **Per month: $20.00** (about PHP 1,160, roughly 275 products)

**Owner decision recorded 2 September 2026 — caps approved.** The owner selected
the **Premium** configuration and a **USD 100 monthly ceiling**. Derived caps,
each carrying retry headroom above the expected premium cost of ~$0.285:

| Cap | Value | Approx PHP | Roughly |
| --- | ---: | ---: | --- |
| Per product | **$0.50** | ~PHP 29 | one product, with room for a retry |
| Per intake session | **$10.00** | ~PHP 580 | ~35 products in one sitting |
| Per month | **$100.00** | ~PHP 5,800 | ~350 products |

These are **ceilings, not spend**. At the premium rate, onboarding 50 products in
a month costs about $14, not $100. The cap exists to stop a runaway loop, not to
describe a budget.

**Caps are editable, in two independent places, and both should be set:**

1. **The K2 SuperAdmin control screen** — changes these three numbers. Fail-closed:
   when a cap is reached the paid path stops and the free manual path remains.
2. **The OpenAI account's own billing limit** — a hard ceiling at the provider.

Set both. K2's cap protects the workflow; OpenAI's protects the card if anything
ever bypasses K2's cap. A cap that lives only inside the application it governs is
not a spending control.

**Cost caution worth reading before activation.** Premium buys high-quality image
generation at $0.133 per image, fifteen times the low tier. Per `G-014`, generated
art may never be presented as real product photography, so these outputs are draft
candidates and secondary/lifestyle imagery, not the primary product photo. If the
images turn out to be drafts staff replace anyway, the medium tier does the same
job for a quarter of the cost. Revisit the tier after the first real intake batch.

**Still required from the owner before activation:** confirm or replace those
three numbers, name the exact approved model snapshots, and confirm the provider
account's data-retention/training setting. The two-confirmation boundary and the
typed `ENABLE_PAID_AI` control are already recorded above and are unchanged.

**Why the text cost is not the thing to watch:** the text call is under half a
centavo to three centavos per product. Essentially the entire bill is images, and
the image *quality tier* moves it by a factor of fifteen. If cost matters more
than polish, drop the tier before dropping the feature.


**Needed for:** MAP-018/MAP-023 activation of the optional Automatic API path for
product descriptions, usage/instructions, SEO, media briefs, and PRIMARY/AFTER
Draft image candidates. The owner has already accepted paid API calls in
principle as a deliberate per-product alternative to the manual ChatGPT
Projects. The versioned SuperAdmin-only control and fail-closed storage are
prepared locally; this question records the values and provider evidence still
needed before activation.

Please confirm:

1. The approved OpenAI model snapshot(s) for structured product content and
   image generation/editing, and whether the same provider account is used for
   both stages. **Use `gpt-image-1.5`; `gpt-image-1` retires 23 October 2026.**
2. ~~The maximum spend per product, per intake session, and monthly owner budget
   cap~~ **Answered 2 September 2026 — see the approved caps above.**
3. **Owner direction recorded 30 August 2026:** use the two-confirmation
   boundary—one confirmation before the paid content call and a second before
   any image calls—with the UI showing the priced scope and current remaining
   cap each time. The control screen itself additionally requires the typed
   `ENABLE_PAID_AI` confirmation when enabling.
4. Provider retention/training settings and the evidence classes that may be
   sent. Customer, payment, credential, supplier-price, and internal financial
   data must remain prohibited.
5. Staff may choose the paid path only after activation; only the owner-
   controlled `SuperAdmin` role may change caps/model/retention controls. The
   ordinary Admin/Staff role selector must never grant SuperAdmin.

**Recommendation:** keep the manual K2 Product Content → Smart Paste → K2
Product Image Studio path available at every step; store only redacted usage,
cost, request/job, status, and acceptance evidence; and return all accepted
fields to the existing resumable intake session. The API must never set SKU,
price, cost, stock, quantity, lot, batch, expiry, custody, approval, or
publication.

**Why the owner must answer:** willingness to pay is not an unbounded budget or
provider/privacy authorization, and the confirmation design changes the staff
workflow and audit evidence.
