'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { useToast } from '@/components/Toast'

type ActiveTab = 'integrations' | 'account-creation'

interface IntegrationsPageProps {
  airtableConnected?: boolean
  airtableKeyHint?: string | null
  workspaceName?: string
  workspaceId?: string
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
}

export function IntegrationsPage({ airtableConnected: initialAirtableConnected = false, airtableKeyHint: initialKeyHint = null, workspaceName, workspaceId, glances = [] }: IntegrationsPageProps) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<ActiveTab>('integrations')
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null)

  // Airtable integration state
  const [airtableConnected, setAirtableConnected] = useState(initialAirtableConnected)
  const [airtableKeyHint, setAirtableKeyHint] = useState(initialKeyHint)
  const [airtableKey, setAirtableKey] = useState('')
  const [airtableSaving, setAirtableSaving] = useState(false)

  // Static integration data (dynamic active status for airtable)
  const integrations = [
    {
      id: 'google',
      name: 'Google Docs / Sheets',
      image: '/images/g_ETxUbR_400x400.jpg',
      active: true,
      description: 'Share links are used directly — no API key needed.',
    },
    {
      id: 'airtable',
      name: 'Airtable',
      image: '/images/ZWWk12ss_400x400.png',
      active: airtableConnected,
      description: 'Connect your Airtable account to import bases and tables as knowledge sources.',
    },
    {
      id: 'webflow',
      name: 'Webflow',
      image: '/images/IpabLWL7_400x400.jpg',
      active: false,
      description: 'Coming soon.',
    },
  ]

  const selectedIntegration = integrations.find(i => i.id === selectedIntegrationId)

  const handleSelectIntegration = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setSelectedIntegrationId(selectedIntegrationId === id ? null : id)
  }

  const handleSaveAirtableKey = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!airtableKey.trim()) return

    setAirtableSaving(true)
    try {
      const response = await fetch('/api/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airtableApiKey: airtableKey.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      setAirtableConnected(data.airtable.connected)
      setAirtableKeyHint(data.airtable.keyHint)
      setAirtableKey('')
      showToast('Airtable connected successfully!')
    } catch (error) {
      console.error('Save Airtable key error:', error)
      showToast(error instanceof Error ? error.message : 'Failed to save API key.', 'error')
    } finally {
      setAirtableSaving(false)
    }
  }

  const handleDisconnectAirtable = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm('Disconnect Airtable? Existing Airtable knowledge sources will remain but cannot be re-synced.')) return

    setAirtableSaving(true)
    try {
      const response = await fetch('/api/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airtableApiKey: '' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect')
      }

      setAirtableConnected(false)
      setAirtableKeyHint(null)
      setAirtableKey('')
      showToast('Airtable disconnected.')
    } catch (error) {
      console.error('Disconnect Airtable error:', error)
      showToast(error instanceof Error ? error.message : 'Failed to disconnect.', 'error')
    } finally {
      setAirtableSaving(false)
    }
  }

  return (
    <div className="pagewrapper">
      <div className="pagecontent">
        <Sidebar workspaceName={workspaceName} workspaceId={workspaceId} glances={glances} />

        {/* ===== Integrations Tab ===== */}
        {activeTab === 'integrations' && (
          <div className="mainwrapper padd">
            <div className="maincontent flex">
              {/* Left Panel — Integration List */}
              <div className="textside">
                <div className="innerhero">
                  <div className="herorow">
                    <div className="pageicon-block large">
                      <img loading="lazy" src="/images/brain-circuit.svg" alt="" className="navicon page-icon" />
                    </div>
                    <div className="alignrow alignbottom">
                      <h1 className="pageheading">Integrations</h1>
                    </div>
                  </div>
                  <div className="pagesubheading">The content here is used to power your AI chat widget.</div>
                  <div className="inner-hero-nav">
                    <a
                      href="#"
                      className="innerhero-nav-link active w-inline-block"
                      onClick={(e) => { e.preventDefault(); setActiveTab('integrations') }}
                    >
                      <div>Integrations</div>
                    </a>
                    <a
                      href="#"
                      className="innerhero-nav-link w-inline-block"
                      onClick={(e) => { e.preventDefault(); setActiveTab('account-creation') }}
                    >
                      <div>Account Creation</div>
                    </a>
                  </div>
                </div>

                <div className="contentblock">
                  <div className="nonempty">
                    <div className="tablewrapper">
                      <div className="tablerows">
                        {integrations.map((integration) => (
                          <div
                            key={integration.id}
                            className={`tablerow${selectedIntegrationId === integration.id ? ' selectedrow' : ''}`}
                          >
                            <div className="tablerow-left">
                              <div className="tableblock">
                                <div className="tableimage large">
                                  <img src={integration.image} loading="lazy" alt="" className="fullimage" />
                                </div>
                                <div>
                                  <div className="alignrow aligncenter">
                                    <div className="tablename large">{integration.name}</div>
                                  </div>
                                  <div className={`tablesublabel${integration.active ? ' green' : ''}`}>
                                    {integration.active ? 'Active' : 'Not active'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="tablerow-right">
                              <div className="tableblock right">
                                <a
                                  href="#"
                                  className="tablebutton w-inline-block"
                                  style={{ opacity: selectedIntegrationId === integration.id ? 1 : undefined }}
                                  onClick={(e) => handleSelectIntegration(e, integration.id)}
                                >
                                  <div>View / Edit</div>
                                </a>
                              </div>
                              {selectedIntegrationId === integration.id && (
                                <div className="selectedcard">
                                  <div>Selected</div>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="buttonicons">
                                    <g>
                                      <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                    </g>
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel — Context Side */}
              <div className="contextside wide">
                {/* Empty state */}
                {!selectedIntegration && (
                  <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 10 }}>
                    <img
                      src="/images/datalayer.png"
                      loading="lazy"
                      alt=""
                      className="fullimage"
                    />
                  </div>
                )}

                {/* Active / Edit view */}
                {selectedIntegration && (
                  <div className="activecontent">
                    <div className="contentblock">
                      <div className="drawercontent-block _5">
                        <div className="headeralign">
                          <div className="tableimage">
                            <img src={selectedIntegration.image} loading="lazy" alt="" className="fullimage" />
                          </div>
                          <div>
                            <h2 className="sidedrawer-heading">{selectedIntegration.name}</h2>
                          </div>
                        </div>
                      </div>

                      {/* ---- Google integration detail ---- */}
                      {selectedIntegration.id === 'google' && (
                        <div className="drawercontent-block">
                          <div className="formblock w-form">
                            <form>
                              <div className="formcontent">
                                <div className="fieldblocks">
                                  <div className="labelrow">
                                    <div className="labeltext">Status</div>
                                    <div className="labeldivider"></div>
                                  </div>
                                  <div className="rowcard">
                                    <div className="alignrow aligncenter">
                                      <div className="statuscircle"></div>
                                      <div>Active</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="fieldblocks">
                                  <div className="labelrow">
                                    <div className="labeltext">How it works</div>
                                    <div className="labeldivider"></div>
                                  </div>
                                  <div className="fieldexplainer">
                                    Google Docs and Sheets are connected via share links. No API key is needed — just make sure the document is shared with &quot;Anyone with the link&quot; and paste the URL when creating a knowledge source.
                                  </div>
                                </div>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* ---- Airtable integration detail ---- */}
                      {selectedIntegration.id === 'airtable' && (
                        <div className="drawercontent-block">
                          <div className="formblock w-form">
                            <form onSubmit={(e) => e.preventDefault()}>
                              <div className="formcontent">
                                <div className="fieldblocks">
                                  <div className="labelrow">
                                    <div className="labeltext">Status</div>
                                    <div className="labeldivider"></div>
                                  </div>
                                  <div className="rowcard">
                                    <div className="alignrow aligncenter">
                                      <div className={`statuscircle${airtableConnected ? '' : ' pending'}`}></div>
                                      <div>{airtableConnected ? 'Connected' : 'Not connected'}</div>
                                    </div>
                                    {airtableConnected && airtableKeyHint && (
                                      <div className="alignright">
                                        <div className="smallsubtext">{airtableKeyHint}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="fieldblocks">
                                  <div className="labelrow">
                                    <div className="labeltext">Personal Access Token</div>
                                    <div className="labeldivider"></div>
                                  </div>
                                  <div className="fieldexplainer">
                                    Create a Personal Access Token in your{' '}
                                    <a
                                      href="https://airtable.com/create/tokens"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ textDecoration: 'underline' }}
                                    >
                                      Airtable account settings
                                    </a>
                                    . Grant it <strong>data.records:read</strong> and <strong>schema.bases:read</strong> scopes, and give it access to the bases you want to import.
                                  </div>
                                  <input
                                    className="formfields urlfield w-input"
                                    maxLength={512}
                                    name="airtable-key"
                                    placeholder={airtableConnected ? 'Enter a new token to replace the existing one...' : 'pat...'}
                                    type="password"
                                    value={airtableKey}
                                    onChange={(e) => setAirtableKey(e.target.value)}
                                    disabled={airtableSaving}
                                  />
                                </div>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* ---- Webflow integration detail ---- */}
                      {selectedIntegration.id === 'webflow' && (
                        <div className="drawercontent-block">
                          <div className="formblock w-form">
                            <form>
                              <div className="formcontent">
                                <div className="fieldblocks">
                                  <div className="labelrow">
                                    <div className="labeltext">Status</div>
                                    <div className="labeldivider"></div>
                                  </div>
                                  <div className="rowcard">
                                    <div className="alignrow aligncenter">
                                      <div className="statuscircle pending"></div>
                                      <div>Coming soon</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sticky save row */}
                    <div className="stickysave-row">
                      <div className="alignrow aligncenter _15">
                        {selectedIntegration.id === 'airtable' && (
                          <div style={{ display: 'flex', gap: 5 }}>
                            <a
                              href="#"
                              className={`buttonblock callout w-inline-block${!airtableKey.trim() ? ' disabled' : ''}`}
                              onClick={handleSaveAirtableKey}
                              style={!airtableKey.trim() || airtableSaving ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                            >
                              <div>{airtableSaving ? 'Saving...' : airtableConnected ? 'Update Key' : 'Connect'}</div>
                            </a>
                            {airtableConnected && (
                              <a
                                href="#"
                                className="buttonblock delete w-inline-block"
                                onClick={handleDisconnectAirtable}
                                style={airtableSaving ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                              >
                                <div>Disconnect</div>
                              </a>
                            )}
                          </div>
                        )}
                        {selectedIntegration.id !== 'airtable' && (
                          <div className="fieldexplainer" style={{ margin: 0 }}>No configuration needed.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== Account Creation Tab ===== */}
        {activeTab === 'account-creation' && (
          <div className="mainwrapper">
            <div className="maincontent flex">
              {/* Left Side — Form */}
              <div className="textside">
                <div className="innerhero">
                  <div className="herorow">
                    <div className="pageicon-block large">
                      <img loading="lazy" src="/images/money-with-wings_1f4b8.png" alt="" className="navicon page-icon" />
                    </div>
                    <div>
                      <div className="alignrow alignbottom">
                        <h1 className="pageheading">Integrations</h1>
                      </div>
                    </div>
                  </div>
                  <div className="inner-hero-nav">
                    <a
                      href="#"
                      className="innerhero-nav-link w-inline-block"
                      onClick={(e) => { e.preventDefault(); setActiveTab('integrations') }}
                    >
                      <div>Integrations</div>
                    </a>
                    <a
                      href="#"
                      className="innerhero-nav-link active w-inline-block"
                      onClick={(e) => { e.preventDefault(); setActiveTab('account-creation') }}
                    >
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
                          <div className="stylefield-block">
                            <div className="thumbnailpreview">
                              <img
                                src="/images/BannerForm.png"
                                loading="lazy"
                                sizes="(max-width: 4100px) 100vw, 4100px"
                                srcSet="/images/BannerForm-p-500.png 500w, /images/BannerForm-p-800.png 800w, /images/BannerForm-p-1080.png 1080w, /images/BannerForm-p-1600.png 1600w, /images/BannerForm-p-2000.png 2000w, /images/BannerForm-p-2600.png 2600w, /images/BannerForm-p-3200.png 3200w, /images/BannerForm.png 4100w"
                                alt=""
                                className="fullimage"
                              />
                            </div>
                            <div>
                              <div className="uploadtitle">logofilefinal.jpg</div>
                              <div className="uploadsubtitle">342kb</div>
                              <div className="uploadactions">
                                <a href="#" className="deletelink" onClick={(e) => e.preventDefault()}>Delete</a>
                              </div>
                            </div>
                          </div>
                          <div className="uploadcard">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="uploadicons">
                              <path d="M8 16L12 12M12 12L16 16M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                              <path d="M6.3414 6.15897C7.16507 3.73597 9.38755 2 12 2C15.3137 2 18 4.79305 18 8.23846C20.2091 8.23846 22 10.1005 22 12.3974C22 13.9368 21.1956 15.2809 20 16M6.32069 6.20644C3.8806 6.55106 2 8.72597 2 11.3576C2 13.0582 2.7854 14.5682 3.99965 15.5167" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                            <div>Upload Image</div>
                          </div>
                        </div>

                        {/* Title */}
                        <div className="fieldblocks">
                          <div className="labelrow">
                            <div className="labeltext">Title</div>
                            <div className="labeldivider"></div>
                          </div>
                          <input className="formfields w-input" maxLength={256} name="name" placeholder="" type="text" />
                        </div>

                        {/* Subtitle */}
                        <div className="fieldblocks">
                          <div className="labelrow">
                            <div className="labeltext">Subtitle</div>
                            <div className="labeldivider"></div>
                          </div>
                          <div>
                            <textarea placeholder="" maxLength={5000} className="formfields message _100 w-input"></textarea>
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
                                    <a href="#" className="settingswitch-block w-inline-block" onClick={(e) => e.preventDefault()}>
                                      <div className="switchindicator"></div>
                                    </a>
                                    <a href="#" className="settingswitch-block active w-inline-block" onClick={(e) => e.preventDefault()}>
                                      <div className="switchindicator activated"></div>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>

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
                                    <a href="#" className="settingswitch-block w-inline-block" onClick={(e) => e.preventDefault()}>
                                      <div className="switchindicator"></div>
                                    </a>
                                    <a href="#" className="settingswitch-block active w-inline-block" onClick={(e) => e.preventDefault()}>
                                      <div className="switchindicator activated"></div>
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
                    <a href="#" className="buttonblock callout w-inline-block" onClick={(e) => e.preventDefault()}>
                      <div>Save Changes</div>
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
                        <div className="tabhero no-pull">
                          <img
                            sizes="(max-width: 4100px) 100vw, 4100px"
                            srcSet="/images/BannerForm-p-500.png 500w, /images/BannerForm-p-800.png 800w, /images/BannerForm-p-1080.png 1080w, /images/BannerForm-p-1600.png 1600w, /images/BannerForm-p-2000.png 2000w, /images/BannerForm-p-2600.png 2600w, /images/BannerForm-p-3200.png 3200w, /images/BannerForm.png 4100w"
                            alt=""
                            src="/images/BannerForm.png"
                            loading="lazy"
                            className="full-image"
                          />
                        </div>
                        <div className="tabheading-wrap center">
                          <div className="tab-heading">Premium Content</div>
                          <div className="tab-subheading">Login or create your FREE account to access this content.</div>
                        </div>
                        <div className="formcontent-wrap">
                          <div className="w-form">
                            <form className="formwrap loginwrap">
                              <div>
                                <a href="#" className="google-auth-button w-inline-block" onClick={(e) => e.preventDefault()}>
                                  <img src="/images/adTFhODz_400x400.jpg" loading="lazy" alt="" className="google-icon" />
                                  <div>Continue with Google</div>
                                </a>
                              </div>
                              <div className="formfield-block">
                                <div className="labelrow">
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
                                <input className="formfields w-input" maxLength={256} placeholder="" type="text" />
                              </div>
                              <input type="submit" className="formbutton w-button" value="Send Magic Link" onClick={(e) => e.preventDefault()} />
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
        )}
      </div>
    </div>
  )
}

export default IntegrationsPage
