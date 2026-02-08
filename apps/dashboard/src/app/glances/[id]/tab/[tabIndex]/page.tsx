import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveWorkspace } from '@/lib/workspace'

// Legacy route — redirects to /w/{workspaceId}/glances/{id}/tab/{tabIndex}
export default async function LegacyTabEditorPage({ params }: { params: Promise<{ id: string; tabIndex: string }> }) {
  const { id, tabIndex } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  const workspace = await getActiveWorkspace(supabase, data.claims.sub)
  if (!workspace) {
    redirect('/')
  }

  redirect(`/w/${workspace.workspace_id}/glances/${id}/tab/${tabIndex}`)
}
