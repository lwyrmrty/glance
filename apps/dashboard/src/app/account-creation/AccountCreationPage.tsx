'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/client'

interface AccountCreationPageProps {
  workspaceName?: string
  workspaceId?: string
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
}

export function AccountCreationPage({ workspaceName, workspaceId, glances }: AccountCreationPageProps) {
  // Form state
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [bannerFileName, setBannerFileName] = useState<string | null>(null)
  const [bannerFileSize, setBannerFileSize] = useState<string | null>(null)
  const [title, setTitle] = useState('Premium Content')
  const [subtitle, setSubtitle] = useState('Login or create your FREE account to access this content.')
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [magicLinkEnabled, setMagicLinkEnabled] = useState(true)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const bannerFileRef = useRef<File | null>(null)

  const handleBannerUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    bannerFileRef.current = file
    setBannerPreview(URL.createObjectURL(file))
    setBannerFileName(file.name)
    const kb = Math.round(file.size / 1024)
    setBannerFileSize(kb >= 1024 ? `${(kb / 1024).toFixed(1)}mb` : `${kb}kb`)
  }, [])

  const handleBannerDelete = useCallback(() => {
    setBannerPreview(null)
    setBannerFileName(null)
    setBannerFileSize(null)
    bannerFileRef.current = null
    if (bannerInputRef.current) bannerInputRef.current.value = ''
  }, [])

  // Load auth settings on mount
  useEffect(() => {
    if (!workspaceId) return
    fetch(`/api/workspaces/auth-settings?workspace_id=${workspaceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setGoogleEnabled(data.settings.auth_google_enabled)
          setMagicLinkEnabled(data.settings.auth_magic_link_enabled)
          setGoogleClientId(data.settings.auth_google_client_id)
          setGoogleClientSecret(data.settings.auth_google_client_secret_hint)
          setTitle(data.settings.auth_title)
          setSubtitle(data.settings.auth_subtitle)
          if (data.settings.auth_banner_url) {
            setBannerPreview(data.settings.auth_banner_url)
          }
        }
      })
      .catch(err => console.error('Failed to load auth settings:', err))
  }, [workspaceId])

  // Save auth settings
  const handleSave = useCallback(async () => {
    if (!workspaceId) return
    setSaving(true)
    try {
      // Upload banner if a new file was selected
      let bannerUrl = bannerPreview
      if (bannerFileRef.current) {
        const supabase = createClient()
        const ext = bannerFileRef.current.name.split('.').pop()
        const path = `${workspaceId}/auth-banner-${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('logos').upload(path, bannerFileRef.current, { upsert: true })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
          bannerUrl = urlData.publicUrl
          setBannerPreview(bannerUrl)
          bannerFileRef.current = null
        }
      }

      const res = await fetch('/api/workspaces/auth-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          auth_google_enabled: googleEnabled,
          auth_magic_link_enabled: magicLinkEnabled,
          auth_google_client_id: googleClientId,
          auth_google_client_secret: googleClientSecret,
          auth_banner_url: bannerUrl || '',
          auth_title: title,
          auth_subtitle: subtitle,
        }),
      })

      if (!res.ok) {
        console.error('Failed to save auth settings')
      }
    } catch (err) {
      console.error('Failed to save auth settings:', err)
    } finally {
      setSaving(false)
    }
  }, [workspaceId, googleEnabled, magicLinkEnabled, googleClientId, googleClientSecret, bannerPreview, title, subtitle])

  const prefix = workspaceId ? `/w/${workspaceId}` : ''

  return (
    <div className="pagewrapper">
      <div className="pagecontent">
        <Sidebar workspaceName={workspaceName} workspaceId={workspaceId} glances={glances} />
        <div className="mainwrapper">
          <div className="maincontent flex">
            <div className="textside">
              <div className="innerhero">
                <div className="herorow">
                  <div className="pageicon-block large">
                    <img src="/images/playerslite.svg" loading="lazy" alt="" className="heroicon" />
                  </div>
                  <div className="alignrow alignbottom">
                    <h1 className="pageheading">User Data</h1>
                  </div>
                </div>
                <div className="pagesubheading">Manage user accounts and submissions across your widgets.</div>
                <div className="inner-hero-nav">
                  <a href={`${prefix}/accounts`} className="innerhero-nav-link w-inline-block">
                    <div>Accounts</div>
                  </a>
                  <a href={`${prefix}/form-submissions`} className="innerhero-nav-link w-inline-block">
                    <div>Form Submissions</div>
                  </a>
                  <a href={`${prefix}/chats`} className="innerhero-nav-link w-inline-block">
                    <div>Chats</div>
                  </a>
                  <a href={`${prefix}/account-creation`} className="innerhero-nav-link active w-inline-block">
                    <div>Account Creation</div>
                  </a>
                </div>
              </div>

              <div className="contentblock">
                <div className="contenthead-row">
                  <h2 className="contenthead">Top Section</h2>
                </div>
                <div className="formblock w-form">
                  <form>
                    <div className="formcontent">
                      {/* Banner Image */}
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Banner Image</div>
                          <div className="labeldivider"></div>
                        </div>
                        <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />
                        {bannerPreview && (
                          <div className="stylefield-block" style={{ justifyContent: 'flex-start' }}>
                            <div className="thumbnailpreview">
                              <img src={bannerPreview} alt="" className="fullimage" />
                            </div>
                            <div>
                              <div className="uploadtitle">{bannerFileName}</div>
                              <div className="uploadsubtitle">{bannerFileSize}</div>
                              <div className="uploadactions">
                                <a href="#" className="deletelink" onClick={(e) => { e.preventDefault(); handleBannerDelete() }}>Delete</a>
                              </div>
                            </div>
                          </div>
                        )}
                        {!bannerPreview && (
                          <div className="uploadcard" style={{ cursor: 'pointer' }} onClick={() => bannerInputRef.current?.click()}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="uploadicons">
                              <path d="M8 16L12 12M12 12L16 16M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                              <path d="M6.3414 6.15897C7.16507 3.73597 9.38755 2 12 2C15.3137 2 18 4.79305 18 8.23846C20.2091 8.23846 22 10.1005 22 12.3974C22 13.9368 21.1956 15.2809 20 16M6.32069 6.20644C3.8806 6.55106 2 8.72597 2 11.3576C2 13.0582 2.7854 14.5682 3.99965 15.5167" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                            <div>Upload Image</div>
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Title</div>
                          <div className="labeldivider"></div>
                        </div>
                        <input className="formfields w-input" maxLength={256} name="name" placeholder="" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
                      </div>

                      {/* Subtitle */}
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Subtitle</div>
                          <div className="labeldivider"></div>
                        </div>
                        <div>
                          <textarea placeholder="" maxLength={5000} className="formfields message _100 w-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)}></textarea>
                        </div>
                      </div>

                      {/* Auth Provider Rows */}
                      <div className="tablewrapper">
                        <div className="tablerows">
                          {/* Google Auth */}
                          <div className="tablerow">
                            <div className="tablerow-left">
                              <div className="tableblock">
                                <div className="tableimage">
                                  <img src="/images/adTFhODz_400x400.jpg" loading="lazy" alt="" />
                                </div>
                                <div>
                                  <div className="alignrow aligncenter">
                                    <div className="tablename">Google Auth</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="tablerow-right">
                              <div className="tableblock right">
                                <div className="rowcard-actions">
                                  <a
                                    href="#"
                                    className={`settingswitch-block w-inline-block${googleEnabled ? ' active' : ''}`}
                                    onClick={(e) => { e.preventDefault(); setGoogleEnabled(!googleEnabled) }}
                                  >
                                    <div className={`switchindicator${googleEnabled ? ' activated' : ''}`}></div>
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Google Auth Credentials (shown when enabled) */}
                          {googleEnabled && (
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                              <div className="fieldblocks" style={{ marginBottom: '12px' }}>
                                <div className="labelrow">
                                  <div className="labeltext">Client ID</div>
                                  <div className="labeldivider"></div>
                                </div>
                                <input
                                  className="formfields w-input"
                                  maxLength={256}
                                  placeholder="From Google Cloud Console"
                                  type="text"
                                  value={googleClientId}
                                  onChange={(e) => setGoogleClientId(e.target.value)}
                                />
                              </div>
                              <div className="fieldblocks">
                                <div className="labelrow">
                                  <div className="labeltext">Client Secret</div>
                                  <div className="labeldivider"></div>
                                </div>
                                <input
                                  className="formfields w-input"
                                  maxLength={256}
                                  placeholder="From Google Cloud Console"
                                  type="password"
                                  value={googleClientSecret}
                                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                                />
                              </div>
                            </div>
                          )}

                          {/* Magic Link */}
                          <div className="tablerow">
                            <div className="tablerow-left">
                              <div className="tableblock">
                                <div className="tableimage">
                                  <img src="/images/icons8-google-docs.svg" loading="lazy" alt="" />
                                </div>
                                <div>
                                  <div className="alignrow aligncenter">
                                    <div className="tablename">Magic Link</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="tablerow-right">
                              <div className="tableblock right">
                                <div className="rowcard-actions">
                                  <a
                                    href="#"
                                    className={`settingswitch-block w-inline-block${magicLinkEnabled ? ' active' : ''}`}
                                    onClick={(e) => { e.preventDefault(); setMagicLinkEnabled(!magicLinkEnabled) }}
                                  >
                                    <div className={`switchindicator${magicLinkEnabled ? ' activated' : ''}`}></div>
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* Sticky Save */}
              <div className="stickysave-row">
                <div>
                  <a
                    href="#"
                    className="buttonblock callout w-inline-block"
                    onClick={(e) => { e.preventDefault(); handleSave() }}
                    style={{ opacity: saving ? 0.6 : 1, pointerEvents: saving ? 'none' : 'auto' }}
                  >
                    <div>{saving ? 'Saving...' : 'Save Changes'}</div>
                  </a>
                </div>
              </div>
            </div>

            {/* Right Side — Widget Preview */}
            <div className="demoside downflex">
              <div className="_25-col center-fill-copy">
                <div className="glancewidget">
                  <div className="glancewidget-tabs rounded">
                    <div className="widget-content account">
                      {bannerPreview ? (
                        <div className="tabhero no-pull">
                          <img alt="" src={bannerPreview} loading="lazy" className="full-image" />
                        </div>
                      ) : (
                        <div className="tabhero no-pull" style={{ background: '#e8e8e8', minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 12 }}>
                          Banner Image
                        </div>
                      )}
                      <div className="tabheading-wrap center">
                        <div className="tab-heading">{title || 'Premium Content'}</div>
                        <div className="tab-subheading">{subtitle || 'Login or create your FREE account to access this content.'}</div>
                      </div>
                      <div className="formcontent-wrap">
                        <div className="w-form">
                          <form className="formwrap loginwrap">
                            {googleEnabled && (
                              <div>
                                <a href="#" className="google-auth-button w-inline-block" onClick={(e) => e.preventDefault()}>
                                  <img src="/images/adTFhODz_400x400.jpg" loading="lazy" alt="" className="google-icon" />
                                  <div>Continue with Google</div>
                                </a>
                              </div>
                            )}
                            {googleEnabled && magicLinkEnabled && (
                              <div className="formfield-block">
                                <div className="labelrow">
                                  <div className="labeldivider"></div>
                                  <div className="formlabel smalldim">Or Use Magical Link</div>
                                  <div className="labeldivider"></div>
                                </div>
                              </div>
                            )}
                            {magicLinkEnabled && (
                              <>
                                <div className="formfield-block">
                                  <div className="labelrow">
                                    <div className="formlabel">Email Address</div>
                                    <div className="labeldivider"></div>
                                  </div>
                                  <input className="formfields w-input" maxLength={256} placeholder="" type="text" />
                                </div>
                                <input type="submit" className="formbutton w-button" value="Send Magic Link" onClick={(e) => e.preventDefault()} />
                              </>
                            )}
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
