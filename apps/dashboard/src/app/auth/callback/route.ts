import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/glances'

  // Handle OAuth callback (code exchange)
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('Code exchange error:', error)
  }

  // Handle magic link / email OTP callback (token_hash)
  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'magiclink',
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('Token verification error:', error)
  }

  // Return the user to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
