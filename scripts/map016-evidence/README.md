# MAP-016 provider evidence scripts

These reproduce the provider-side MAP-016 proofs. They are deliberately **not**
wired into `prebuild`, CI, or `verify:map016-local`, because they require a
Supabase management token and two of them touch the live project.

All three read credentials from `.env.local` and print only statuses, counts,
ids, and rule names. No key, password, TOTP secret, or JWT value is ever emitted.

| Script | Effect | Safe to re-run |
| --- | --- | --- |
| `verify-legacy-token-rejection.mjs` | Read-only. Compares row visibility for the publishable key alone versus the legacy HS256 service-role Bearer token. | Yes |
| `verify-admin-aal2-invitation.mjs` | **Writes to production.** Creates a throwaway Admin identity and a throwaway invitee, exercises `invite-staff` end to end, then deletes both. | Yes, but it creates and removes real identities each run |
| `revoke-legacy-signing-key.mjs` | **Irreversible.** Moves the legacy HS256 JWT signing key to `revoked`. Refuses to run unless the `in_use` key is a non-HS256 algorithm. | No — already applied 22 August 2026 |

## Expected results as of 22 August 2026

```bash
node scripts/map016-evidence/verify-legacy-token-rejection.mjs .env.local products
```

Expect `publishable only (anon)` to return HTTP 206 and the old HS256 Bearer
token to return **HTTP 401**. Before the signing key was revoked the old token
returned HTTP 206 with more rows than anonymous access, which was the exposure.

```bash
node scripts/map016-evidence/verify-admin-aal2-invitation.mjs .env.local
```

Expect `12/12 checks passed` and `residual test profiles remaining: 0`.

The `modern secret key (elevated baseline)` line in the rejection script reports
HTTP 401 by design: it reads that key from the Management API, which redacts
secret key values. It is not a finding.
