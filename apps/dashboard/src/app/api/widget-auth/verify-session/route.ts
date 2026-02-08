import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    const widgetId = request.nextUrl.searchParams.get('widget_id')

    if (!token || !widgetId) {
      return NextResponse.json(
        { valid: false, error: 'Missing token or widget_id' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Look up workspace_id from widget
    const { data: widget } = await supabase
      .from('widgets')
      .select('id, workspace_id')
      .eq('id', widgetId)
      .eq('is_active', true)
      .single()

    if (!widget) {
      return NextResponse.json(
        { valid: false, error: 'Widget not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Find session by token
    const { data: session } = await supabase
      .from('widget_sessions')
      .select('id, widget_user_id, expires_at')
      .eq('token', token)
      .single()

    if (!session) {
      return NextResponse.json(
        { valid: false },
        { headers: corsHeaders }
      )
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Session expired' },
        { headers: corsHeaders }
      )
    }

    // Fetch the user and verify workspace match
    const { data: user } = await supabase
      .from('widget_users')
      .select('id, email, first_name, last_name, workspace_id, status')
      .eq('id', session.widget_user_id)
      .single()

    if (!user || user.workspace_id !== widget.workspace_id || user.status !== 'active') {
      return NextResponse.json(
        { valid: false },
        { headers: corsHeaders }
      )
    }

    // Update last_active_at
    await supabase
      .from('widget_users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json(
      {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      },
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error('[Glance] verify-session error:', err)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
