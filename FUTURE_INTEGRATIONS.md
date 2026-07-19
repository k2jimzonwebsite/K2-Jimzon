# Future Integration Roadmap: The BOS API Layer

This document outlines the exact architecture required to connect the K2 Jimzon Business Operating System (BOS) to live external platforms (Shopee, Lazada, Meta, AI). 

Currently, the BOS features a robust UI and a complete Supabase Database Schema. To bring the system fully online, we need to implement **Supabase Edge Functions** to act as the middleman between our database and the outside world.

---

## 1. Commerce APIs (Shopee & Lazada)
The goal is to maintain a Single Source of Truth for inventory.

### A. Webhooks (Inbound Orders)
* **What it does:** Listens for new orders placed on Shopee or Lazada.
* **Architecture:** 
  1. We expose a Supabase Edge Function (`/functions/v1/shopee-webhook`).
  2. Shopee sends a POST request with the order details to this URL.
  3. The Edge Function verifies the webhook signature.
  4. The Edge Function maps the Shopee SKU to our database SKU and runs an `INSERT` into the `public.orders` table.
* **Result:** The order instantly appears on the "Pack & Ship Orders" Kanban board in real-time.

### B. Inventory Sync (Outbound Stock)
* **What it does:** Pushes stock updates to external platforms so you never oversell.
* **Architecture:**
  1. We attach a PostgreSQL trigger to the `public.products` table (specifically watching the `total_stock` column).
  2. When `total_stock` changes (e.g., you click "Mark as Arrived" on a Purchase Order), the trigger fires a database webhook.
  3. A Supabase Edge Function catches this trigger and fires an authenticated `PUT /api/v2/product/update_stock` request to the Shopee/Lazada Open API.
* **Result:** External marketplaces are instantly updated with the correct inventory count.

---

## 2. Omnichannel Messaging (Meta Graph API)
The goal is to allow admins to reply to Facebook, WhatsApp, and Viber from the BOS "Customer Messages" tab.

### A. Inbound Messages
* **What it does:** Receives chat messages from customers.
* **Architecture:**
  1. Configure the Meta App Dashboard to point Webhooks to `/functions/v1/meta-webhook`.
  2. The function parses the JSON payload to extract the sender ID and message text.
  3. The function creates or updates a row in `public.conversations` and inserts the chat bubble into `public.messages`.
* **Result:** The new message pops up in the left pane of the Unified Inbox.

### B. Outbound Replies
* **What it does:** Sends the Admin's typed reply back to the customer.
* **Architecture:**
  1. When an admin clicks "Send" in the Inbox, the frontend inserts the message into `public.messages` with `sender_type = 'Admin'`.
  2. A database trigger detects this new admin message and calls an Edge Function.
  3. The Edge Function calls the WhatsApp Business API or Messenger API to deliver the text to the customer's phone.

---

## 3. Artificial Intelligence (OpenAI / Gemini)
The goal is to automate data entry and customer service drafting.

### A. AI Sourcing / Catalog Parsing
* **What it does:** Reads supplier PDFs and suggests new products.
* **Architecture:**
  1. Admin uploads a PDF.
  2. An Edge Function streams the file to the OpenAI/Gemini Vision API with the prompt defined in `super_ai_prompt.md`.
  3. The AI returns a structured JSON payload of the products.
  4. The Edge Function inserts these products into `public.products` with `status = 'Draft'`.
* **Result:** The parsed products appear in the "Pending AI Products" queue for human review.

### B. AI Chat Copilot
* **What it does:** Drafts replies based on live database context.
* **Architecture:**
  1. When the Admin clicks "Ask AI to help reply", the frontend calls an Edge Function.
  2. The Edge Function fetches the customer's last 5 messages, and performs a similarity search or direct SQL query (via tool-calling/function-calling) on the `products` or `purchase_orders` tables to get context.
  3. The LLM generates a drafted reply and returns it to the frontend.
* **Result:** The drafted text appears in the text box for the Admin to review and click send.
