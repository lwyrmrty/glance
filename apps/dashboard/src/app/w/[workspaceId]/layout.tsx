import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validateWorkspaceAccess } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceId: string }>
}) {
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

  const themeColor = workspace.workspace_theme_color || '#7C3AED'

  return (
    <div style={{ ['--vcs-purple' as string]: themeColor } as React.CSSProperties}>
      {children}
    </div>
  )
}
