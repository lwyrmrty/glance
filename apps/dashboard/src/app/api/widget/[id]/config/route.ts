import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// CORS headers for cross-origin widget requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = createAdminClient()

  const { data: widget, error } = await supabase
    .from('widgets')
    .select('id, workspace_id, name, logo_url, theme_color, button_style, is_active, workspaces(auth_google_enabled, auth_magic_link_enabled, auth_banner_url, auth_title, auth_subtitle)')
    .eq('id', id)
    .single()

  if (error || !widget) {
    return NextResponse.json(
      { error: 'Widget not found' },
      { status: 404, headers: corsHeaders }
    )
  }

  if (!widget.is_active) {
    return NextResponse.json(
      { error: 'Widget is not active' },
      { status: 404, headers: corsHeaders }
    )
  }

  const buttonStyle = (widget.button_style as Record<string, unknown>) ?? {}
  const workspace = widget.workspaces as any

  // Build the config object the widget expects
  const config = {
    id: widget.id,
    workspace_id: widget.workspace_id,
    name: widget.name,
    logo_url: widget.logo_url,
    theme_color: widget.theme_color,
    tabs: (buttonStyle.tabs as unknown[]) ?? [],
    prompts: (buttonStyle.prompts as unknown[]) ?? [],
    callout_text: (buttonStyle.callout_text as string) ?? '',
    callout_url: (buttonStyle.callout_url as string) ?? '',
    auth: {
      google_enabled: workspace?.auth_google_enabled ?? false,
      magic_link_enabled: workspace?.auth_magic_link_enabled ?? true,
      banner_url: workspace?.auth_banner_url ?? null,
      title: workspace?.auth_title ?? 'Premium Content',
      subtitle: workspace?.auth_subtitle ?? 'Login or create your FREE account to access this content.',
    },
  }

  return NextResponse.json(config, {
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  })
}
