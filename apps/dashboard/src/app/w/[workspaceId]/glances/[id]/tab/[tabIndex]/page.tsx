import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validateWorkspaceAccess } from '@/lib/workspace'
import TabEditor from '@/app/glances/[id]/tab/[tabIndex]/TabEditor'

export default async function TabEditorPage({ params }: { params: Promise<{ workspaceId: string; id: string; tabIndex: string }> }) {
  const { workspaceId, id, tabIndex } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  const workspace = await validateWorkspaceAccess(supabase, data.claims.sub, workspaceId)
  if (!workspace) {
    redirect('/')
  }

  // Fetch the glance
  const { data: glance } = await supabase
    .from('widgets')
    .select('*')
    .eq('id', id)
    .single()

  if (!glance) {
    redirect(`/w/${workspaceId}/glances`)
  }

  // Fetch knowledge sources for this workspace
  const { data: knowledgeSources } = await supabase
    .from('knowledge_sources')
    .select('id, name, type, sync_status, chunk_count')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  // Fetch glances for sidebar
  const { data: glances } = await supabase
    .from('widgets')
    .select('id, name, logo_url')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <TabEditor
      glanceId={id}
      tabIndex={parseInt(tabIndex, 10)}
      glance={glance}
      knowledgeSources={knowledgeSources ?? []}
      workspaceName={workspace.workspace_name}
      workspaceId={workspaceId}
      glances={glances ?? []}
    />
  )
}
