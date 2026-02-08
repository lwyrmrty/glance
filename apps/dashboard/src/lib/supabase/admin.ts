import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client using the service role key.
 * This bypasses RLS — use only in server-side API routes that need
 * to serve public data (e.g. widget config for embeds).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
