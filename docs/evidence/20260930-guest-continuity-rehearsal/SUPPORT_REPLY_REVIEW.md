# MAP-017 Supabase follow-up for owner review

State: owner authorized this exact reply, then it was sent and read back in the
existing ticket at 2026-09-30T08:29:58Z (16:29:58 Singapore). Gmail message
`1a0f16f4e8f70d9f` has the SENT label and the approved body precedes the
connector's quoted prior acknowledgment. This authorization requested guidance
only; it did not authorize support access, a provider change or a database
change. See `support-receipt.json` for the redacted readback.

- From: `k2jimzonwebsite@gmail.com` (Gmail and Drive profiles verified this session)
- To: `support@supabase.com`
- Existing ticket: `SU-483740`
- Existing Gmail thread: `1a0d2dfb9d2f1162`
- Subject: `Re: Supported correction for supabase_admin default privileges in public`
- Readback: two messages, the prior automatic acknowledgment and this sent reply;
  no human guidance yet.

## Exact proposed body

Hello Supabase Support,

Following up on SU-483740 for K2 project pixplcjqivlfflickobf. Our metadata-only
audit identifies six public-schema default-privilege groups owned by the
internal supabase_admin role: privileges for anon and authenticated on future
functions, tables and sequences.

Your published revoke example uses ALTER DEFAULT PRIVILEGES FOR ROLE postgres.
We have not assumed that changes these supabase_admin-owned defaults and have
not altered them.

Please confirm the supported project procedure for removing these six default
groups while retaining explicitly reviewed application grants. Can the project
postgres role perform it, or is a provider operation required? Please include
the preflight, verification and recovery steps and any effect on existing
objects or Supabase-managed services.

We are requesting guidance only. Please do not change the project or enable
support access. We will review and separately authorize any exact change
payload after backup and rehearsal.

Thank you,
K2 Jimzon
