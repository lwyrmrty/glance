'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { useToast } from '@/components/Toast'

type ActiveTab = 'integrations'

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

      </div>
    </div>
  )
}

export default IntegrationsPage
