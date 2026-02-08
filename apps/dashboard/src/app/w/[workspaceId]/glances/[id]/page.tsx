import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validateWorkspaceAccess } from '@/lib/workspace'
import GlanceEditor from '@/app/glances/[id]/GlanceEditor'

export default async function GlanceEditorPage({ params }: { params: Promise<{ workspaceId: string; id: string }> }) {
  const { workspaceId, id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  const workspace = await validateWorkspaceAccess(supabase, data.claims.sub, workspaceId)
  if (!workspace) {
    redirect('/')
  }

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

  return <GlanceEditor glanceId={id} workspaceId={workspaceId} workspaceName={workspace.workspace_name} glance={glance} />
}
