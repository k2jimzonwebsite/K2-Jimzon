# Supabase CMS Setup — K2 Jimzon

The globe showcase CMS runs in two modes:

- **Demo mode** (no config): CMS changes save to the browser's localStorage. This is what runs today.
- **Live mode** (Supabase configured): CMS changes save to the K2 Jimzon Supabase project and publish for every visitor. The Admin → Globe & Reviews tab requires a Supabase admin sign-in.

## One-time setup (dedicated K2 Jimzon Supabase account)

1. **Create the project** in the dedicated Supabase account (Dashboard → New project). Region: `ap-southeast-1` (Singapore) is closest to PH customers.
2. **Apply the migration**: open SQL Editor and run the contents of
   [supabase/migrations/0001_globe_cms.sql](supabase/migrations/0001_globe_cms.sql).
   This creates `globe_products` + `reviews` with row-level security (public read,
   authenticated-only writes) and seeds all 17 catalog products plus the 4 existing reviews.
3. **Create the admin user**: Dashboard → Authentication → Users → Add user.
   Use the K2 Jimzon email and a strong password. Disable public sign-ups
   (Authentication → Providers → Email → turn off "Allow new users to sign up")
   so this stays the only account that can edit the CMS.
4. **Get the keys**: Project Settings → API → copy the Project URL and the
   publishable (anon) key.

## Local development

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

`.env` is gitignored — never commit it.

## Vercel deployment

In the Vercel project (dedicated K2 Jimzon account) → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the publishable key |

Then redeploy. The anon key is safe to expose in the client bundle — write access
is enforced by row-level security, not by hiding the key.

## Security model

| Actor | Can read | Can write |
|-------|----------|-----------|
| Visitor (anon key) | globe products + reviews | nothing |
| Admin (signed in) | everything | globe products + reviews |

Writes from the admin panel go through Supabase Auth; there is no service-role
key anywhere in this codebase, and there must never be one in frontend code.
