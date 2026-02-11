import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

const MAX_LOGO_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authData.claims.sub

    // Accept either JSON (name only) or FormData (name + optional logo)
    const contentType = request.headers.get('content-type') ?? ''
    let name: string
    let logoFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const nameVal = formData.get('name')
      name = typeof nameVal === 'string' ? nameVal : ''
      const file = formData.get('logo') as File | null
      if (file && file.size > 0 && file.type.startsWith('image/')) {
        if (file.size > MAX_LOGO_SIZE) {
          return NextResponse.json({ error: 'Logo file too large. Maximum size is 5MB.' }, { status: 400 })
        }
        logoFile = file
      }
    } else {
      const body = await request.json()
      name = body?.name ?? ''
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }

    // Use admin client to bypass RLS — we've already verified the user is authenticated
    const admin = createAdminClient()

    // Create the workspace
    const { data: workspace, error: createError } = await admin
      .from('workspaces')
      .insert({ name: name.trim() })
      .select()
      .single()

    if (createError || !workspace) {
      console.error('Create workspace error:', createError)
      const msg = createError?.message ?? 'Failed to create workspace'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // Make the current user the owner
    const { error: memberError } = await admin
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error('Create membership error:', memberError)
      await admin.from('workspaces').delete().eq('id', workspace.id)
      const msg = memberError?.message ?? 'Failed to create workspace membership'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    let logoUrl: string | null = null

    // Upload logo if provided
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop()?.toLowerCase() || 'png'
      const filePath = `${workspace.id}/workspace-logo-${Date.now()}.${fileExt}`
      const { error: uploadError } = await admin.storage
        .from('logos')
        .upload(filePath, logoFile, { contentType: logoFile.type })

      if (!uploadError) {
        const { data: urlData } = admin.storage.from('logos').getPublicUrl(filePath)
        logoUrl = urlData.publicUrl
        await admin
          .from('workspaces')
          .update({ logo_url: logoUrl })
          .eq('id', workspace.id)
      }
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        logo_url: logoUrl,
        role: 'owner',
        glance_count: 0,
        glances: [],
      },
    })
  } catch (error) {
    console.error('Workspaces POST error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ============================================
// PATCH /api/workspaces — Update workspace (name and/or logo)
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') ?? ''
    let id: string
    let name: string | null = null
    let logoFile: File | null = null
    let clearLogo = false
    let themeColor: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const idVal = formData.get('id')
      id = typeof idVal === 'string' ? idVal : ''
      const nameVal = formData.get('name')
      if (nameVal && typeof nameVal === 'string' && nameVal.trim()) {
        name = nameVal.trim()
      }
      const themeVal = formData.get('theme_color')
      if (themeVal && typeof themeVal === 'string' && themeVal.trim()) {
        themeColor = themeVal.trim()
      }
      const file = formData.get('logo') as File | null
      if (file && file.size > 0 && file.type.startsWith('image/')) {
        if (file.size > MAX_LOGO_SIZE) {
          return NextResponse.json({ error: 'Logo file too large. Maximum size is 5MB.' }, { status: 400 })
        }
        logoFile = file
      }
      clearLogo = formData.get('clear_logo') === 'true'
    } else {
      const body = await request.json()
      id = body?.id ?? ''
      name = body?.name ?? null
      if (body?.theme_color && typeof body.theme_color === 'string' && body.theme_color.trim()) {
        themeColor = body.theme_color.trim()
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing workspace id' }, { status: 400 })
    }

    if (!name && !logoFile && !clearLogo && themeColor === null) {
      return NextResponse.json({ error: 'Provide name, logo, clear_logo, or theme_color to update' }, { status: 400 })
    }

    if (themeColor !== null && !/^#[0-9A-Fa-f]{6}$/.test(themeColor)) {
      return NextResponse.json({ error: 'theme_color must be a valid hex color (e.g. #7C3AED)' }, { status: 400 })
    }

    // Verify user has access (owner or admin)
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', authData.claims.sub)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Upload logo if provided, or clear if requested
    let logoUrl: string | null | undefined = undefined
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop()?.toLowerCase() || 'png'
      const filePath = `${id}/workspace-logo-${Date.now()}.${fileExt}`
      const { error: uploadError } = await admin.storage
        .from('logos')
        .upload(filePath, logoFile, { contentType: logoFile.type })

      if (!uploadError) {
        const { data: urlData } = admin.storage.from('logos').getPublicUrl(filePath)
        logoUrl = urlData.publicUrl
      }
    } else if (clearLogo) {
      logoUrl = null
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (name) updates.name = name
    if (logoUrl !== undefined) updates.logo_url = logoUrl
    if (themeColor !== null) updates.theme_color = themeColor

    const { data: updated, error: updateError } = await admin
      .from('workspaces')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: `Failed to update: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ workspace: updated })
  } catch (error) {
    console.error('Workspaces PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
