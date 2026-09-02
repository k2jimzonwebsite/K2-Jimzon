# Staff product deletion SOP

Use this procedure only for permanently deleting an unused product record. A
product with stock, listings, or operational history is retained and moved to
`Discontinued`; deletion is not a cleanup shortcut.

## Before deletion

1. Sign in to Admin BOS as an **Admin** and complete the authenticator step so
   the session is AAL2.
2. Open **Staff & Roles** and find **Your delete PIN**.
3. If no PIN is configured, set exactly **4 digits** and enter a specific reason
   for setting or rotating it. Six digits is incorrect for this workflow.
4. Keep the PIN personal. Do not place it in tickets, chat, source code,
   environment variables, screenshots, or shared notes.

The last verified live-state record says
`k2_private.staff_delete_credentials` contained zero configured PINs. Until an
Admin completes step 3, every deletion attempt is expected to fail closed; that
denial does not mean the system is broken.

## Delete an eligible product

1. Open **Inventory** and select the exact product or products.
2. Choose the permanent-delete action and review every named SKU.
3. Enter the 4-digit delete PIN and a specific deletion reason.
4. Submit once. If the outcome is ambiguous, keep the same operation and refresh
   server status; do not invent a new operation key to force another mutation.
5. Confirm the product is absent only after the server returns a completed
   receipt. Preserve that receipt with the operational handoff.

The server snapshots an eligible product into `product_deletions` before removal
and refuses deletion when stock, listings, or operational history exist. For a
refusal, use the product lifecycle workflow to mark the record `Discontinued`.

## PIN denial and recovery

- Five failed PIN attempts within ten minutes lock deletion for fifteen minutes.
  Stop retrying, wait for the lock to expire, then verify the PIN in Staff &
  Roles before trying once more.
- Setting or rotating a PIN resets the failure window, requires Admin+AAL2, a
  reason, a signed/idempotent command, and an immutable staff-access event.
- A missing secure boundary or unavailable server is not permission to use SQL,
  a browser console, a service key, or a legacy RPC as a bypass.
- If exposure is suspected, rotate the PIN from a verified Admin session and
  follow the security incident runbook.

## Cutover note

The live legacy screen currently reaches the hardened
`delete_products_with_pin_v2` function, which is Admin+AAL2 guarded. The prepared
Admin BFF cutover revokes authenticated browser execution of that function and
routes deletion through the signed `product_master_delete` command instead. The
operator steps above stay the same; after cutover, a direct-RPC denial is the
intended security posture and must not be worked around.

## Durable evidence

- PIN configuration/rotation: private `staff_access_events` entry.
- Deletion request: reason-bound, idempotent command receipt.
- Deleted product: pre-delete `product_deletions` snapshot.
- Remaining stock/history: refusal plus lifecycle change to `Discontinued`.

