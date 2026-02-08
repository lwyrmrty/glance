import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { email, widget_id } = body

    if (!email || !widget_id) {
      return NextResponse.json(
        { error: 'Missing email or widget_id' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Look up workspace_id from widget
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id, workspace_id')
      .eq('id', widget_id)
      .eq('is_active', true)
      .single()

    if (widgetError || !widget) {
      return NextResponse.json(
        { error: 'Widget not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const workspaceId = widget.workspace_id

    // Rate limit: max 3 codes per email per 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('widget_auth_codes')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('email', email.toLowerCase())
      .gte('created_at', tenMinAgo)

    if (count && count >= 3) {
      return NextResponse.json(
        { error: 'Too many code requests. Please wait a few minutes.' },
        { status: 429, headers: corsHeaders }
      )
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

    // Store code
    const { error: insertError } = await supabase
      .from('widget_auth_codes')
      .insert({
        workspace_id: workspaceId,
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('[Glance] Failed to store auth code:', insertError)
      return NextResponse.json(
        { error: 'Failed to generate code' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Check if user already exists in this workspace
    const { data: existingUser } = await supabase
      .from('widget_users')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', email.toLowerCase())
      .single()

    const userExists = !!existingUser

    // Send code via Loops.so
    const loopsApiKey = process.env.LOOPS_API_KEY
    if (loopsApiKey) {
      try {
        await fetch('https://app.loops.so/api/v1/transactional', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${loopsApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactionalId: process.env.LOOPS_MAGIC_CODE_TEMPLATE_ID || '',
            email: email.toLowerCase(),
            dataVariables: {
              code,
              action: userExists ? 'login' : 'create your account',
            },
          }),
          signal: AbortSignal.timeout(10000),
        })
      } catch (err) {
        console.error('[Glance] Failed to send magic code email via Loops:', err)
        // Don't fail the request — code is stored, user can request resend
      }
    } else {
      console.warn('[Glance] LOOPS_API_KEY not set — magic code email not sent. Code:', code)
    }

    return NextResponse.json(
      { success: true, exists: userExists },
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error('[Glance] send-code error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
