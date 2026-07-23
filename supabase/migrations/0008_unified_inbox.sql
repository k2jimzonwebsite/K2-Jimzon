-- 0007_unified_inbox.sql
-- Run this in your Supabase SQL Editor to enable the Unified AI Inbox

CREATE TYPE chat_platform AS ENUM ('WhatsApp', 'Viber', 'Messenger');
CREATE TYPE message_sender AS ENUM ('Customer', 'Admin', 'AI');

-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name text NOT NULL,
    platform chat_platform NOT NULL,
    status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved', 'Pending')),
    last_message_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_type message_sender NOT NULL,
    content text NOT NULL,
    is_draft boolean NOT NULL DEFAULT false, -- If true, this is an AI suggestion waiting for approval
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read conversations" ON public.conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins read messages" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
