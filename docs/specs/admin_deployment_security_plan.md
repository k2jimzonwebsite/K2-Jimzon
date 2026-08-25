# Admin access and security reality

Status: isolated production builds implemented; deployed-environment verification still required.

## Deployment isolation

The public storefront and staff admin must be configured as separate Vercel
projects even though both are released from the same reviewed GitHub repository.
They do not share a production bundle:

- Storefront project: `K2_DEPLOYMENT_TARGET=storefront`
- Admin project: `K2_DEPLOYMENT_TARGET=admin`

Both projects may use the normal `npm run build` command. Vite resolves a
different application entry for each target, and the build-boundary verifier
rejects an artifact containing the wrong application's views. The missing-target
fallback is storefront, so an unset admin flag cannot accidentally expose the
admin UI. Existing Vercel project URLs containing `admin` are recognized as a
compatibility fallback, but every project should still set its explicit target.

Do not set `K2_DEPLOYMENT_TARGET=admin` on the storefront project. Keep project
environment variables, deployment aliases, access logs, and future custom
domains separate. Marketplace and service-role secrets remain server-only and
must not be added to either browser build.

## Security boundary

The admin is served only by the admin production project. Until a dedicated
domain is available, use that project's separate Vercel URL. Access is enforced
by:

1. Supabase Auth email/password or Google sign-in.
2. A staff role in `public.user_profiles`.
3. PostgreSQL row-level security for every operational table.
4. `SECURITY DEFINER` RPCs that validate public Website and Pasabuy submissions.
5. Server-side marketplace secrets, once connectors are built.

There is no local-storage admin bypass, master passcode, universal PIN, client-signed token, simulated 2FA, or browser-side encryption vault.

## MFA

The UI supports Supabase TOTP enrollment and challenge. Staff accounts should enroll TOTP before launch. Production verification must confirm that sessions step up to AAL2 when a verified factor is present. Sensitive role management should be tested with and without the required assurance level.

## Marketplace credentials

Shopee, TikTok Shop, and Lazada secrets must be stored in Supabase Edge Function secrets (or an equivalent server-only secret store). They must never appear in source code, browser storage, dashboard form fields, product CSVs, logs, screenshots, or support chats.

## Required production verification

- Anonymous visitors can read only live products and can write only through validated submission RPCs.
- Customer accounts cannot read staff queues, batches, consignments, channel listings, audit events, or other customers' requests.
- Staff can access required operational records.
- Non-admin staff cannot promote roles or retrieve connector secrets.
- Order submission does not reserve inventory or claim payment.
- Staff confirmation reserves inventory atomically and cannot oversell.
- Pasabuy status changes reject invalid transitions.
- Quote snapshots cannot be overwritten as if they were the original quote.
- Event rows reject updates and deletes.
- Logout removes dashboard access after refresh and across tabs.

Do not label the deployment production-ready until these checks pass against the actual Supabase project and deployed site.
