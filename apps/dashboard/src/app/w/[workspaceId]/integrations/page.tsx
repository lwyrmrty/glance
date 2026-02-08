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

  // Fetch workspace to check Airtable key status
  let airtableConnected = false
  let airtableKeyHint: string | null = null

  const { data: wsData } = await supabase
    .from('workspaces')
    .select('airtable_api_key')
    .eq('id', workspaceId)
    .single()

  if (wsData?.airtable_api_key) {
    airtableConnected = true
    const key = wsData.airtable_api_key
    airtableKeyHint = key.slice(0, 6) + '...' + key.slice(-4)
  }

  // Fetch glances for sidebar
  const { data: glances } = await supabase
    .from('widgets')
    .select('id, name, logo_url')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <IntegrationsPage
      airtableConnected={airtableConnected}
      airtableKeyHint={airtableKeyHint}
      workspaceName={workspace.workspace_name}
      workspaceId={workspaceId}
      glances={glances ?? []}
    />
  )
}
