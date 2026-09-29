# Handoff for a connector-equipped session

**Written:** 29 September 2026, on `main` at `059d54f`, nothing pushed.
**For:** a model or operator with Supabase, Vercel, Cloudflare and GitHub access.
**Why it exists:** the session that wrote this had Supabase read **and write**,
plus GitHub, and no Vercel or Cloudflare. Everything below is either already
done, or is the exact remaining step for someone who can reach the provider.

## Read this first

Two rules govern everything here.

1. **Capability is not authorization.** A K2 management token can write to the
   production database. The token existing is not permission. Nothing in this
   handoff authorizes a write; each item names the owner decision it is waiting on.
2. **Verify the gate before you act.** Run `npm run preflight:k2-project` then
   `npm run readiness:k2-live`. Zero failed gates. If a gate is `CONNECTOR`,
   the surface was not reached — say so, never assume it.

Current gate receipt: **8 verified, 2 owner, 3 connector, 0 blocked.**

**Later session checkpoint, 29 September:** Local `main` reached `dd33ce1`, seven
commits ahead of `origin/main`; this handoff correction is on feature branch
`codex/connector-handoff-20260929`. The six-commit list below is a dated snapshot.
An initial sandbox run refused before SQL because the owner environment or
network was unavailable. With `.env.local` and normal network access, the
read-only identity preflight passed for `pixplcjqivlfflickobf`, followed by a
fresh `readiness:k2-live` exit 0: **8 verified, 2 owner, 3 connector, 0 blocked**.
Its receipt is ignored `.tools/current-production-backups/live-readiness.json`.
The readiness script's provider gate was corrected from `cloudflare-gate` to
`vercel-edge-gate` because the route rule belongs to Vercel. The focused
readiness contract passed 5/5 and `verify:development` exited 0. A fresh
read-only live gate after the correction exited 0 with **8 verified, 2 owner,
3 connector, 0 blocked** and emitted the corrected name. The sandbox-only
attempt first refused identity before SQL; normal network access completed the
check. The signed-in K2 Supabase browser independently showed the exact project
and `https://pixplcjqivlfflickobf.supabase.co`. No K2 row or provider setting
changed. See the STOP 1 alias correction below.

## State of `main`

```
059d54f  fix(map017): classify the anonymous execute surface and guard publication in the database
71fef3b  docs: hand off the provider-blocked work and record the media audit
7b982a4  fix(listing): stop printing foreign keys and gate publication on review
f7e4029  docs: make main the single authority for this session's work
3e17ff2  feat(readiness): gate every K2 production step on an executable check
e805747  feat(deploy): isolate Vercel targets and gate K2 project identity
──────── origin/main (f95e384)
```

`main` is ahead of `origin/main` by six commits. **None of it is pushed.** The
first decision is yours: these are a source release and a documentation release
together, and `AGENTS.md` requires `npm run verify:release` before any promotion
to the production-linked branch. That gate has never been run on this state.

## What was already done, do not redo it

- **K2 identity preflight.** `npm run preflight:k2-project` refuses a ScoutIT
  URL or a token that cannot list `pixplcjqivlfflickobf`. Wired into `prebuild`.
- **Live readiness gate.** `npm run readiness:k2-live`. Read-only, `read_only:
  true`, SELECT-only, exits before any query if identity fails. Current receipt:
  8 verified, 2 owner, 3 connector, 0 blocked.
- **The anonymous execute surface is reconciled.** Do not re-investigate the old
  "10 versus 18" anomaly. The live set is 5 expected-and-live, 5 legacy
  transitional, and 13 expected-but-unapplied; 5+5=10 and 5+13=18, so there is
  no unexplained residue. The 5 transitional grants and their one-to-one signed
  guest replacements are listed in STOP 5. `PUBLIC` holds no implicit execute,
  and `anon` holds zero table privileges in `public`. The gate classifies this on
  every run, so it can no longer be reported as a mystery.
- **A publication review guard is prepared and rehearsed.** See STOP 3.
- **Vercel Build Output packaging.** `vercel.admin.json` and
  `vercel.storefront.json` no longer use the legacy `builds` allowlist;
  `scripts/build-vercel-output.mjs` generates v3 artifacts with one target
  function each and explicit 180/10-second config. **Local artifact tests only.
  Never built on Vercel Linux.**
- **Two source defects fixed.** A UUID is no longer printed as a brand or
  category to customers or into schema.org, and the admin sheet refuses to
  publish an unreviewed product. Both are on `main`, both have 7/7 contract
  tests, `verify:development` exit 0.

## STOP 1 — extra Storefront hostname identified; owner alias decision pending

**29 September provider correction:** The signed-in K2 Vercel dashboard lists
`k2-jimzon-vert.vercel.app` and `www.k2jimzon.com` together under project
`k2-jimzon` (`prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL`) on the same Ready Production
deployment `CDHSSMBpvySmc82qzMQUVAJdWSkx`, Git branch `main`, SHA `f95e384`,
created by `k2jimzonwebsite`. The K2 team lists only the separate Storefront
and Admin projects. The extra hostname itself serves the current customer
Storefront. It is an alias, **not evidence of a third current Vercel project or
independent product writer**. The earlier third-writer conclusion was
an inference from July screenshots and is superseded by this provider view.

The 20 July screenshots still record an old “Smart Paste AI Import” failure on
`after_image_url` and a `bellarom` UUID cast. They warrant a historical source
and grant review, but do not prove the current deployment exposes that flow.
No key rotation, third-project registration or deletion follows from them.
The owner should decide whether the extra public alias remains or is retired
after a traffic/redirect check. Keep both production artifacts unchanged while
that choice is pending. Current media and publication risks remain in STOP 2/3.
Vercel Hobby observability showed 195 aggregate Storefront CDN requests over
the prior six hours, but its visible summary did not break them down by host;
this does not establish demand for the alias.

## STOP 2 — the public product bucket contains third-party content

`product-images` is a **public** bucket with 36 objects, uploaded 19–20 July
2026. Only **7 are unique**; 15 are byte-identical copies of one file. Content
audit:

The signed-in K2 Supabase dashboard confirmed the exact K2 project and a fresh
read-only `storage.objects` count of **36** for this bucket on 29 September.

| Copies | Content | Verdict |
| --- | --- | --- |
| 15 | Bellarom Cappuccino tin, clean composite | Real product photo. Already linked to `bellarom-cappuccino`. |
| 1 | Bellarom Cappuccino tin, styled editorial shot | Real product photo, **unlinked**, and better than the linked one |
| 6 | Twinings Green Tea & Lemon box on a desk, next to a keyboard, dented | Desk snapshot, damaged packaging, **and Twinings is not in the catalogue** |
| 5 | Twinings Green Tea & Lemon, box visibly torn open | Torn packaging, not in catalogue |
| 4 | Screenshot of a TikTok video — Melophile, "Banyuhay" | **Third-party copyrighted content in a public bucket** |
| 4 | Screenshot of the `after_image_url` schema error | Debug screenshot in a product bucket |
| 1 | Screenshot of the `bellarom` uuid error | Debug screenshot in a product bucket |

**Consequences:**

1. **A TikTok screenshot of someone else's music video is publicly served from
   your own domain's storage path.** Confirm the bucket URL is reachable, then
   raise it with the owner and delete or replace it. This is a rights question,
   not a listing question.
2. **Zero of the 29 other products have a photograph.** The "36 images" is two
   photos of one SKU. This is the single largest real blocker to listing, and
   only the owner can supply real packaging photos and confirm media rights.
3. The one unlinked Bellarom image is a genuine free win — but linking it is a
   production write, so it needs the authorization in STOP 4.

**Commands a connector session should run first:**

```bash
npm run preflight:k2-project
# then, with the K2 management token, SELECT only:
#   select name from storage.objects where bucket_id = 'product-images';
#   select sku, name, image_url, primary_image_url from public.products;
```

## STOP 3 — the 22 already-published unreviewed products, and a guard now ready

`is_human_reviewed` is **false on all 30 products**, and **22 are `published =
true` and customer-visible right now**. The database blocks a status change to
`Live` without review, but nothing guarded the `published` flag, so a direct
`update` published them. The admin sheet is now guarded on `main`, and the
database guard is **prepared and rehearsed**:

A fresh read-only query in the signed-in K2 dashboard returned **30 total,
22 published, 22 published-and-unreviewed** on 29 September. No row was changed.

```bash
npm run rehearse:published-review-guard   # passes; rerun to confirm
```

- `supabase/migrations/20260929_published_requires_human_review.sql`
- `supabase/migrations/20260929_published_requires_human_review_rollback.sql`
- `supabase/tests/published_review_guard_bootstrap.sql` and `_assertions.sql`

Six assertions pass on an isolated PostgreSQL 17.11 cluster running the real
migration verbatim: the constraint lands **NOT VALID** over the rows that
already violate it, those rows stay readable, an unreviewed publish is refused,
the reviewed publish path still succeeds, unpublishing a legacy row stays
permitted, and the rollback restores the prior behaviour.

`NOT VALID` is required, not a shortcut: 22 live rows already violate it.

**Behaviour change to accept before applying:** once applied, any staff edit to
one of the 22 is rejected until it is reviewed or unpublished, even for an
unrelated column. That is the intended pressure, and it is why the migration
stays unapplied. The owner's decision on those 22 comes first:

1. Unpublish the 22 until staff review them — safest, empties the storefront.
2. Mark them human-reviewed after a real review pass — only if it happens.
3. Accept them as a recorded exception.

Apply the guard either way; it stops the next one regardless.

## STOP 4 — the MAP-018 intake apply, already authorized in capability

`npm run readiness:k2-live` reports the target tables still absent, so this is a
first apply, not a re-apply:

- `product_intake_sessions` — absent
- `k2_sku_seq` — absent
- `channels` / `channel_shops` — absent, so the MAP-026 chain stays separable
- live ledger: 10 entries, latest `20260928092634`
- newest encrypted envelope `current-20260929-pre-intake.k2backup` is dated after
  that migration and has a local isolated-restore receipt

**The only missing input is the owner naming the chain.** Procedure, gate meanings
and recovery: `docs/runbooks/K2_PRODUCTION_READINESS_RUNBOOK.md`.

## STOP 5 — the two provider-blocked items, and the guest revocation list

These need Vercel and Cloudflare provider checks. The local readiness gate
reports them as `CONNECTOR` because it cannot inspect dashboards; the signed-in
browser has since verified the Cloudflare Turnstile hosts, but the fresh Build
Output Preview and Vercel edge-rule cutover remain unverified.

1. **MAP-020 Build Output proof.** Build the reviewed feature source on Vercel Linux for both separate
   projects. Confirm exactly one function each, 180/10-second Resources values,
   own-route behavior, wrong-target 404, and Admin Turnstile on the Preview
   hostname. `VERCEL_OIDC_TOKEN` in `.env.local` is an OIDC JWT — the REST API
   answers `403 Not authorized`. A real API token or the CLI is required.
2. **The Admin Vercel edge gate.** `https://admin.k2jimzon.com/api/admin/session` returns
   **404** with the new BFF route closed. The deployed Admin still has a direct
   Supabase sign-in path with authenticator MFA when enrolled; this 404 does not
   establish whether an existing staff account can sign in through that path.
   Protected BFF intake acceptance remains impossible until its route is opened
   and verified. The previously observed enabled Vercel routing rule `K2 Admin BFF
   disabled gate` matches `/api/admin/:path*` and sets HTTP 404. Reinspect that
   rule in the Admin Vercel project before coordinating its removal with the BFF
   switch. Cloudflare is the Turnstile provider here, not the route-gate owner.

### Revocation list for the MAP-019 signed-guest cutover

These five are **live and anon-reachable now**. Do not revoke before the
replacements are applied and proven, or the storefront breaks.

| Transitional grant, live | Replaced by, unapplied |
| --- | --- |
| `submit_order_request` | `submit_guest_order_v1` |
| `submit_order_request_v2` | `submit_guest_order_v1` |
| `submit_pasabuy_request` | `submit_guest_pasabuy_v1` |
| `submit_storefront_chat_v1` | `start_guest_conversation_v1` + `append_guest_message_v1` |
| `validate_coupon` | `preview_guest_coupon_v1` |

The plan's "six transitional grants" is **five** as measured; there is no sixth
on a table. Carry the five forward.

## STOP 6 — smaller items, same session

1. **Choose the canonical stock source.** `products.stock_available` covers 21
   SKUs, `v_product_stock_from_batches` covers 21, `inventory_balances` holds
   29. Eight SKUs exist only in balances. MAP-026 owns the decision.
2. **Populate `brands` and `categories`.** Both tables exist with **zero rows**,
   and 0 of 30 products have a `brand_id` or a `category_id`, so the storefront
   shows no brand at all. `subcategory` already carries the category label for
   22 products, so the category side is closer than the brand side. Brand is
   largely derivable from SKU and product name, but confirm it rather than infer
   it: `baiocchi` and `pan-di-stelle` are Mulino Bianco products and the SKU does
   not say so.
3. **Barcode coverage.** 1 of 30 products has a barcode, so the barcode lookup
   feature is dead for 29 SKUs. Validate on real K2 stock.
4. **Five category chips are empty** — `Breakfast Food`, `Hair Care`,
   `Skin Care`, `Slimming`, `Whitening`. Not a defect; the grid already has a
   correct empty state. Populate or retire as editorial policy.

## Do not re-investigate these

- The "10 versus 18" anon execute anomaly — **resolved**, see the gate and STOP 5.
- The claim that 11 live products are unreachable by category chip — **wrong**.
  `CATEGORIES` does contain the real values and a live-only query returns zero
  unreachable. The 8 products with an empty subcategory are all unpublished.
- The double "Contains Contains" allergen text — **already fixed** on `main` by
  `f625381`. If the live page still shows it, the deployed build predates that
  commit, not the code.

## Pre-existing test-harness defect, do not misattribute

`tests/storefront-selling-surfaces.spec.js` fails under
`playwright.api.config.js` because that config has no `baseURL` for its relative
`page.goto` calls, and its intended `playwright.selling.config.js` times out
waiting 120s for its web server on this Windows host. Both reproduce on a clean
checkout of `f95e384`. The three source fixes on `main` therefore carry unit and
source-pin evidence but **no browser evidence**. Re-run those suites somewhere
with a working Vite server before promoting.

`npm run rehearse:published-review-guard` **does** work on this host — it starts
its own isolated cluster. If a rehearsal script is claimed as blocked here, check
whether it follows that pattern before assuming the toolchain is unavailable.

## Provider boundary checked in signed-in browser, 29 September 2026

Cloudflare's K2 account Domains overview displayed **No data available**: no K2
zone was listed. Its `K2 Admin BOS` Turnstile widget has two hostnames,
`admin.k2jimzon.com` and
`k2-jimzon-admin-git-codex-real-inventory-listi-4792fa-k2-jimzon.vercel.app`,
Managed mode and no pre-clearance. Turnstile can run without proxying site
traffic through Cloudflare. The Admin route gate belongs to Vercel per the
earlier provider inspection recorded in MAP-018 and the System Brain. The
current Vercel rule state still needs direct reinspection before any cutover.
The Admin Vercel Firewall overview shows 0 custom firewall rules; that does
not inspect the separate routing rule. The K2 Supabase Security Advisor browser
now displays 0 errors, 56 warnings and 7 suggestions. One warning names the
broad public `product-images` listing policy; several visible warnings concern
callable `SECURITY DEFINER` functions. The advisor count is a triage input for
MAP-017/018, not proof that every warning is a vulnerability or fixed.

**Preview branch dispatch status:** Feature branch
`codex/connector-handoff-20260929` contains the nine local commits ahead of
`origin/main`, including the Build Output source and these corrections. The
configured remote is `https://github.com/k2jimzonwebsite/K2-Jimzon`; a
read-only `gh repo view` returned that exact repository with WRITE permission
for the signed-in `EdgerzXc` account. Automatic approval review initially rejected the feature-branch push because
exporting repository contents lacked specific user authorization. The owner
subsequently approved pushing this exact branch to this exact K2 repository
for separate Vercel Preview verification. The push succeeded at `5e5860f`.
Admin Preview `8ZENLHpGyfjqaHqgo6BkQSu4a4gP` is Ready but its Resources list
three functions, including the Storefront API; isolation is not proved.
Storefront Preview `9eQYXHbGaPHqmVBT8xd1ChHQkEf2` failed on a Linux Node ESM
import of extensionless `./productIdentity` from `productStructuredData.js`.
The import is corrected locally to `./productIdentity.js`; a focused regression
passed, the full Build Output test passed 3/3 with normal filesystem access,
`npm run build:storefront` and `npm run verify:development` passed. Both Vercel
projects still display Vite, their old target build commands and a `dist`
output override. Next: align target-specific Build Output project settings,
push the verified fix on this authorized feature branch, and inspect new
function/duration Resources and exact routes. Production `main` remains on
`f95e384` until the separate release gate and promotion decision.

**Later Preview checkpoint:** Fix commit `8634192` was pushed on that feature
branch. Admin Preview `GdnYFfCnq9dEdXFKvp78GtNMCjcv` and Storefront Preview
`3zsgEfm6AE9Pch69bGCtEeZc7aDU` are both Ready, but each Resources page
still lists three functions, including the wrong target API. The Linux import
failure is closed; isolation and duration proof remain open. The authorized
Cloudflare `K2 Admin BOS` widget now has the exact current Admin branch hostname
alongside Production and the earlier inventory Preview host, with Managed mode
and no pre-clearance. The next action is the specifically requested Vercel
build/output settings alignment and a fresh Preview deployment; leave both
Production artifacts, BFF flags and the Admin edge rule alone.

## Host status as measured, 29 September 2026

| Host | Result |
| --- | --- |
| `www.k2jimzon.com` | 200 |
| `k2jimzon.com` | 308 redirect |
| `admin.k2jimzon.com` | 200 |
| `admin.k2jimzon.com/api/admin/session` | **404 — new BFF route closed; legacy direct Supabase sign-in is separate and untested here** |
| `k2-jimzon-vert.vercel.app` | **200 — alias of the existing Storefront Production deployment, see STOP 1** |

## Recovery at every stop

Both BFF flags off, Admin edge gate closed, previous separate Vercel deployments
retained, and the 29 September encrypted envelope available for an isolated
restore. Any gate that comes back ambiguous means the sequence stops in that
fail-closed state rather than continuing.
