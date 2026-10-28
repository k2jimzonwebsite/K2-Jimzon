# MAP-019 local closure-authority runtime — 27 October 2026

IDEA-20261027-02. The full profile/settings/deletion goal remains active. This advances the previous [core qualification](MAP019_CLOSURE_AUTHORITY_CORE_20261027.md) from injected object I/O and Node SQL to a local workerd R2/SQLite composition. It does not enable a provider, deploy a service or close a real account.

`npm run rehearse:closure-authority-local` bundles the maintained three authority modules into a visibly synthetic test-only Worker. It uses isolated local R2 and SQLite-backed Durable Object state, real input exclusion, explicit local fixture bootstrap and a deliberately synthetic proof adapter. Miniflare outbound networking is blocked; no `.env`, credentials, actual database or Cloudflare account is read. The fixture header/variable is a test guard, never production authentication. Never deploy this fixture or use its proof in an application.

The test runtime is installed separately in ignored `.tools/closure-authority-runtime`; application dependencies and the application lockfile do not change. Reproduce the tools with:

```powershell
npm install --prefix .tools/closure-authority-runtime --save-exact --no-audit --no-fund miniflare@4.20260730.0 wrangler@4.153.0
npm run rehearse:closure-authority-local
```

The main nine-check rehearsal runs Miniflare 4.20260730.0 / workerd 1.20260730.1 with compatibility date 2026-07-30. Separate Wrangler 4.153.0 local configuration smoke uses its own nested Miniflare 5.20261023.0-beta / workerd 1.20261023.1; it is a narrower smoke, not a second complete nine-check run. The private runtime dependency lock is pinned in the public JSON receipt.

Final run `1cf3c293-9657-429b-9ef2-c62641d63724`, exec `a5e375`, passed:

1. A normal request cannot create an absent journal head.
2. Local R2 create-once and stale ETag CAS conditions return null without overwriting.
3. The actual R2/SQLite components compose, deny an unqualified fixture proof and always deny executable deletion permission.
4. An actual workerd hung-proof deadline returns 503/pending before logical-command persistence; the identical healthy retry succeeds.
5. Concurrent cancel/expire/authorize yields one terminal result; its exact retry preserves the receipt.
6. Disposing/restarting the complete runtime preserves R2/SQLite state.
7. Empty actual SQLite witness state reconstructs from the complete R2 chain.
8. Rolling back the local head refuses against immutable markers/witness; restoring the exact saved head reconciles.
9. Local reconciliation measurements at 4, 8 and 16 revisions are 47, 66 and 114 ms. These are measured points, not production capacity or an unbounded-growth guarantee.

Both Miniflare instances were disposed and their actual owned ports (55244 and 55267) refused connections. The helper always attempts bounded disposal even if startup rejects or hangs; unknown port, failed disposal or failed refusal probe cannot report a successful stop. Its five focused tests pass. The reviewer independently verified all eight raw receipt pins, both shutdown outcomes, helper tests and source syntax, with no remaining Critical/Important findings.

The Wrangler fixture config uses only local bindings, no account ID/routes/secrets, and `workers_dev=false`. Actual localhost smoke observed unmarked request403, explicit fixture bootstrap200/state200 at revision0. The first smoke exposed an unread POST-body runtime warning despite its200; consuming the fixture bootstrap/erase bodies fixed it. The focused successor returns expected already-bootstrapped409/state200 with no warning. Both sessions were stopped by Ctrl-C; each actual8799port check returned ECONNREFUSED. No production command ran.

The initial missing-fixture, sandbox local-fetch denial and poisoned old bucket-handle failures remain in private receipts. The stale handle was reacquired after runtime restart. Review found that awaiting failed/hung startup could prevent disposal; the extracted tested helper resolves it. The final public JSON preserves these distinctions, the current raw receipt, source/runtime-lock/log hashes and review disposition. Final `npm run verify:development` with loopback access exits0 and includes69privacy/tool Node checks; no application suite was rerun after documentation updates.

The three authority modules are unchanged from core qualification. `package.json` now includes the helper tests and optional local rehearsal command; its new hash in this successor supersedes only the historical package pin in the core receipt. No application handler is wired to these modules. The durable fixture files contain synthetic UUIDs only and are retained for evidence; every owned runtime has stopped.

Before adoption, recovery removes only this runner/helper/fixture/config/test and their package entries, preserving the earlier authority source and unrelated work. The fixture state under `.tools/closure-authority-runs/<run ID>` may be removed only after verified shutdown and absolute-path ownership checks. Never use database restoration to recover erased PII. The only remaining-work record is MAP-019 in `MASTER_ACTION_PLAN.md`: measured growth/resumable recovery, native proof/manifest/freeze/all-writer and versioned suppression integration, actual provider/custody/retention/scheduler/customer-staff acceptance and exact owner activation remain unfinished.

Contracts used: Cloudflare's [Miniflare R2 bindings](https://developers.cloudflare.com/workers/testing/miniflare/storage/r2/), [Durable Object persistence](https://developers.cloudflare.com/workers/testing/miniflare/storage/durable-objects/), and [SQLite transactions/flush](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/). Local compatibility evidence cannot prove hosted storage durability, access policy or deliverability.
