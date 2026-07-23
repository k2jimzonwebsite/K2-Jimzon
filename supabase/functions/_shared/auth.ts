// Auth & secret verification helper for Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function verifyUserToken(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  return user
}

export function verifyWebhookSecret(req: Request, expectedSecret: string): boolean {
  const secret = req.headers.get('x-webhook-secret') || req.headers.get('X-Webhook-Secret')
  return secret === expectedSecret
}
