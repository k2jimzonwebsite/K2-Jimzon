/**
 * K2 Jimzon legacy catalog seed guard.
 *
 * The former script mixed product publication and opening inventory, used an
 * elevated credential, and bypassed the controlled intake/receiving workflow.
 * It is intentionally disabled. Use reviewed migrations or the Admin BOS
 * product-intake and inventory-source commands after MAP-017/MAP-018 verify
 * their schemas, authorization, audit events, and idempotency.
 */

console.error(
  "Catalog seed disabled: use the reviewed product-intake and inventory-source workflows.",
)
process.exit(1)
