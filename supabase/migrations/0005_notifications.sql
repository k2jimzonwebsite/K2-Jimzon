-- 0005_notifications.sql
-- Run this in your Supabase SQL Editor to enable the Notification Center

-- 1. Create the Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL, -- e.g., 'SYSTEM', 'ORDER', 'INVENTORY', 'AI'
    priority text NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    message text NOT NULL,
    action_url text, -- The internal ID of the module to jump to, e.g., 'sourcing' or 'inventory'
    read_status boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notifications" 
ON public.notifications FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'Admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'Admin'
  )
);
