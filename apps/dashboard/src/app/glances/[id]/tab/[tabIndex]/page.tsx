import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TabEditor from './TabEditor'

export default async function TabEditorPage({ params }: { params: Promise<{ id: string; tabIndex: string }> }) {
  const { id, tabIndex } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  // Fetch the glance
  const { data: glance } = await supabase
    .from('widgets')
    .select('*')
    .eq('id', id)
    .single()

  if (!glance) {
    redirect('/glances')
  }

  // Fetch knowledge sources for this account
  const { data: knowledgeSources } = await supabase
    .from('knowledge_sources')
    .select('id, name, type, sync_status, chunk_count')
    .order('created_at', { ascending: false })

  return <TabEditor glanceId={id} tabIndex={parseInt(tabIndex, 10)} glance={glance} knowledgeSources={knowledgeSources ?? []} />
}
