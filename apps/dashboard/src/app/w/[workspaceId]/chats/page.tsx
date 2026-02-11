import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validateWorkspaceAccess } from '@/lib/workspace'
import { ChatsPage } from '@/app/chats/ChatsPage'

export default async function ChatsRoute({ params }: { params: Promise<{ workspaceId: string }> }) {
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

  const { data: glances } = await supabase
    .from('widgets')
    .select('id, name, logo_url')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <ChatsPage
      workspaceName={workspace.workspace_name}
      workspaceId={workspaceId}
      glances={glances ?? []}
    />
  )
}
