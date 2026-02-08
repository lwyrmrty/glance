import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

/**
 * GET /api/widget-auth/google?widget_id=xxx
 * 
 * Redirects to Google OAuth consent screen.
 * Uses per-workspace Google OAuth credentials.
 */
export async function GET(request: NextRequest) {
  const widgetId = request.nextUrl.searchParams.get('widget_id')

  if (!widgetId) {
    return new NextResponse('Missing widget_id', { status: 400 })
  }

  const supabase = createAdminClient()

  // Look up the workspace's Google OAuth credentials via the widget
  const { data: widget } = await supabase
    .from('widgets')
    .select('workspace_id, workspaces(auth_google_enabled, auth_google_client_id)')
    .eq('id', widgetId)
    .eq('is_active', true)
    .single()

  if (!widget) {
    return new NextResponse('Widget not found', { status: 404 })
  }

  const workspace = widget.workspaces as any
  if (!workspace?.auth_google_enabled || !workspace?.auth_google_client_id) {
    return new NextResponse('Google OAuth not configured for this workspace', { status: 400 })
  }

  const clientId = workspace.auth_google_client_id
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
  const redirectUri = `${baseUrl}/api/widget-auth/google/callback`

  // State parameter includes widget_id for the callback
  const state = Buffer.from(JSON.stringify({ widget_id: widgetId })).toString('base64url')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return NextResponse.redirect(googleAuthUrl)
}
