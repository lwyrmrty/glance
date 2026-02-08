import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const { email, code, widget_id, first_name, last_name } = body

    if (!email || !code || !widget_id) {
      return NextResponse.json(
        { error: 'Missing email, code, or widget_id' },
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
    const normalizedEmail = email.toLowerCase()

    // Find the most recent unused, unexpired code for this email + workspace
    const { data: authCode, error: codeError } = await supabase
      .from('widget_auth_codes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('email', normalizedEmail)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (codeError || !authCode) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check max attempts
    if (authCode.attempts >= 5) {
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429, headers: corsHeaders }
      )
    }

    // Increment attempts
    await supabase
      .from('widget_auth_codes')
      .update({ attempts: authCode.attempts + 1 })
      .eq('id', authCode.id)

    // Verify code
    if (authCode.code !== code) {
      return NextResponse.json(
        { error: 'Incorrect code. Please try again.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Mark code as used
    await supabase
      .from('widget_auth_codes')
      .update({ used: true })
      .eq('id', authCode.id)

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('widget_users')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('email', normalizedEmail)
      .single()

    let user = existingUser

    if (!user) {
      // New user — require first_name and last_name
      if (!first_name || !last_name) {
        return NextResponse.json(
          { error: 'First name and last name are required for new accounts' },
          { status: 400, headers: corsHeaders }
        )
      }

      const { data: newUser, error: createError } = await supabase
        .from('widget_users')
        .insert({
          workspace_id: workspaceId,
          email: normalizedEmail,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          auth_provider: 'email',
          status: 'active',
          last_active_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError || !newUser) {
        console.error('[Glance] Failed to create widget user:', createError)
        return NextResponse.json(
          { error: 'Failed to create account' },
          { status: 500, headers: corsHeaders }
        )
      }

      user = newUser
    } else {
      // Update last_active_at for existing user
      await supabase
        .from('widget_users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    // Create session token
    const token = randomBytes(32).toString('hex')
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

    const { error: sessionError } = await supabase
      .from('widget_sessions')
      .insert({
        widget_user_id: user.id,
        token,
        expires_at: sessionExpiresAt,
      })

    if (sessionError) {
      console.error('[Glance] Failed to create session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        success: true,
        token,
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
    console.error('[Glance] verify-code error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
