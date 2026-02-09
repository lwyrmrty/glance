'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { useToast } from '@/components/Toast'

type ActiveTab = 'integrations' | 'webhooks'

type WebhookEventType = 'account_created' | 'form_submitted' | 'chat_started'

const WEBHOOK_EVENT_OPTIONS: { value: WebhookEventType; label: string }[] = [
  { value: 'account_created', label: 'Account Created' },
  { value: 'form_submitted', label: 'Form Submitted' },
  { value: 'chat_started', label: 'Chat Started' },
]

interface Webhook {
  id: string
  workspace_id: string
  name: string
  url: string
  event_types: WebhookEventType[]
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AirtableKey {
  id: string
  workspace_id: string
  name: string
  key_hint: string
  created_at: string
  updated_at: string
}

interface IntegrationsPageProps {
  workspaceName?: string
  workspaceId?: string
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
  initialWebhooks?: Webhook[]
  initialAirtableKeys?: AirtableKey[]
}

export function IntegrationsPage({ workspaceName, workspaceId, glances = [], initialWebhooks = [], initialAirtableKeys = [] }: IntegrationsPageProps) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<ActiveTab>('integrations')
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null)

  // Airtable keys state
  const [airtableKeys, setAirtableKeys] = useState<AirtableKey[]>(initialAirtableKeys)
  const [selectedAirtableKeyId, setSelectedAirtableKeyId] = useState<string | null>(null)
  const [isCreatingAirtableKey, setIsCreatingAirtableKey] = useState(false)
  const [airtableKeyName, setAirtableKeyName] = useState('')
  const [airtableKeyValue, setAirtableKeyValue] = useState('')
  const [airtableSaving, setAirtableSaving] = useState(false)

  const selectedAirtableKey = airtableKeys.find(k => k.id === selectedAirtableKeyId)

  // Webhooks state
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks)
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null)
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false)
  const [webhookName, setWebhookName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventType[]>([])
  const [webhookSaving, setWebhookSaving] = useState(false)

  const selectedWebhook = webhooks.find(w => w.id === selectedWebhookId)

  const resetWebhookForm = () => {
    setWebhookName('')
    setWebhookUrl('')
    setWebhookEvents([])
  }

  const handleSelectWebhook = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setIsCreatingWebhook(false)
    if (selectedWebhookId === id) {
      setSelectedWebhookId(null)
    } else {
      setSelectedWebhookId(id)
      const wh = webhooks.find(w => w.id === id)
      if (wh) {
        setWebhookName(wh.name)
        setWebhookUrl(wh.url)
        setWebhookEvents(wh.event_types)
      }
    }
  }

  const handleNewWebhook = (e: React.MouseEvent) => {
    e.preventDefault()
    setSelectedWebhookId(null)
    setIsCreatingWebhook(true)
    resetWebhookForm()
  }

  const handleToggleWebhookEvent = (eventType: WebhookEventType) => {
    setWebhookEvents(prev =>
      prev.includes(eventType)
        ? prev.filter(e => e !== eventType)
        : [...prev, eventType]
    )
  }

  const handleSaveWebhook = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!webhookUrl.trim() || webhookEvents.length === 0) return

    setWebhookSaving(true)
    try {
      if (isCreatingWebhook) {
        // Create
        const res = await fetch('/api/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspaceId,
            name: webhookName.trim(),
            url: webhookUrl.trim(),
            event_types: webhookEvents,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create')
        setWebhooks(prev => [data.webhook, ...prev])
        setIsCreatingWebhook(false)
        setSelectedWebhookId(data.webhook.id)
        showToast('Webhook created!')
      } else if (selectedWebhookId) {
        // Update
        const res = await fetch('/api/webhooks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedWebhookId,
            name: webhookName.trim(),
            url: webhookUrl.trim(),
            event_types: webhookEvents,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update')
        setWebhooks(prev => prev.map(w => w.id === selectedWebhookId ? data.webhook : w))
        showToast('Webhook updated!')
      }
    } catch (err) {
      console.error('[Glance] Save webhook error:', err)
      showToast(err instanceof Error ? err.message : 'Failed to save webhook.', 'error')
    } finally {
      setWebhookSaving(false)
    }
  }

  const handleToggleWebhookActive = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selectedWebhook) return
    setWebhookSaving(true)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedWebhook.id, is_active: !selectedWebhook.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      setWebhooks(prev => prev.map(w => w.id === selectedWebhook.id ? data.webhook : w))
      showToast(data.webhook.is_active ? 'Webhook enabled.' : 'Webhook paused.')
    } catch (err) {
      showToast('Failed to toggle webhook.', 'error')
    } finally {
      setWebhookSaving(false)
    }
  }

  const handleDeleteWebhook = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selectedWebhookId) return
    if (!confirm('Delete this webhook? This action cannot be undone.')) return

    setWebhookSaving(true)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedWebhookId }),
      })
      if (!res.ok) throw new Error('Failed to delete')
      setWebhooks(prev => prev.filter(w => w.id !== selectedWebhookId))
      setSelectedWebhookId(null)
      resetWebhookForm()
      showToast('Webhook deleted.')
    } catch (err) {
      showToast('Failed to delete webhook.', 'error')
    } finally {
      setWebhookSaving(false)
    }
  }

  // Airtable key handlers
  const handleSelectAirtableKey = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setIsCreatingAirtableKey(false)
    if (selectedAirtableKeyId === id) {
      setSelectedAirtableKeyId(null)
    } else {
      setSelectedAirtableKeyId(id)
      const k = airtableKeys.find(k => k.id === id)
      if (k) {
        setAirtableKeyName(k.name)
        setAirtableKeyValue('')
      }
    }
  }

  const handleNewAirtableKey = (e: React.MouseEvent) => {
    e.preventDefault()
    setSelectedAirtableKeyId(null)
    setIsCreatingAirtableKey(true)
    setAirtableKeyName('')
    setAirtableKeyValue('')
  }

  const handleSaveAirtableKey = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isCreatingAirtableKey && !airtableKeyValue.trim()) return

    setAirtableSaving(true)
    try {
      if (isCreatingAirtableKey) {
        const res = await fetch('/api/airtable/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspaceId,
            name: airtableKeyName.trim(),
            api_key: airtableKeyValue.trim(),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create')
        setAirtableKeys(prev => [data.key, ...prev])
        setIsCreatingAirtableKey(false)
        setSelectedAirtableKeyId(data.key.id)
        setAirtableKeyName(data.key.name)
        setAirtableKeyValue('')
        showToast('Airtable key added!')
      } else if (selectedAirtableKeyId) {
        const updates: Record<string, string> = { id: selectedAirtableKeyId }
        if (airtableKeyName.trim()) updates.name = airtableKeyName.trim()
        if (airtableKeyValue.trim()) updates.api_key = airtableKeyValue.trim()

        const res = await fetch('/api/airtable/keys', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update')
        setAirtableKeys(prev => prev.map(k => k.id === selectedAirtableKeyId ? data.key : k))
        setAirtableKeyValue('')
        showToast('Airtable key updated!')
      }
    } catch (err) {
      console.error('[Glance] Save airtable key error:', err)
      showToast(err instanceof Error ? err.message : 'Failed to save key.', 'error')
    } finally {
      setAirtableSaving(false)
    }
  }

  const handleDeleteAirtableKey = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selectedAirtableKeyId) return
    if (!confirm('Delete this Airtable key? Knowledge sources using it will no longer be able to re-sync.')) return

    setAirtableSaving(true)
    try {
      const res = await fetch('/api/airtable/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedAirtableKeyId }),
      })
      if (!res.ok) throw new Error('Failed to delete')
      setAirtableKeys(prev => prev.filter(k => k.id !== selectedAirtableKeyId))
      setSelectedAirtableKeyId(null)
      setAirtableKeyName('')
      setAirtableKeyValue('')
      showToast('Airtable key deleted.')
    } catch (err) {
      showToast('Failed to delete key.', 'error')
    } finally {
      setAirtableSaving(false)
    }
  }

  // Static integration data
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
      active: airtableKeys.length > 0,
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
    setSelectedAirtableKeyId(null)
    setIsCreatingAirtableKey(false)
    setSelectedIntegrationId(selectedIntegrationId === id ? null : id)
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
                      className={`innerhero-nav-link${activeTab === 'integrations' ? ' active' : ''} w-inline-block`}
                      onClick={(e) => { e.preventDefault(); setActiveTab('integrations') }}
                    >
                      <div>Integrations</div>
                    </a>
                    <a
                      href="#"
                      className={`innerhero-nav-link${activeTab === 'webhooks' ? ' active' : ''} w-inline-block`}
                      onClick={(e) => { e.preventDefault(); setActiveTab('webhooks'); setSelectedIntegrationId(null) }}
                    >
                      <div>Webhooks</div>
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

                      {/* ---- Airtable integration detail (multi-key) ---- */}
                      {selectedIntegration.id === 'airtable' && (
                        <div className="drawercontent-block">
                          <div className="formblock w-form">
                            <div className="formcontent">
                              <div className="fieldblocks">
                                <div className="labelrow">
                                  <div className="labeltext">Status</div>
                                  <div className="labeldivider"></div>
                                </div>
                                <div className="rowcard">
                                  <div className="alignrow aligncenter">
                                    <div className={`statuscircle${airtableKeys.length > 0 ? '' : ' pending'}`}></div>
                                    <div>{airtableKeys.length > 0 ? `${airtableKeys.length} key${airtableKeys.length > 1 ? 's' : ''} connected` : 'Not connected'}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="fieldblocks">
                                <div className="labelrow">
                                  <div className="labeltext">API Keys</div>
                                  <div className="labeldivider"></div>
                                </div>
                                <div className="fieldexplainer">
                                  Add one key per Airtable account or base scope. When creating an Airtable knowledge source, you&apos;ll pick which key to use.
                                </div>

                                <div style={{ marginTop: 8 }}>
                                  <a
                                    href="#"
                                    className="buttonblock callout w-inline-block"
                                    onClick={handleNewAirtableKey}
                                    style={{ display: 'inline-flex', marginBottom: 10 }}
                                  >
                                    <div>+ Add Key</div>
                                  </a>

                                  {airtableKeys.map((k) => (
                                    <div
                                      key={k.id}
                                      className={`rowcard${selectedAirtableKeyId === k.id ? '' : ''}`}
                                      style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                                        marginBottom: 6,
                                        background: selectedAirtableKeyId === k.id ? '#f0f0f0' : undefined,
                                      }}
                                      onClick={(e) => handleSelectAirtableKey(e, k.id)}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 500 }}>{k.name || 'Untitled Key'}</div>
                                        <div className="smallsubtext">{k.key_hint}</div>
                                      </div>
                                      <div className="smallsubtext">
                                        {selectedAirtableKeyId === k.id ? 'Selected' : 'Edit'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Inline create/edit form */}
                              {(isCreatingAirtableKey || selectedAirtableKeyId) && (
                                <div className="fieldblocks" style={{ borderTop: '1px solid #eee', paddingTop: 15 }}>
                                  <div className="labelrow">
                                    <div className="labeltext">{isCreatingAirtableKey ? 'New Key' : 'Edit Key'}</div>
                                    <div className="labeldivider"></div>
                                  </div>

                                  <input
                                    className="formfields urlfield w-input"
                                    maxLength={256}
                                    placeholder="Label, e.g. Marketing Base"
                                    type="text"
                                    value={airtableKeyName}
                                    onChange={(e) => setAirtableKeyName(e.target.value)}
                                    disabled={airtableSaving}
                                    style={{ marginBottom: 8 }}
                                  />

                                  <div className="fieldexplainer">
                                    Create a Personal Access Token in your{' '}
                                    <a href="https://airtable.com/create/tokens" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                                      Airtable account settings
                                    </a>
                                    . Grant it <strong>data.records:read</strong> and <strong>schema.bases:read</strong> scopes.
                                  </div>

                                  <input
                                    className="formfields urlfield w-input"
                                    maxLength={512}
                                    placeholder={isCreatingAirtableKey ? 'pat...' : 'Enter a new token to replace...'}
                                    type="password"
                                    value={airtableKeyValue}
                                    onChange={(e) => setAirtableKeyValue(e.target.value)}
                                    disabled={airtableSaving}
                                  />
                                </div>
                              )}
                            </div>
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
                        {selectedIntegration.id === 'airtable' && (isCreatingAirtableKey || selectedAirtableKeyId) && (
                          <div style={{ display: 'flex', gap: 5 }}>
                            <a
                              href="#"
                              className={`buttonblock callout w-inline-block${(isCreatingAirtableKey && !airtableKeyValue.trim()) ? ' disabled' : ''}`}
                              onClick={handleSaveAirtableKey}
                              style={(isCreatingAirtableKey && !airtableKeyValue.trim()) || airtableSaving ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                            >
                              <div>{airtableSaving ? 'Saving...' : isCreatingAirtableKey ? 'Add Key' : 'Save Changes'}</div>
                            </a>
                            {selectedAirtableKeyId && (
                              <a
                                href="#"
                                className="buttonblock delete w-inline-block"
                                onClick={handleDeleteAirtableKey}
                                style={airtableSaving ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                              >
                                <div>Delete Key</div>
                              </a>
                            )}
                          </div>
                        )}
                        {selectedIntegration.id === 'airtable' && !isCreatingAirtableKey && !selectedAirtableKeyId && (
                          <div className="fieldexplainer" style={{ margin: 0 }}>Select a key to edit, or add a new one.</div>
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

        {/* ===== Webhooks Tab ===== */}
        {activeTab === 'webhooks' && (
          <div className="mainwrapper padd">
            <div className="maincontent flex">
              {/* Left Panel — Webhook List */}
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
                  <div className="pagesubheading">Send real-time notifications to external tools like Zapier when events happen in your Glances.</div>
                  <div className="inner-hero-nav">
                    <a
                      href="#"
                      className={`innerhero-nav-link${activeTab === 'integrations' ? ' active' : ''} w-inline-block`}
                      onClick={(e) => { e.preventDefault(); setActiveTab('integrations') }}
                    >
                      <div>Integrations</div>
                    </a>
                    <a
                      href="#"
                      className={`innerhero-nav-link${activeTab === 'webhooks' ? ' active' : ''} w-inline-block`}
                      onClick={(e) => { e.preventDefault(); setActiveTab('webhooks'); setSelectedIntegrationId(null) }}
                    >
                      <div>Webhooks</div>
                    </a>
                  </div>
                </div>

                <div className="contentblock">
                  {/* Add Webhook button */}
                  <div style={{ padding: '10px 15px 0' }}>
                    <a
                      href="#"
                      className="buttonblock callout w-inline-block"
                      onClick={handleNewWebhook}
                      style={{ display: 'inline-flex' }}
                    >
                      <div>+ Add Webhook</div>
                    </a>
                  </div>

                  {webhooks.length === 0 && !isCreatingWebhook ? (
                    <div className="nonempty" style={{ padding: 20 }}>
                      <div className="fieldexplainer" style={{ textAlign: 'center' }}>
                        No webhooks yet. Add one to start receiving event notifications.
                      </div>
                    </div>
                  ) : (
                    <div className="nonempty">
                      <div className="tablewrapper">
                        <div className="tablerows">
                          {webhooks.map((wh) => (
                            <div
                              key={wh.id}
                              className={`tablerow${selectedWebhookId === wh.id ? ' selectedrow' : ''}`}
                            >
                              <div className="tablerow-left">
                                <div className="tableblock">
                                  <div className="tableimage large" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8 }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                    </svg>
                                  </div>
                                  <div>
                                    <div className="alignrow aligncenter">
                                      <div className="tablename large">{wh.name || 'Untitled Webhook'}</div>
                                    </div>
                                    <div className={`tablesublabel${wh.is_active ? ' green' : ''}`}>
                                      {wh.is_active ? 'Active' : 'Paused'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="tablerow-right">
                                <div className="tableblock right">
                                  <a
                                    href="#"
                                    className="tablebutton w-inline-block"
                                    style={{ opacity: selectedWebhookId === wh.id ? 1 : undefined }}
                                    onClick={(e) => handleSelectWebhook(e, wh.id)}
                                  >
                                    <div>View / Edit</div>
                                  </a>
                                </div>
                                {selectedWebhookId === wh.id && (
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
                  )}
                </div>
              </div>

              {/* Right Panel — Webhook Detail / Create */}
              <div className="contextside wide">
                {/* Empty state */}
                {!selectedWebhook && !isCreatingWebhook && (
                  <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', opacity: 0.5 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <div className="fieldexplainer">Select a webhook or create a new one.</div>
                    </div>
                  </div>
                )}

                {/* Create / Edit form */}
                {(selectedWebhook || isCreatingWebhook) && (
                  <div className="activecontent">
                    <div className="contentblock">
                      <div className="drawercontent-block _5">
                        <div className="headeralign">
                          <div>
                            <h2 className="sidedrawer-heading">
                              {isCreatingWebhook ? 'New Webhook' : (selectedWebhook?.name || 'Untitled Webhook')}
                            </h2>
                          </div>
                        </div>
                      </div>

                      <div className="drawercontent-block">
                        <div className="formblock w-form">
                          <form onSubmit={(e) => e.preventDefault()}>
                            <div className="formcontent">
                              {/* Status (edit mode only) */}
                              {selectedWebhook && (
                                <div className="fieldblocks">
                                  <div className="labelrow">
                                    <div className="labeltext">Status</div>
                                    <div className="labeldivider"></div>
                                  </div>
                                  <div className="rowcard">
                                    <div className="alignrow aligncenter">
                                      <div className={`statuscircle${selectedWebhook.is_active ? '' : ' pending'}`}></div>
                                      <div>{selectedWebhook.is_active ? 'Active' : 'Paused'}</div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Name */}
                              <div className="fieldblocks">
                                <div className="labelrow">
                                  <div className="labeltext">Name</div>
                                  <div className="labeldivider"></div>
                                </div>
                                <input
                                  className="formfields urlfield w-input"
                                  maxLength={256}
                                  placeholder="e.g. Zapier — New Leads"
                                  type="text"
                                  value={webhookName}
                                  onChange={(e) => setWebhookName(e.target.value)}
                                  disabled={webhookSaving}
                                />
                              </div>

                              {/* URL */}
                              <div className="fieldblocks">
                                <div className="labelrow">
                                  <div className="labeltext">Webhook URL</div>
                                  <div className="labeldivider"></div>
                                </div>
                                <div className="fieldexplainer">
                                  The URL that will receive a POST request with a JSON payload when an event fires.
                                </div>
                                <input
                                  className="formfields urlfield w-input"
                                  maxLength={2048}
                                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                                  type="url"
                                  value={webhookUrl}
                                  onChange={(e) => setWebhookUrl(e.target.value)}
                                  disabled={webhookSaving}
                                />
                              </div>

                              {/* Event Types */}
                              <div className="fieldblocks">
                                <div className="labelrow">
                                  <div className="labeltext">Events</div>
                                  <div className="labeldivider"></div>
                                </div>
                                <div className="fieldexplainer">
                                  Choose which events should trigger this webhook.
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                  {WEBHOOK_EVENT_OPTIONS.map((opt) => (
                                    <label
                                      key={opt.value}
                                      className="rowcard"
                                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={webhookEvents.includes(opt.value)}
                                        onChange={() => handleToggleWebhookEvent(opt.value)}
                                        disabled={webhookSaving}
                                        style={{ width: 16, height: 16, accentColor: '#000' }}
                                      />
                                      <div>{opt.label}</div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>

                    {/* Sticky save row */}
                    <div className="stickysave-row">
                      <div className="alignrow aligncenter _15">
                        <div style={{ display: 'flex', gap: 5 }}>
                          <a
                            href="#"
                            className={`buttonblock callout w-inline-block${(!webhookUrl.trim() || webhookEvents.length === 0) ? ' disabled' : ''}`}
                            onClick={handleSaveWebhook}
                            style={(!webhookUrl.trim() || webhookEvents.length === 0 || webhookSaving) ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                          >
                            <div>{webhookSaving ? 'Saving...' : isCreatingWebhook ? 'Create Webhook' : 'Save Changes'}</div>
                          </a>
                          {selectedWebhook && (
                            <>
                              <a
                                href="#"
                                className="buttonblock w-inline-block"
                                onClick={handleToggleWebhookActive}
                                style={webhookSaving ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                              >
                                <div>{selectedWebhook.is_active ? 'Pause' : 'Enable'}</div>
                              </a>
                              <a
                                href="#"
                                className="buttonblock delete w-inline-block"
                                onClick={handleDeleteWebhook}
                                style={webhookSaving ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                              >
                                <div>Delete</div>
                              </a>
                            </>
                          )}
                        </div>
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
