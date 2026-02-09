'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { dragIconSvg, knowledgeTypeIcons, type TabHookProps, type TabHookResult, type KnowledgeSourceSummary } from './shared/icons'
import { RichTextField } from '@/components/RichTextField'

interface ChatTabHookProps extends TabHookProps {
  knowledgeSources: KnowledgeSourceSummary[]
}

export function useChatTab({ tab, glanceId, tabIndex, glanceName, themeColor, tabs, onSave, saving, knowledgeSources, workspaceId, isPremium }: ChatTabHookProps): TabHookResult {
  const knowledgePrefix = workspaceId ? `/w/${workspaceId}` : ''
  // Saved values for change detection
  const savedWelcome = tab.welcome_message ?? ''
  const savedDirective = tab.directive ?? ''
  const defaultFailureMessage = "I'm sorry, I don't have information about that. I can only help with topics covered in my knowledge base."
  const savedFailureMessage = tab.failure_message || defaultFailureMessage
  const savedPrompts = tab.suggested_prompts ?? ['', '', '', '', '']
  const savedKnowledgeSources: string[] = tab.knowledge_sources ?? []

  // State
  const [welcomeMessage, setWelcomeMessage] = useState(savedWelcome)
  const [directive, setDirective] = useState(savedDirective)
  const [failureMessage, setFailureMessage] = useState(savedFailureMessage)
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(
    savedPrompts.length === 5 ? savedPrompts : ['', '', '', '', '']
  )
  const [selectedKnowledgeSources, setSelectedKnowledgeSources] = useState<string[]>(savedKnowledgeSources)

  // Refs for variable insertion
  const welcomeRef = useRef<HTMLTextAreaElement>(null)
  const failureRef = useRef<HTMLTextAreaElement>(null)

  // Normalize HTML for change detection — strips tags so plain-text ↔ TipTap HTML
  // comparisons don't trigger false "unsaved changes" on load
  const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()

  // Change detection
  const hasChanges =
    welcomeMessage !== savedWelcome ||
    (directive !== savedDirective && stripHtml(directive) !== stripHtml(savedDirective)) ||
    failureMessage !== savedFailureMessage ||
    JSON.stringify(suggestedPrompts) !== JSON.stringify(savedPrompts.length === 5 ? savedPrompts : ['', '', '', '', '']) ||
    JSON.stringify([...selectedKnowledgeSources].sort()) !== JSON.stringify([...savedKnowledgeSources].sort())

  // Prompt helpers
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

  const toggleKnowledgeSource = (id: string) => {
    setSelectedKnowledgeSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  // Variable insertion helpers
  const insertVariable = (variable: string) => {
    const textarea = welcomeRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const token = `{{${variable}}}`
    const newValue = welcomeMessage.slice(0, start) + token + welcomeMessage.slice(end)
    setWelcomeMessage(newValue)
    requestAnimationFrame(() => {
      textarea.focus()
      const cursorPos = start + token.length
      textarea.setSelectionRange(cursorPos, cursorPos)
    })
  }

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

  // Save handler
  const handleSave = async () => {
    return onSave({
      welcome_message: welcomeMessage,
      directive,
      failure_message: failureMessage,
      suggested_prompts: suggestedPrompts,
      knowledge_sources: selectedKnowledgeSources,
    })
  }

  // ===== Editor Sections (left side) =====
  const editorSections = (
    <>
      {/* ===== Welcome & Prompts ===== */}
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
                  {isPremium && (
                    <>
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
                    </>
                  )}
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

      {/* ===== Chat Settings ===== */}
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
                  <RichTextField
                    value={directive}
                    onChange={setDirective}
                    placeholder="e.g. You are a helpful assistant that..."
                    height={333}
                    themeColor={themeColor}
                  />
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
                {isPremium && (
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
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ===== Knowledge Sources ===== */}
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
                    <Link href={`${knowledgePrefix}/knowledge`} className="bulkaction-button w-inline-block" style={{ display: 'inline-flex' }}>
                      <div>Manage Knowledge Sources</div>
                    </Link>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="emptycontent">
                      <div className="emptystate-heading">No knowledge sources yet.</div>
                      <div className="emptystate-subheading">Add knowledge sources to power this chat tab with relevant context.</div>
                    </div>
                    <Link href={`${knowledgePrefix}/knowledge`} className="button outline w-inline-block">
                      <div>Manage Knowledge Sources</div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )

  // ===== Preview (right side) =====
  const preview = (
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
  )

  return { editorSections, preview, hasChanges, handleSave }
}
