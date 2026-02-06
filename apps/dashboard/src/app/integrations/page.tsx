import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IntegrationsPage from './IntegrationsPage'

export default async function IntegrationsRoute() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  // Get account membership
  const { data: membership } = await supabase
    .from('account_memberships')
    .select('account_id')
    .eq('user_id', data.claims.sub)
    .single()

  // Fetch account to check Airtable key status
  let airtableConnected = false
  let airtableKeyHint: string | null = null

  if (membership) {
    const { data: account } = await supabase
      .from('accounts')
      .select('airtable_api_key')
      .eq('id', membership.account_id)
      .single()

    if (account?.airtable_api_key) {
      airtableConnected = true
      const key = account.airtable_api_key
      airtableKeyHint = key.slice(0, 6) + '...' + key.slice(-4)
    }
  }

  return (
    <IntegrationsPage
      airtableConnected={airtableConnected}
      airtableKeyHint={airtableKeyHint}
    />
  )
}
