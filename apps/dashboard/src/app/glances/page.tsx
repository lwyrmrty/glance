import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  // Fetch all glances for this account
  const { data: glances } = await supabase
    .from('widgets')
    .select('*')
    .order('created_at', { ascending: false })

  return <DashboardClient glances={glances ?? []} />
}
