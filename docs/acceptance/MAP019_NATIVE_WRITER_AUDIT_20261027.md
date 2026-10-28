# MAP-019 native writer-boundary audit — 27 October 2026

IDEA-20261027-02. The complete profile/settings/deletion goal remains active. This is metadata from an isolated restore of the existing encrypted 26 October archive after transactionally preparing the three current privacy migrations. It is not a freeze implementation, complete writer proof, live privilege observation or provider change.

The existing `scripts/rehearse-customer-privacy-current-schema.mjs` now accepts `--inventory-privacy-writers`. It substitutes the catalog query in `supabase/tests/customer_privacy_writer_inventory.sql` for the synthetic closure assertions, labels the receipt `writer-catalog-inventory-only`, and retains the original rollback/conservation/shutdown/plaintext-removal checks. No production client is constructed. Metadata records column/foreign-key/trigger/policy definitions, local role capabilities, routine signatures/source hashes and lexical reference/write/dynamic-SQL flags. It emits no rows, contacts, receipt contents, credentials or routine bodies.

```powershell
node --env-file=.env.local scripts/rehearse-customer-privacy-current-schema.mjs --inventory-privacy-writers
```

The environment supplies the existing local archive passphrase. The runner's own PostgreSQL commands use an explicitly constructed loopback environment; the maintained restore helper inherits the parent environment and overrides the database target to its validated loopback URL. No credential values are printed. This command does not use a management token for a provider operation or contact Supabase. The unrelated Supabase connector remains out of scope.

Initial run `b85decde-dbfa-4408-9b5b-978f449df834` passed with 27 relations/92 routines/66 lexical write candidates. Source inspection exposed private financial records and actual FK children beyond that explicit set. The final expanded run `e3f7fd21-5c1f-4554-ae4c-b91a10305f99` passed with **39 relations, 98 routines and 67 lexical write candidates**. All four migration/query source pins and the inventory hash match; independent bounded tool/evidence review approves with no material finding.

The 12 added relations are private express-delivery acceptances/context/quotes, guest conversation receipts, delivery snapshots, payment receipts, plus public coupon redemptions, inventory reservations, order request events/items, orders and packing scan events. This is why inventory, financial and delivery history cannot be treated as inquiry-only personal data.

| Observed prepared boundary | Evidence and implication |
| --- | --- |
| `messages` and `conversation_events` privacy triggers run before INSERT only | A future freeze must account for updates/deletes and conversation association changes; an insert-only trigger is insufficient. |
| Contact privacy trigger runs before INSERT or UPDATE OF `customer_id` | `contact_value`, verification fields and reparenting need explicit native lock/freeze treatment. |
| Conversations and requests use selected UPDATE OF columns | Other PII/scope edits, delete paths, parent/child relationships and multi-row lock ordering are not thereby covered. |
| No privacy trigger is listed on customers, profiles, settings, notifications, claims or channel identities | Existing role checks/signers and other triggers may protect individual operations; this inventory does not establish a common freeze barrier. |
| `k2_private.order_payment_receipts` contains `payment_reference` and `contents`; delivery snapshots contain `delivery_request`, `quote` and `delivery_address` | The versioned manifest and protected retention branch must map these exact record classes. No receipt content was read. |
| Existing processor is called by direct privacy commands and worker tick | Both remain independent-journal bypasses in inactive prepared source; they must not be enabled as complete deletion integration. |
| Native account/settings/channel/claim/notification routines appear among candidates | Triggers, nested helpers, direct table access and OLD/NEW customer associations must be qualified, not just a hand-picked RPC list. |
| Auth users/identities/sessions/refresh-token relations are present | Hosted Auth lifecycle isolation and cleanup are separate provider contracts; local metadata cannot prove them. |

Catalog routine matching is intentionally conservative and incomplete: SELECT FOR UPDATE can look like a write; dynamic SQL, nested wrappers, extensions, direct table access and provider operations may escape lexical matching. Incoming FK metadata aids dependency review but does not infer subject ownership from an Admin/staff actor FK. The restore excludes original owners/ACL and ten managed Vault entries. Local role capabilities must never be described as production privileges.

Both runs conserve selected schema, all 161 table projections/49,717 summed row projections and exact sequence values/`is_called` after rollback. Final before/after schema/data/sequence hashes match. Each owned server was stopped, its actual port refused connections and its plaintext restored data directory was removed. Only encrypted input, redacted metadata and receipts remain. Inventory mode executes no synthetic closure journey, so its green status does not add closure/auth/provider evidence.

Final `npm run verify:development` exits0 with78privacy/tool checks; no application build or deployment was needed. The public JSON receipt pins the current runner/query, private metadata, raw receipts and development log without copying customer values. The existing full closure-rehearsal evidence remains valid at its earlier scope.

Recovery removes only the inventory query and the runner's inventory-only branches, preserving previous restore/rehearsal logic and all earlier work. No production rollback is involved. On cleanup failure, inspect only the run's recorded owned data path and reconcile its server before checked-path removal. Never restore closed PII. The sole remaining-work record is MAP-019: native proof/manifest/freeze and hold interaction must be designed against this catalog, then verified across all writers before source integration/activation.
