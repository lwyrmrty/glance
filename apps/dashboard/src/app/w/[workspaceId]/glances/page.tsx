import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validateWorkspaceAccess } from '@/lib/workspace'
import DashboardClient from '@/app/glances/DashboardClient'

export default async function DashboardPage({ params }: { params: Promise<{ workspaceId: string }> }) {
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

  // Fetch glances scoped to this workspace
  const { data: glances } = await supabase
    .from('widgets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  // Calculate tab counts for each widget
  const widgetTabCounts: Record<string, number> = {}
  if (glances && glances.length > 0) {
    const widgetIds = glances.map(w => w.id).filter(Boolean)
    if (widgetIds.length > 0) {
      const { data: tabs, error: tabsError } = await supabase
        .from('tabs')
        .select('widget_id')
        .in('widget_id', widgetIds)
      
      if (tabsError) {
        console.error('Error fetching tabs:', tabsError)
      }
      
      if (tabs && Array.isArray(tabs)) {
        for (const tab of tabs) {
          if (tab?.widget_id) {
            widgetTabCounts[tab.widget_id] = (widgetTabCounts[tab.widget_id] || 0) + 1
          }
        }
      }
    }
  }

  // Add tab_count to each glance
  const glancesWithTabCounts = (glances ?? []).map((glance: any) => ({
    ...glance,
    tab_count: widgetTabCounts[glance.id] || 0
  }))

  return <DashboardClient glances={glancesWithTabCounts} workspaceName={workspace.workspace_name} workspaceId={workspaceId} />
}
