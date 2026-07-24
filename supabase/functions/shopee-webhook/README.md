# Shopee webhook connector

This is the backend "pipe" that turns the Channels board's Shopee card 🟢 Live.
It receives Shopee's order pushes, verifies them, and writes orders into your
`orders` table. It runs on Supabase — never in the browser.

## Deploy (one time)

1. Install the Supabase CLI and log in:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

2. Add the Shopee secret (the partner key from Shopee Open Platform):
   ```bash
   supabase secrets set SHOPEE_PARTNER_KEY=your_shopee_partner_key
   ```
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

3. Deploy the function:
   ```bash
   supabase functions deploy shopee-webhook --no-verify-jwt
   ```
   `--no-verify-jwt` is required because Shopee (not a logged-in user) calls it;
   the function does its own signature check instead.

4. Copy the function URL it prints, e.g.
   `https://<ref>.functions.supabase.co/shopee-webhook`, and paste it as the
   **Push / webhook URL** in Shopee Open Platform → your app → Push settings.

## What happens next

- Shopee sends a signed push → the function verifies it with `SHOPEE_PARTNER_KEY`.
- Any valid push sets `channel_connections.shopee = 'live'`, so the admin card
  flips to 🟢 on its own.
- Order-status pushes (`code: 3`) insert a row into `orders` with
  `channel_source = 'shopee'` and `fulfillment_method = 'SHOPEE:<ordersn>'`.

## The one thing to finish

Shopee's push only includes the **order serial + status** — not the line items.
To fill in the real SKU, quantity, buyer and total, the function needs to call
Shopee's `get_order_detail` API with your shop's **access token** right after
receiving the push. That's marked with a `NOTE:` comment in `index.ts`. Until
that call is added, orders arrive tagged and traceable (by `SHOPEE:<ordersn>`)
but with placeholder line details.

The same pattern (verify → write → mark live) is reused for Lazada, TikTok, Meta
and WhatsApp — copy this folder and swap the signature check and field mapping.
