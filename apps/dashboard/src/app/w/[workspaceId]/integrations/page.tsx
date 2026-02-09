import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validateWorkspaceAccess } from '@/lib/workspace'
import IntegrationsPage from '@/app/integrations/IntegrationsPage'

export default async function IntegrationsRoute({ params }: { params: Promise<{ workspaceId: string }> }) {
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

  // Fetch Airtable keys
  const { data: airtableKeys } = await supabase
    .from('workspace_airtable_keys')
    .select('id, workspace_id, name, key_hint, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  // Fetch glances for sidebar
  const { data: glances } = await supabase
    .from('widgets')
    .select('id, name, logo_url')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(3)

  // Fetch webhooks for the webhooks tab
  const { data: webhooks } = await supabase
    .from('workspace_webhooks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return (
    <IntegrationsPage
      workspaceName={workspace.workspace_name}
      workspaceId={workspaceId}
      glances={glances ?? []}
      initialAirtableKeys={airtableKeys ?? []}
      initialWebhooks={webhooks ?? []}
    />
  )
}
