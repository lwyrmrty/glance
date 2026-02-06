'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the magic link!')
    }
    setLoading(false)
  }

  return (
    <div className="adminpage-wrapper nopadding">
      <div className="admin-wrapper tall">
        <div className="logincontent">
          <div className="loginblock">
            <div className="loginform-wrapper">
              <img src="/images/glancefulllogo.svg" loading="lazy" alt="" className="loginlogo" />
              <div className="loginhead-wrap">
                <div className="loginheader">Login</div>
                <div className="loginsubheader">Don&apos;t have an account? <a href="/signup" className="inlinelink">Sign up here</a>.</div>
              </div>
              <div className="w-form">
                <form onSubmit={handleMagicLink} className="formwrap loginwrap main-page">
                  <div>
                    <button 
                      type="button" 
                      onClick={handleGoogleLogin} 
                      disabled={loading}
                      className="google-auth-button w-inline-block"
                      style={{ width: '100%', cursor: loading ? 'wait' : 'pointer' }}
                    >
                      <img src="/images/adTFhODz_400x400.jpg" loading="lazy" alt="" className="google-icon" />
                      <div>{loading ? 'Please wait...' : 'Continue with Google'}</div>
                    </button>
                  </div>
                  <div className="formfield-block">
                    <div className="labelrow more-space">
                      <div className="labeldivider"></div>
                      <div className="formlabel smalldim">Or Use Magical Link</div>
                      <div className="labeldivider"></div>
                    </div>
                  </div>
                  <div className="formfield-block">
                    <div className="labelrow">
                      <div className="formlabel">Email Address</div>
                      <div className="labeldivider"></div>
                    </div>
                    <input 
                      className="formfields w-input" 
                      maxLength={256} 
                      name="Email-Address" 
                      placeholder="" 
                      type="email" 
                      id="Email-Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="formbutton black w-button"
                    style={{ width: '100%', cursor: loading ? 'wait' : 'pointer' }}
                  >
                    {loading ? 'Please wait...' : 'Send Magic Code'}
                  </button>
                </form>
                {message && (
                  <div className={message.includes('Check your email') ? 'w-form-done' : 'w-form-fail'} style={{ display: 'block' }}>
                    <div>{message}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="loginimage-side">
          <div className="loginimage">
            <img 
              src="/images/litebgoption.webp" 
              loading="lazy" 
              sizes="(max-width: 5001px) 100vw, 5001px" 
              srcSet="/images/litebgoption-p-500.webp 500w, /images/litebgoption-p-800.webp 800w, /images/litebgoption-p-1080.webp 1080w, /images/litebgoption-p-1600.webp 1600w, /images/litebgoption-p-2000.webp 2000w, /images/litebgoption-p-2600.webp 2600w, /images/litebgoption-p-3200.webp 3200w, /images/litebgoption.webp 5001w" 
              alt="" 
              className="full-image" 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
