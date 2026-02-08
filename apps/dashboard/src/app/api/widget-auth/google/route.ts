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
 * This is called from the widget popup window.
 */
export async function GET(request: NextRequest) {
  const widgetId = request.nextUrl.searchParams.get('widget_id')

  if (!widgetId) {
    return new NextResponse('Missing widget_id', { status: 400 })
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!clientId) {
    return new NextResponse('Google OAuth not configured', { status: 500 })
  }

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
