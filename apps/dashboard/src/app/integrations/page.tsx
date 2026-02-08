import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveWorkspace } from '@/lib/workspace'

// Legacy route — redirects to /w/{workspaceId}/integrations
export default async function LegacyIntegrationsRoute() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  const workspace = await getActiveWorkspace(supabase, data.claims.sub)
  if (!workspace) {
    redirect('/')
  }

  redirect(`/w/${workspace.workspace_id}/integrations`)
}
