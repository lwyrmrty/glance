'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { useToast } from '@/components/Toast'
import { type KnowledgeSourceSummary } from './shared/icons'
import { useChatTab } from './ChatTabEditor'
import { useFormTab, type FormTabHookResult } from './FormTabEditor'
import { useTldrTab } from './TldrTabEditor'
import { useEmbedTab } from './EmbedTabEditor'

interface TabEditorProps {
  glanceId: string
  tabIndex: number
  glance: Record<string, unknown>
  knowledgeSources?: KnowledgeSourceSummary[]
  workspaceName?: string
  workspaceId?: string
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
}

export default function TabEditor({ glanceId, tabIndex, glance, knowledgeSources = [], workspaceName, workspaceId, glances = [] }: TabEditorProps) {
  const prefix = workspaceId ? `/w/${workspaceId}` : ''
  const router = useRouter()
  const { showToast } = useToast()

  // ===== Derive tab info =====
  const glanceName = (glance as any)?.name ?? 'Glance'
  const themeColor = (glance as any)?.theme_color ?? '#000000'
  const tabs = (glance as any)?.button_style?.tabs ?? []
  const tab = tabs[tabIndex] ?? { name: '', icon: '/images/Chats.svg', type: '' }
  const tabName = tab.name || 'Untitled Tab'
  const tabIcon = tab.icon || '/images/Chats.svg'
  const tabType = tab.type || 'Widget'
  const isTldrTab = tabType === 'TLDR' || tabType === 'Content' || tabType === 'Static Content'
  const isFormTab = tabType === 'Form'
  const isChatTab = tabType === 'AI Chat'
  const isEmbedTab = tabType === 'Tally'

  // ===== Shared state =====
  const slugify = (text: string) =>
    text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const autoHash = slugify(tabName)
  const savedHashTrigger = tab.hash_trigger ?? ''
  const savedPremium = tab.is_premium ?? false

  const [hashTrigger, setHashTrigger] = useState(savedHashTrigger || autoHash)
  const [isPremium, setIsPremium] = useState(savedPremium)
  const [saving, setSaving] = useState(false)

  // Hash duplicate check
  const resolvedHash = hashTrigger.trim() || autoHash
  const duplicateHashIndex = tabs.findIndex((t: any, i: number) => {
    if (i === tabIndex) return false
    const otherHash = (t.hash_trigger ?? slugify(t.name || '')).toLowerCase()
    return otherHash === resolvedHash.toLowerCase() && otherHash !== ''
  })
  const isDuplicateHash = duplicateHashIndex !== -1

  // ===== onSave callback for sub-editors =====
  const onSave = async (tabPayload: Record<string, any>) => {
    const supabase = createClient()
    const currentButtonStyle = (glance as any)?.button_style ?? {}
    const updatedTabs = [...tabs]
    updatedTabs[tabIndex] = {
      ...updatedTabs[tabIndex],
      hash_trigger: hashTrigger.trim() || autoHash,
      is_premium: isPremium,
      ...tabPayload,
    }
    const { error } = await supabase
      .from('widgets')
      .update({
        button_style: {
          ...currentButtonStyle,
          tabs: updatedTabs,
        },
      })
      .eq('id', glanceId)

    if (error) {
      showToast('Failed to save changes. Please try again.', 'error')
    } else {
      showToast('Changes saved successfully!')
      router.refresh()
    }
  }

  // ===== Call all three hooks unconditionally (React hooks rules) =====
  const hookProps = { tab, glanceId, tabIndex, glanceName, themeColor, tabs, onSave, saving, workspaceId, isPremium }

  const chatTab = useChatTab({ ...hookProps, knowledgeSources })
  const formTab = useFormTab(hookProps)
  const tldrTab = useTldrTab(hookProps)
  const embedTab = useEmbedTab(hookProps)

  // ===== Active sub-editor =====
  const activeTab = isChatTab ? chatTab : isFormTab ? formTab : isEmbedTab ? embedTab : tldrTab

  // Combined change detection
  const sharedHasChanges = hashTrigger !== (savedHashTrigger || autoHash) || isPremium !== savedPremium
  const hasChanges = activeTab.hasChanges || sharedHasChanges

  // Top-level save handler
  const handleSave = async () => {
    if (!hasChanges || isDuplicateHash) return
    setSaving(true)
    await activeTab.handleSave()
    setSaving(false)
  }

  // Form-specific controls (only used when isFormTab)
  const { formView, setFormView, loadSubmissions, submissions, submissionsPanel } = formTab as FormTabHookResult
  const isSubmissionsView = isFormTab && formView === 'submissions'

  return (
    <div className="pagewrapper" style={{ '--vcs-purple': themeColor } as React.CSSProperties}>
      <div className="pagecontent">
        <Sidebar workspaceName={workspaceName} workspaceId={workspaceId} glances={glances} />

        <div className="mainwrapper">
          <div className="maincontent flex">
            {/* ===== LEFT SIDE: Text / Form ===== */}
            <div className="textside">
              <div className="innerhero">
                {/* Breadcrumb */}
                <div className="innerbreadcrumb-row">
                  <Link href={`${prefix}/glances`} className="innerbreadcrumb-link">Glances</Link>
                  <div className="innerbreadcrumb-divider">/</div>
                  <Link href={`${prefix}/glances/${glanceId}`} className="innerbreadcrumb-link">{glanceName}</Link>
                  <div className="innerbreadcrumb-divider">/</div>
                  <span className="innerbreadcrumb-link w--current">{tabName} ({tabType})</span>
                </div>

                {/* Hero Row */}
                <div className="herorow">
                  <div className="pageicon-block large">
                    <img loading="lazy" src={tabIcon} alt="" className="navicon page-icon" />
                  </div>
                  <div>
                    <div className="alignrow alignbottom">
                      <h1 className="pageheading">{tabName}</h1>
                      <h1 className="pageheading subpage">{tabType}</h1>
                    </div>
                  </div>
                </div>

                {/* Sub-nav */}
                <div className="inner-hero-nav">
                  {isFormTab ? (
                    <>
                      <a
                        href="#"
                        className={`innerhero-nav-link${formView === 'settings' ? ' active' : ''} w-inline-block`}
                        onClick={(e) => { e.preventDefault(); setFormView('settings') }}
                      >
                        <div>Form Settings</div>
                      </a>
                      <a
                        href="#"
                        className={`innerhero-nav-link${formView === 'submissions' ? ' active' : ''} w-inline-block`}
                        onClick={(e) => { e.preventDefault(); setFormView('submissions'); if (submissions.length === 0) loadSubmissions() }}
                      >
                        <div>Submissions</div>
                      </a>
                      <a href="#" className="innerhero-nav-link w-inline-block">
                        <div>Analytics</div>
                      </a>
                    </>
                  ) : isEmbedTab ? (
                    <>
                      <a href="#" className="innerhero-nav-link active w-inline-block">
                        <div>Embed Settings</div>
                      </a>
                      <a href="#" className="innerhero-nav-link w-inline-block">
                        <div>Analytics</div>
                      </a>
                    </>
                  ) : isTldrTab ? (
                    <>
                      <a href="#" className="innerhero-nav-link active w-inline-block">
                        <div>TLDR Settings</div>
                      </a>
                      <a href="#" className="innerhero-nav-link w-inline-block">
                        <div>Analytics</div>
                      </a>
                    </>
                  ) : (
                    <>
                      <a href="#" className="innerhero-nav-link active w-inline-block">
                        <div>Chat Settings</div>
                      </a>
                      <a href="#" className="innerhero-nav-link w-inline-block">
                        <div>Chat History</div>
                      </a>
                      <a href="#" className="innerhero-nav-link w-inline-block">
                        <div>Analytics</div>
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* ===== Tab-specific editor sections ===== */}
              {activeTab.editorSections}

              {/* ===== Tab Trigger (shared) — hidden in submissions view ===== */}
              {!isSubmissionsView && <div className="contentblock">
                <div className="contenthead-row">
                  <h2 className="contenthead">Tab Trigger</h2>
                </div>
                <div className="formblock w-form">
                  <form>
                    <div className="formcontent">
                      <div className="fieldblocks">
                        <div className="fieldblocks">
                          <div className="labelrow">
                            <div className="labeltext">Hash to Trigger this tab</div>
                            <div className="labeldivider"></div>
                          </div>
                          <div className="fieldexplainer">For example, if your website is website.com, the URL to trigger this tab would be website.com<strong>#{resolvedHash || 'tab-name'}</strong></div>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 600, color: '#666', pointerEvents: 'none', zIndex: 1 }}>#</div>
                            <input
                              className="formfields w-input"
                              maxLength={256}
                              placeholder=""
                              type="text"
                              value={hashTrigger}
                              onChange={(e) => setHashTrigger(slugify(e.target.value))}
                              style={{
                                paddingLeft: 28,
                                paddingRight: 44,
                                ...(isDuplicateHash ? { borderColor: '#ef4444' } : {}),
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`#${resolvedHash}`)
                                showToast('Hash copied to clipboard!')
                              }}
                              style={{
                                position: 'absolute',
                                right: 10,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#888',
                                borderRadius: 4,
                              }}
                              title="Copy hash to clipboard"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                          </div>
                          {isDuplicateHash && (
                            <div style={{ color: '#ef4444', fontSize: 13, marginTop: 6, fontWeight: 500 }}>
                              This hash is already used by the &quot;{tabs[duplicateHashIndex]?.name || `Tab ${duplicateHashIndex + 1}`}&quot; tab. Each tab needs a unique hash.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

}

              {/* ===== Premium Content (shared) — hidden in submissions view ===== */}
              {!isSubmissionsView && <div className="contentblock">
                <div className="contenthead-row">
                  <h2 className="contenthead">Premium Content</h2>
                </div>
                <div className="formblock w-form">
                  <form>
                    <div className="formcontent">
                      <div className="fieldblocks">
                        <div className="fieldblocks">
                          <div className="labelrow">
                            <div className="labeltext">Mark Tab as Premium</div>
                            <div className="labeldivider"></div>
                          </div>
                          <div className="fieldexplainer">Tabs that are marked as premium content require the visitor to login in order to access.</div>
                        </div>
                        <div className="fieldblocks">
                          <div
                            className="rowcard withswitch"
                            onClick={() => setIsPremium(!isPremium)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="alignrow aligncenter" style={{ gap: 10 }}>
                              <div className="rowcard-actions">
                                <div className={`settingswitch-block${isPremium ? ' active' : ''} w-inline-block`}>
                                  <div className={`switchindicator${isPremium ? ' activated' : ''}`}></div>
                                </div>
                              </div>
                              <div>
                                <div>{isPremium ? 'Login required' : 'Available to everyone'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

}

              {/* ===== Sticky Save (shared) — hidden in submissions view ===== */}
              {!isSubmissionsView && <div className="stickysave-row">
                <div>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasChanges || saving || isDuplicateHash}
                    className="buttonblock callout w-inline-block"
                    style={{ border: 'none', cursor: hasChanges && !saving && !isDuplicateHash ? 'pointer' : 'default', opacity: hasChanges && !saving && !isDuplicateHash ? 1 : 0.5 }}
                  >
                    <div>{saving ? 'Saving...' : 'Save Changes'}</div>
                  </button>
                </div>
              </div>
}
            </div>

            {/* ===== RIGHT SIDE: Detail panel when in submissions view ===== */}
            {isSubmissionsView && (
              <div className="contextside">
                {submissionsPanel}
              </div>
            )}

            {/* ===== RIGHT SIDE: Demo Preview — hidden in submissions view ===== */}
            {!isSubmissionsView && <div className="demoside downflex">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#666',
                marginBottom: '12px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}>
                <Link
                  href={`${prefix}/glances/${glanceId}/preview`}
                  className="preview-link-hover"
                  style={{ color: themeColor, textDecoration: 'none', fontWeight: 500, opacity: 0.5, transition: 'opacity 0.15s' }}
                >
                  View Preview
                </Link>
              </div>
              <div className="_25-col center-fill-copy">
                <div className="glancewidget">
                  <div className="glancewidget-tabs" style={{ position: 'relative' }}>
                    {activeTab.preview}
                  </div>
                  <div className="glancewidget-tab-nav">
                    {tabs.filter((t: any) => t.name?.trim()).map((t: any, i: number, filtered: any[]) => {
                      // Map filtered index back to original index for navigation
                      const originalIndex = tabs.indexOf(t)
                      return (
                        <Link
                          key={i}
                          href={`${prefix}/glances/${glanceId}/tab/${originalIndex}`}
                          className={`glancewidget-tablink${i === 0 ? ' first' : ''}${i === filtered.length - 1 ? ' last' : ''}${t.name === tab.name ? ' active' : ''} w-inline-block`}
                        >
                          <img loading="lazy" src={t.icon || '/images/Chats.svg'} alt="" className="tldrwidget-icon sm" />
                          <div className="tldr-nav-label">{t.name}</div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>}
          </div>
        </div>
      </div>
    </div>
  )
}
