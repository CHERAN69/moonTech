import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !svcKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — required for admin operations')
  }

  return createClient(url, svcKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
