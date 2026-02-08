import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ============================================
// GET /api/workspaces — List all workspaces for the current user
// ============================================

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authData.claims.sub

    // Fetch all workspace memberships with workspace details and widget counts
    const { data: memberships, error } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(id, name, created_at)')
      .eq('user_id', userId)
      .order('accepted_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 })
    }

    // Get widget counts per workspace
    const workspaceIds = memberships?.map((m: any) => m.workspace_id) ?? []
    let widgetCounts: Record<string, number> = {}

    if (workspaceIds.length > 0) {
      const { data: widgets } = await supabase
        .from('widgets')
        .select('workspace_id')
        .in('workspace_id', workspaceIds)

      if (widgets) {
        for (const w of widgets) {
          widgetCounts[w.workspace_id] = (widgetCounts[w.workspace_id] || 0) + 1
        }
      }
    }

    const workspaces = (memberships ?? []).map((m: any) => ({
      id: m.workspace_id,
      name: (m.workspaces as any)?.name ?? 'Workspace',
      role: m.role,
      created_at: (m.workspaces as any)?.created_at,
      glance_count: widgetCounts[m.workspace_id] || 0,
    }))

    return NextResponse.json({ workspaces })
  } catch (error) {
    console.error('Workspaces GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST /api/workspaces — Create a new workspace
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authData.claims.sub
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }

    // Create the workspace
    const { data: workspace, error: createError } = await supabase
      .from('workspaces')
      .insert({ name: name.trim() })
      .select()
      .single()

    if (createError || !workspace) {
      console.error('Create workspace error:', createError)
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
    }

    // Make the current user the owner
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error('Create membership error:', memberError)
      // Clean up the workspace if membership fails
      await supabase.from('workspaces').delete().eq('id', workspace.id)
      return NextResponse.json({ error: 'Failed to create workspace membership' }, { status: 500 })
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        role: 'owner',
        glance_count: 0,
      },
    })
  } catch (error) {
    console.error('Workspaces POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// PATCH /api/workspaces — Rename a workspace
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing workspace id' }, { status: 400 })
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }

    // RLS ensures only workspace members can update
    const { data: updated, error: updateError } = await supabase
      .from('workspaces')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: `Failed to rename: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ workspace: updated })
  } catch (error) {
    console.error('Workspaces PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
