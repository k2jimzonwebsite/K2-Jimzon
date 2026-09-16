# Catalog CSV response-loss recovery — 9 September 2026

Authority: IDEA-20260908-01 / MAP-028 I-002. This is local evidence, not another
backlog and not a deployed or provider-state claim.

The browser baseline first proved that the CSV review could be dismissed while
its commit was pending. A second failing-first case proved that a late successful
response from a disposed modal could call the parent refresh for the next staff
actor. The corrected modal keeps the exact reviewed CSV hash, selected row set,
reason, operation ID, chunk index and per-chunk idempotency key while a protected
result is uncertain. Close, Escape, file replacement and re-preview stay locked;
the warning remains visible beside exact retry and durable-status recovery. A
definitive rejection remains correctable. Unmounted actor-scoped continuations
cannot update state or invoke completion.

The phone case uses a 375 × 812 viewport with reduced motion and asserts no
horizontal overflow. All catalog rows and responses are fabricated/intercepted.

## Verification

- Failing-first browser evidence: the pending close button was enabled; after
  synchronizing the actor case, a disposed response produced `Catalog import
  refreshed` for the replacement actor; and a definitive rejection left the
  correction fields disabled.
- `npx playwright test --config=playwright.payment.config.js tests/catalog-import-recovery-ui.spec.js`
  — 3/3 pass.
- `npm run test:payment-ui` — 33/33 pass, including fulfillment, supplier,
  coupon, wholesale, media and catalog recovery fixtures.
- Focused API/contracts (`catalog-spreadsheet`, `admin-command-retry`, `admin-bff`,
  `admin-dialog`, `release-ci`) — 88/88 pass.
- `npm run build:admin` — pass; prebuild security/import checks, 40-module Admin
  boundary, secret scan and 188.92/300 kB minified application budget pass.

No database, provider, feature flag, secret, deployment or production data was
changed. These fixtures do not prove an actual signed receipt, database audit
event, authenticated full-workspace navigation or target-host response loss.

## Recovery and next action

Use `docs/design-checkpoints/20260909-catalog-import-retry/README.md` and reverse
only the scoped component/fixture/spec/config changes. No data rollback is
required for this client-only slice. I-002 remains open. Next local action:
adopt retained outer command keys in the product-intake session/draft/inventory/
publication/evidence callers while preserving their separate durable inner
request IDs; then run authenticated receipt/audit acceptance after activation.
