import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KnowledgePage from './KnowledgePage'

export default async function KnowledgeRoute() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  // Fetch existing knowledge sources for this user's account
  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select('*')
    .order('created_at', { ascending: false })

  return <KnowledgePage initialSources={sources ?? []} />
}
