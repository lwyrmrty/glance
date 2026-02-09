import { createAdminClient } from '@/lib/supabase/admin'
import { fireWebhooks } from '@/lib/webhooks'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

/**
 * GET /api/widget-auth/google/callback
 * 
 * Handles Google OAuth redirect. Exchanges code for tokens,
 * finds or creates widget user, creates session, and sends
 * the token back to the widget popup via postMessage.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const stateParam = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')

  if (error) {
    return renderPopupResult({ error: 'Google authentication was cancelled.' })
  }

  if (!code || !stateParam) {
    return renderPopupResult({ error: 'Missing authorization code.' })
  }

  // Decode state
  let state: { widget_id: string }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    return renderPopupResult({ error: 'Invalid state parameter.' })
  }

  const widgetId = state.widget_id
  if (!widgetId) {
    return renderPopupResult({ error: 'Missing widget_id in state.' })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
  const redirectUri = `${baseUrl}/api/widget-auth/google/callback`

  try {
    const supabase = createAdminClient()

    // Look up workspace and Google OAuth credentials from widget
    const { data: widget } = await supabase
      .from('widgets')
      .select('id, workspace_id, workspaces(auth_google_client_id, auth_google_client_secret)')
      .eq('id', widgetId)
      .eq('is_active', true)
      .single()

    if (!widget) {
      return renderPopupResult({ error: 'Widget not found.' })
    }

    const workspace = widget.workspaces as any
    const clientId = workspace?.auth_google_client_id
    const clientSecret = workspace?.auth_google_client_secret

    if (!clientId || !clientSecret) {
      return renderPopupResult({ error: 'Google OAuth not configured for this workspace.' })
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Glance] Google token exchange failed:', tokenData)
      return renderPopupResult({ error: 'Failed to authenticate with Google.' })
    }

    // Get user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const userInfo = await userInfoRes.json()

    if (!userInfo.email) {
      return renderPopupResult({ error: 'Could not retrieve email from Google.' })
    }

    const workspaceId = widget.workspace_id
    const email = userInfo.email.toLowerCase()

    // Find or create widget user
    let { data: user } = await supabase
      .from('widget_users')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .single()

    if (!user) {
      // Create new user from Google info
      const { data: newUser, error: createError } = await supabase
        .from('widget_users')
        .insert({
          workspace_id: workspaceId,
          email,
          first_name: userInfo.given_name || userInfo.name?.split(' ')[0] || '',
          last_name: userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || '',
          auth_provider: 'google',
          google_id: userInfo.id,
          status: 'active',
          last_active_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError || !newUser) {
        console.error('[Glance] Failed to create Google user:', createError)
        return renderPopupResult({ error: 'Failed to create account.' })
      }

      user = newUser

      // Fire account_created webhooks (non-blocking)
      fireWebhooks(workspaceId, 'account_created', {
        user_id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        auth_provider: 'google',
      })
    } else {
      // Update existing user
      await supabase
        .from('widget_users')
        .update({
          last_active_at: new Date().toISOString(),
          google_id: userInfo.id,
        })
        .eq('id', user.id)
    }

    // Create session
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error: sessionError } = await supabase
      .from('widget_sessions')
      .insert({
        widget_user_id: user.id,
        token,
        expires_at: expiresAt,
      })

    if (sessionError) {
      console.error('[Glance] Failed to create session:', sessionError)
      return renderPopupResult({ error: 'Failed to create session.' })
    }

    return renderPopupResult({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    })
  } catch (err) {
    console.error('[Glance] Google OAuth callback error:', err)
    return renderPopupResult({ error: 'Something went wrong. Please try again.' })
  }
}

/**
 * Renders a small HTML page that sends the result back to the
 * parent window via postMessage, then closes itself.
 */
function renderPopupResult(data: { token?: string; user?: Record<string, unknown>; error?: string }) {
  const html = `<!DOCTYPE html>
<html>
<head><title>Glance Auth</title></head>
<body>
<p>${data.error ? 'Authentication failed. This window will close.' : 'Success! This window will close.'}</p>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage(${JSON.stringify({
        glance_auth_token: data.token || null,
        glance_auth_user: data.user || null,
        glance_auth_error: data.error || null,
      })}, '*');
    }
  } catch(e) {}
  setTimeout(function() { window.close(); }, 1500);
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
