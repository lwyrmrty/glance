import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GlanceEditor from './GlanceEditor'

export default async function GlanceEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  // Get the user's account
  const { data: membership } = await supabase
    .from('account_memberships')
    .select('account_id')
    .eq('user_id', data.claims.sub)
    .single()

  // If editing an existing Glance, fetch it
  let glance = null
  if (id !== 'new') {
    const { data: widget } = await supabase
      .from('widgets')
      .select('*')
      .eq('id', id)
      .single()
    glance = widget
  }

  return <GlanceEditor glanceId={id} accountId={membership?.account_id} glance={glance} />
}
