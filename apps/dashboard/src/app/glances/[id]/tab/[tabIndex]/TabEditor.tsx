'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { useToast } from '@/components/Toast'

interface KnowledgeSourceSummary {
  id: string
  name: string
  type: string
  sync_status: string
  chunk_count: number
}

const knowledgeTypeIcons: Record<string, string> = {
  google_doc: '/images/google-docs.png',
  google_sheet: '/images/google-sheets.png',
  airtable_base: '/images/airtable.png',
  airtable_table: '/images/airtable.png',
}

interface TabEditorProps {
  glanceId: string
  tabIndex: number
  glance: Record<string, unknown>
  knowledgeSources?: KnowledgeSourceSummary[]
}

export default function TabEditor({ glanceId, tabIndex, glance, knowledgeSources = [] }: TabEditorProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const glanceName = (glance as any)?.name ?? 'Glance'
  const themeColor = (glance as any)?.theme_color ?? '#000000'
  const tabs = (glance as any)?.button_style?.tabs ?? []
  const tab = tabs[tabIndex] ?? { name: '', icon: '/images/Chats.svg', type: '' }
  const tabName = tab.name || 'Untitled Tab'
  const tabIcon = tab.icon || '/images/Chats.svg'
  const tabType = tab.type || 'Widget'

  // Generate a URL-safe slug from the tab name
  const slugify = (text: string) =>
    text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const autoHash = slugify(tabName)

  // Saved values for change detection
  const savedWelcome = tab.welcome_message ?? ''
  const savedDirective = tab.directive ?? ''
  const defaultFailureMessage = "I'm sorry, I don't have information about that. I can only help with topics covered in my knowledge base."
  const savedFailureMessage = tab.failure_message || defaultFailureMessage
  const savedPrompts = tab.suggested_prompts ?? ['', '', '', '', '']
  const savedHashTrigger = tab.hash_trigger ?? ''
  const savedPremium = tab.is_premium ?? false
  const savedKnowledgeSources: string[] = tab.knowledge_sources ?? []

  // Form state
  const [welcomeMessage, setWelcomeMessage] = useState(savedWelcome)
  const [directive, setDirective] = useState(savedDirective)
  const [failureMessage, setFailureMessage] = useState(savedFailureMessage)
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(
    savedPrompts.length === 5 ? savedPrompts : ['', '', '', '', '']
  )
  const [hashTrigger, setHashTrigger] = useState(savedHashTrigger || autoHash)
  const [isPremium, setIsPremium] = useState(savedPremium)
  const [selectedKnowledgeSources, setSelectedKnowledgeSources] = useState<string[]>(savedKnowledgeSources)

  const toggleKnowledgeSource = (id: string) => {
    setSelectedKnowledgeSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }
  const [saving, setSaving] = useState(false)

  const updatePrompt = (index: number, value: string) => {
    setSuggestedPrompts(prev => prev.map((p, i) => i === index ? value : p))
  }

  // Drag-and-drop for suggested prompts
  const [promptDragIndex, setPromptDragIndex] = useState<number | null>(null)
  const [promptDragOverIndex, setPromptDragOverIndex] = useState<number | null>(null)

  const handlePromptDragStart = (index: number) => setPromptDragIndex(index)
  const handlePromptDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setPromptDragOverIndex(index)
  }
  const handlePromptDrop = (index: number) => {
    if (promptDragIndex === null || promptDragIndex === index) {
      setPromptDragIndex(null)
      setPromptDragOverIndex(null)
      return
    }
    setSuggestedPrompts(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(promptDragIndex, 1)
      updated.splice(index, 0, moved)
      return updated
    })
    setPromptDragIndex(null)
    setPromptDragOverIndex(null)
  }
  const handlePromptDragEnd = () => {
    setPromptDragIndex(null)
    setPromptDragOverIndex(null)
  }

  // Check for duplicate hash across sibling tabs
  const resolvedHash = hashTrigger.trim() || autoHash
  const duplicateHashIndex = tabs.findIndex((t: any, i: number) => {
    if (i === tabIndex) return false
    const otherHash = (t.hash_trigger ?? slugify(t.name || '')).toLowerCase()
    return otherHash === resolvedHash.toLowerCase() && otherHash !== ''
  })
  const isDuplicateHash = duplicateHashIndex !== -1

  const hasChanges =
    welcomeMessage !== savedWelcome ||
    directive !== savedDirective ||
    failureMessage !== savedFailureMessage ||
    JSON.stringify(suggestedPrompts) !== JSON.stringify(savedPrompts.length === 5 ? savedPrompts : ['', '', '', '', '']) ||
    hashTrigger !== (savedHashTrigger || autoHash) ||
    isPremium !== savedPremium ||
    JSON.stringify([...selectedKnowledgeSources].sort()) !== JSON.stringify([...savedKnowledgeSources].sort())

  const handleSave = async () => {
    if (!hasChanges || isDuplicateHash) return
    setSaving(true)
    const supabase = createClient()
    const currentButtonStyle = (glance as any)?.button_style ?? {}
    const updatedTabs = [...tabs]
    updatedTabs[tabIndex] = {
      ...updatedTabs[tabIndex],
      welcome_message: welcomeMessage,
      directive,
      failure_message: failureMessage,
      suggested_prompts: suggestedPrompts,
      hash_trigger: hashTrigger.trim() || autoHash,
      is_premium: isPremium,
      knowledge_sources: selectedKnowledgeSources,
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
    setSaving(false)
  }

  // Welcome message variable insertion
  const welcomeRef = useRef<HTMLTextAreaElement>(null)

  const insertVariable = (variable: string) => {
    const textarea = welcomeRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const token = `{{${variable}}}`
    const newValue = welcomeMessage.slice(0, start) + token + welcomeMessage.slice(end)
    setWelcomeMessage(newValue)
    // Restore cursor position after the inserted token
    requestAnimationFrame(() => {
      textarea.focus()
      const cursorPos = start + token.length
      textarea.setSelectionRange(cursorPos, cursorPos)
    })
  }

  // Failure message variable insertion
  const failureRef = useRef<HTMLTextAreaElement>(null)

  const insertFailureVariable = (variable: string) => {
    const textarea = failureRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const token = `{{${variable}}}`
    const newValue = failureMessage.slice(0, start) + token + failureMessage.slice(end)
    setFailureMessage(newValue)
    requestAnimationFrame(() => {
      textarea.focus()
      const cursorPos = start + token.length
      textarea.setSelectionRange(cursorPos, cursorPos)
    })
  }

  const dragIconSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="dragicons">
      <g>
        <path d="M11 18C11 19.1 10.1 20 9 20C7.9 20 7 19.1 7 18C7 16.9 7.9 16 9 16C10.1 16 11 16.9 11 18ZM9 10C7.9 10 7 10.9 7 12C7 13.1 7.9 14 9 14C10.1 14 11 13.1 11 12C11 10.9 10.1 10 9 10ZM9 4C7.9 4 7 4.9 7 6C7 7.1 7.9 8 9 8C10.1 8 11 7.1 11 6C11 4.9 10.1 4 9 4ZM15 8C16.1 8 17 7.1 17 6C17 4.9 16.1 4 15 4C13.9 4 13 4.9 13 6C13 7.1 13.9 8 15 8ZM15 10C13.9 10 13 10.9 13 12C13 13.1 13.9 14 15 14C16.1 14 17 13.1 17 12C17 10.9 16.1 10 15 10ZM15 16C13.9 16 13 16.9 13 18C13 19.1 13.9 20 15 20C16.1 20 17 19.1 17 18C17 16.9 16.1 16 15 16Z" fill="currentColor"></path>
      </g>
    </svg>
  )

  return (
    <div className="pagewrapper" style={{ '--vcs-purple': themeColor } as React.CSSProperties}>
      <div className="pagecontent">
        <Sidebar />

        <div className="mainwrapper">
          <div className="maincontent flex">
            {/* ===== LEFT SIDE: Text / Form ===== */}
            <div className="textside">
              <div className="innerhero">
                {/* Breadcrumb */}
                <div className="innerbreadcrumb-row">
                  <Link href="/glances" className="innerbreadcrumb-link">Glances</Link>
                  <div className="innerbreadcrumb-divider">/</div>
                  <Link href={`/glances/${glanceId}`} className="innerbreadcrumb-link">{glanceName}</Link>
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
                  <a href="#" className="innerhero-nav-link active w-inline-block">
                    <div>Chat Settings</div>
                  </a>
                  <a href="#" className="innerhero-nav-link w-inline-block">
                    <div>Chat History</div>
                  </a>
                  <a href="#" className="innerhero-nav-link w-inline-block">
                    <div>Analytics</div>
                  </a>
                </div>
              </div>

              {/* ===== Content Block 1: Welcome & Prompts ===== */}
              <div className="contentblock">
                <div className="contenthead-row">
                  <h2 className="contenthead">Welcome &amp; Prompts</h2>
                </div>
                <div className="formblock w-form">
                  <form>
                    <div className="formcontent">
                      {/* Welcome Message */}
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Welcome Message</div>
                          <div className="labeldivider"></div>
                        </div>
                        <div>
                          <textarea
                            ref={welcomeRef}
                            placeholder=""
                            maxLength={5000}
                            className="formfields message _100 w-input"
                            style={{ minHeight: 120, lineHeight: '1.5em' }}
                            value={welcomeMessage}
                            onChange={(e) => setWelcomeMessage(e.target.value)}
                          ></textarea>
                          <div className="spacer10"></div>
                          <div className="alignrow aligncenter">
                            <div className="labeltext dim">User Variables:</div>
                            <a href="#" className="calloutpill w-inline-block" onClick={(e) => { e.preventDefault(); insertVariable('first_name') }}>
                              <div>First Name</div>
                            </a>
                            <a href="#" className="calloutpill w-inline-block" onClick={(e) => { e.preventDefault(); insertVariable('last_name') }}>
                              <div>Last Name</div>
                            </a>
                            <a href="#" className="calloutpill w-inline-block" onClick={(e) => { e.preventDefault(); insertVariable('email') }}>
                              <div>Email Address</div>
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Suggested Prompts */}
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Suggested Prompts <span className="dim">(up to 5)</span></div>
                          <div className="labeldivider"></div>
                        </div>
                        <div className="rowcards">
                          {suggestedPrompts.map((prompt, i) => (
                            <div
                              key={i}
                              className="rowcard withdrag"
                              draggable
                              onDragStart={() => handlePromptDragStart(i)}
                              onDragOver={(e) => handlePromptDragOver(e, i)}
                              onDrop={() => handlePromptDrop(i)}
                              onDragEnd={handlePromptDragEnd}
                              style={{
                                opacity: promptDragIndex === i ? 0.4 : 1,
                                borderTop: promptDragOverIndex === i && promptDragIndex !== null && promptDragIndex > i ? '2px solid var(--vcs-purple, #6c5ce7)' : undefined,
                                borderBottom: promptDragOverIndex === i && promptDragIndex !== null && promptDragIndex < i ? '2px solid var(--vcs-purple, #6c5ce7)' : undefined,
                                transition: 'opacity 0.15s',
                              }}
                            >
                              <div className="alignrow aligncenter stretch">
                                <div className="draggingblock moved" style={{ cursor: 'grab' }}>{dragIconSvg}</div>
                                <div className="prompt-block">
                                  <input
                                    className="formfields w-input"
                                    maxLength={256}
                                    placeholder="Example Text"
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => updatePrompt(i, e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* ===== Content Block 2: Chat Settings ===== */}
              <div className="contentblock">
                <div className="contenthead-row">
                  <h2 className="contenthead">Chat Settings</h2>
                </div>
                <div className="formblock w-form">
                  <form>
                    <div className="formcontent">
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Directive</div>
                          <div className="labeldivider"></div>
                        </div>
                        <div className="fieldexplainer">Instructions for how the chatbot should respond to users. Include key information like audience, purpose, and tone.</div>
                        <div>
                          <textarea placeholder="" maxLength={5000} className="formfields message _333 w-input" value={directive} onChange={(e) => setDirective(e.target.value)}></textarea>
                        </div>
                      </div>
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Failure Message</div>
                          <div className="labeldivider"></div>
                        </div>
                        <div className="fieldexplainer">The message displayed when the AI cannot find a sufficient answer within the knowledge sources.</div>
                        <div>
                          <textarea ref={failureRef} placeholder="" maxLength={5000} className="formfields message _100 w-input" style={{ lineHeight: '1.5em' }} value={failureMessage} onChange={(e) => setFailureMessage(e.target.value)}></textarea>
                        </div>
                        <div className="alignrow aligncenter">
                          <div className="labeltext dim">User Variables:</div>
                          <a href="#" className="calloutpill w-inline-block" onClick={(e) => { e.preventDefault(); insertFailureVariable('first_name') }}>
                            <div>First Name</div>
                          </a>
                          <a href="#" className="calloutpill w-inline-block" onClick={(e) => { e.preventDefault(); insertFailureVariable('last_name') }}>
                            <div>Last Name</div>
                          </a>
                          <a href="#" className="calloutpill w-inline-block" onClick={(e) => { e.preventDefault(); insertFailureVariable('email') }}>
                            <div>Email Address</div>
                          </a>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* ===== Content Block 3: Knowledge Sources ===== */}
              <div className="contentblock">
                <div className="contenthead-row">
                  <h2 className="contenthead">Knowledge Sources</h2>
                </div>
                <div className="formblock w-form">
                  <form>
                    <div className="formcontent">
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Knowledge Sources</div>
                          <div className="labeldivider"></div>
                        </div>
                        {knowledgeSources.length > 0 ? (
                          <>
                            <div className="fieldexplainer">Select which knowledge sources this chat tab can reference when responding to users.</div>
                            <div className="tablewrapper">
                              <div className="tablerows">
                                {knowledgeSources.map((ks) => {
                                  const isSelected = selectedKnowledgeSources.includes(ks.id)
                                  const icon = knowledgeTypeIcons[ks.type] || null
                                  return (
                                    <div
                                      key={ks.id}
                                      className={`tablerow${isSelected ? ' selectedrow' : ''}`}
                                      onClick={() => toggleKnowledgeSource(ks.id)}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <div className="tablerow-left">
                                        <div className="tableblock">
                                          <div className="checkboxwrapper">
                                            <div className={`checkboxelement${isSelected ? ' checked' : ''}`}></div>
                                          </div>
                                          <div className="tableimage">
                                            {icon ? (
                                              <img src={icon} loading="lazy" alt="" />
                                            ) : (
                                              <img src="/images/brain-circuit.svg" loading="lazy" alt="" />
                                            )}
                                          </div>
                                          <div>
                                            <div className="alignrow aligncenter">
                                              <div className="tablename">{ks.name || 'Untitled'}</div>
                                              <div className={`statuscircle${ks.sync_status === 'synced' ? '' : ks.sync_status === 'error' ? ' error' : ' pending'}`}></div>
                                            </div>
                                            <div className="tablesublabel">{ks.chunk_count} chunks</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="spacer10"></div>
                            <Link href="/knowledge" className="bulkaction-button w-inline-block" style={{ display: 'inline-flex' }}>
                              <div>Manage Knowledge Sources</div>
                            </Link>
                          </>
                        ) : (
                          <div className="empty-state">
                            <div className="emptycontent">
                              <div className="emptystate-heading">No knowledge sources yet.</div>
                              <div className="emptystate-subheading">Add knowledge sources to power this chat tab with relevant context.</div>
                            </div>
                            <Link href="/knowledge" className="button outline w-inline-block">
                              <div>Manage Knowledge Sources</div>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* ===== Content Block 4: Tab Trigger ===== */}
              <div className="contentblock">
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

              {/* ===== Content Block 5: Premium Content ===== */}
              <div className="contentblock">
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

              {/* Sticky Save */}
              <div className="stickysave-row">
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
            </div>

            {/* ===== RIGHT SIDE: Demo Preview ===== */}
            <div className="demoside downflex">
              <div className="_25-col center-fill-copy">
                <div className="glancewidget">
                  <div className="glancewidget-tabs">
                    <div className="tldrchat-wrapper chat">
                      <div className="tldrchats">
                        {welcomeMessage.trim() && (
                          <div className="glancechat-block">
                            <div className="tldrchat-bubble">
                              <div>{welcomeMessage}</div>
                            </div>
                            <div className="glancechat-label">{glanceName} &bull; just now</div>
                          </div>
                        )}
                      </div>
                      <div className="glancechat-messaging">
                        {suggestedPrompts.some(p => p.trim()) && (
                          <div className="suggested-prompts-wrapper">
                            {suggestedPrompts.filter(p => p.trim()).map((prompt, i) => (
                              <a key={i} href="#" className="suggested-prompt-pill w-inline-block" onClick={(e) => e.preventDefault()}>
                                <div>{prompt}</div>
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="glancechat-field">
                          <a href="#" className="tldrchat-send-button w-inline-block" onClick={(e) => e.preventDefault()}>
                            <img loading="lazy" src="/images/sendwaves.svg" alt="" className="sendwaves" />
                            <img loading="lazy" src="/images/sendicon.svg" alt="" className="sendicon" />
                          </a>
                          <div className="glancechat-placeholder">Type your message here...</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="glancewidget-tab-nav">
                    {tabs.filter((t: any) => t.name?.trim()).map((t: any, i: number, filtered: any[]) => (
                      <a
                        key={i}
                        href="#"
                        className={`glancewidget-tablink${i === 0 ? ' first' : ''}${i === filtered.length - 1 ? ' last' : ''}${t.name === tab.name ? ' active' : ''} w-inline-block`}
                        onClick={(e) => e.preventDefault()}
                      >
                        <img loading="lazy" src={t.icon || '/images/Chats.svg'} alt="" className="tldrwidget-icon sm" />
                        <div className="tldr-nav-label">{t.name}</div>
                      </a>
                    ))}
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
