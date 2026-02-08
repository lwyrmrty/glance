import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validateWorkspaceAccess } from '@/lib/workspace'
import PreviewPage from '@/app/glances/[id]/preview/PreviewPage'

export default async function GlancePreviewPage({ params }: { params: Promise<{ workspaceId: string; id: string }> }) {
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

  const { data: glance } = await supabase
    .from('widgets')
    .select('*, workspaces(auth_google_enabled, auth_magic_link_enabled, auth_banner_url, auth_title, auth_subtitle)')
    .eq('id', id)
    .single()

  if (!glance) {
    redirect(`/w/${workspaceId}/glances`)
  }

  return <PreviewPage glance={glance} workspaceId={workspaceId} />
}
