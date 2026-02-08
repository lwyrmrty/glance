import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/workspaces/auth-settings?workspace_id=xxx
 * 
 * Returns the auth/account-creation settings for a workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = request.nextUrl.searchParams.get('workspace_id')
    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })
    }

    // RLS ensures only workspace members can read
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('auth_google_enabled, auth_magic_link_enabled, auth_google_client_id, auth_google_client_secret, auth_banner_url, auth_title, auth_subtitle')
      .eq('id', workspaceId)
      .single()

    if (error || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Mask the client secret for display (show last 4 chars)
    const maskedSecret = workspace.auth_google_client_secret
      ? '••••••••' + workspace.auth_google_client_secret.slice(-4)
      : ''

    return NextResponse.json({
      settings: {
        auth_google_enabled: workspace.auth_google_enabled,
        auth_magic_link_enabled: workspace.auth_magic_link_enabled,
        auth_google_client_id: workspace.auth_google_client_id || '',
        auth_google_client_secret_hint: maskedSecret,
        auth_banner_url: workspace.auth_banner_url || '',
        auth_title: workspace.auth_title || 'Premium Content',
        auth_subtitle: workspace.auth_subtitle || 'Login or create your FREE account to access this content.',
      },
    })
  } catch (error) {
    console.error('Auth settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/workspaces/auth-settings
 * 
 * Updates the auth/account-creation settings for a workspace.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspace_id, ...fields } = body

    if (!workspace_id) {
      return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })
    }

    // Build the update object — only include fields that were sent
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (typeof fields.auth_google_enabled === 'boolean') {
      update.auth_google_enabled = fields.auth_google_enabled
    }
    if (typeof fields.auth_magic_link_enabled === 'boolean') {
      update.auth_magic_link_enabled = fields.auth_magic_link_enabled
    }
    if (typeof fields.auth_google_client_id === 'string') {
      update.auth_google_client_id = fields.auth_google_client_id.trim() || null
    }
    // Only update secret if a new value was provided (not the masked hint)
    if (typeof fields.auth_google_client_secret === 'string' && !fields.auth_google_client_secret.startsWith('••••')) {
      update.auth_google_client_secret = fields.auth_google_client_secret.trim() || null
    }
    if (typeof fields.auth_banner_url === 'string') {
      update.auth_banner_url = fields.auth_banner_url || null
    }
    if (typeof fields.auth_title === 'string') {
      update.auth_title = fields.auth_title
    }
    if (typeof fields.auth_subtitle === 'string') {
      update.auth_subtitle = fields.auth_subtitle
    }

    // RLS ensures only workspace members can update
    const { error: updateError } = await supabase
      .from('workspaces')
      .update(update)
      .eq('id', workspace_id)

    if (updateError) {
      console.error('Auth settings update error:', updateError)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Auth settings PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
