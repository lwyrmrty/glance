import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validateWorkspaceAccess } from '@/lib/workspace'
import KnowledgePage from '@/app/knowledge/KnowledgePage'

export default async function KnowledgeRoute({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  const workspace = await validateWorkspaceAccess(supabase, data.claims.sub, workspaceId)
  if (!workspace) {
    redirect('/')
  }

  // Fetch knowledge sources scoped to this workspace
  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return <KnowledgePage initialSources={sources ?? []} workspaceName={workspace.workspace_name} workspaceId={workspaceId} />
}
