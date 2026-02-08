import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WorkspaceDashboard from './WorkspaceDashboard'

export default async function Home() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  const userId = data.claims.sub

  // Fetch all workspace memberships with workspace details
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, created_at)')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: true })

  const workspaceList = memberships ?? []

  // 0 workspaces — send to onboarding to create their first
  if (workspaceList.length === 0) {
    redirect('/onboarding')
  }

  // 1 workspace — go straight to their glances
  if (workspaceList.length === 1) {
    redirect(`/w/${workspaceList[0].workspace_id}/glances`)
  }

  // 2+ workspaces — show the workspace dashboard
  const workspaceIds = workspaceList.map((m: any) => m.workspace_id)
  
  // Fetch all widgets (glances) for these workspaces
  const { data: widgets } = await supabase
    .from('widgets')
    .select('id, workspace_id, name, logo_url, button_style')
    .in('workspace_id', workspaceIds)
    .order('created_at', { ascending: false })

  // Group widgets by workspace_id
  const widgetsByWorkspace: Record<string, any[]> = {}
  if (widgets) {
    for (const widget of widgets) {
      if (!widgetsByWorkspace[widget.workspace_id]) {
        widgetsByWorkspace[widget.workspace_id] = []
      }
      widgetsByWorkspace[widget.workspace_id].push(widget)
    }
  }

  // Calculate tab counts for each widget
  const widgetTabCounts: Record<string, number> = {}
  if (widgets && widgets.length > 0) {
    const widgetIds = widgets.map(w => w.id)
    const { data: tabs } = await supabase
      .from('tabs')
      .select('widget_id, label')
      .in('widget_id', widgetIds)
    
    if (tabs) {
      for (const tab of tabs) {
        if (tab.label?.trim()) {
          widgetTabCounts[tab.widget_id] = (widgetTabCounts[tab.widget_id] || 0) + 1
        }
      }
    }
  }

  const workspaces = workspaceList.map((m: any) => ({
    id: m.workspace_id,
    name: (m.workspaces as any)?.name ?? 'Workspace',
    role: m.role,
    glance_count: (widgetsByWorkspace[m.workspace_id] || []).length,
    glances: (widgetsByWorkspace[m.workspace_id] || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      logo_url: w.logo_url,
      tab_count: widgetTabCounts[w.id] || 0,
    })),
  }))

  return <WorkspaceDashboard workspaces={workspaces} />
}
