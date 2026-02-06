'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { useState, useRef, useEffect, useCallback } from 'react'

interface Glance {
  id: string
  account_id: string
  name: string
  logo_url: string | null
  domain: string | null
  theme_color: string
  button_style: Record<string, unknown>
  hash_prefix: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface PreviewPageProps {
  glance: Glance
}

interface ChatMessage {
  role: 'assistant' | 'user'
  content: string
  timestamp: Date
}

interface TabConfig {
  name: string
  icon: string
  type: string
  welcome_message?: string
  directive?: string
  failure_message?: string
  suggested_prompts?: string[]
  knowledge_sources?: string[]
}

export function PreviewPage({ glance }: PreviewPageProps) {
  const buttonStyle = glance.button_style as {
    tabs?: TabConfig[]
    prompts?: { text: string; link: string }[]
    callout_text?: string
    callout_url?: string
  }

  const tabs = (buttonStyle?.tabs ?? []).filter(t => t.name?.trim())
  const prompts = (buttonStyle?.prompts ?? []).filter(p => p.text?.trim())
  const calloutText = buttonStyle?.callout_text ?? ''
  const widgetIcon = glance.logo_url ?? '/images/glance-default.png'

  // Find the first chat tab
  const chatTabIndex = tabs.findIndex(t => t.type === 'AI Chat' || t.type === 'chat' || t.type === 'ai-chat')
  const [activeTabIndex, setActiveTabIndex] = useState(chatTabIndex >= 0 ? chatTabIndex : 0)
  const activeTab = tabs[activeTabIndex]
  const isChatTab = activeTab && (activeTab.type === 'AI Chat' || activeTab.type === 'chat' || activeTab.type === 'ai-chat')
  const isTldrTab = activeTab && activeTab.type === 'TLDR'

  // Widget open/close state
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(true) // true = initial page load entrance

  // After initial entrance animations complete, mark as loaded
  useEffect(() => {
    const timer = setTimeout(() => setHasLoadedOnce(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  // Chat state
  const MAX_MESSAGE_LENGTH = 500
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showPrompts, setShowPrompts] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback(() => {
    const textarea = inputRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  // Initialize welcome message
  useEffect(() => {
    if (isChatTab && activeTab?.welcome_message?.trim()) {
      setMessages([{
        role: 'assistant',
        content: activeTab.welcome_message,
        timestamp: new Date(),
      }])
    } else {
      setMessages([])
    }
    setShowPrompts(true)
  }, [activeTabIndex])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat tab opens
  useEffect(() => {
    if (isChatTab) {
      inputRef.current?.focus()
    }
  }, [activeTabIndex])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setShowPrompts(false)
    setIsStreaming(true)
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    // Add a placeholder for the assistant response
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      // Build history from previous messages (exclude welcome message and current)
      const history = messages
        .filter(m => m.content.trim())
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetId: glance.id,
          tabIndex: activeTabIndex,
          message: text.trim(),
          history,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Chat request failed')
      }

      // Read the SSE stream
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)

          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              fullContent += parsed.content
              // Update the last message (assistant placeholder)
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: fullContent,
                }
                return updated
              })
            }
          } catch {
            // Skip malformed data
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      // Update the assistant message with error
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Sorry, something went wrong. Please try again.',
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      inputRef.current?.focus()
    }
  }, [isStreaming, messages, glance.id, activeTabIndex])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  const handlePromptClick = (promptText: string) => {
    sendMessage(promptText)
  }

  const resolveHashToTab = (hash: string): number => {
    if (!hash || !hash.startsWith('#glance-')) return -1
    const hashSlug = hash.replace('#glance-', '')
    return tabs.findIndex(t =>
      t.name.toLowerCase().replace(/\s+/g, '-') === hashSlug ||
      (t as any).hash_trigger === hashSlug
    )
  }

  const openWidgetToTab = (tabIndex?: number) => {
    if (tabIndex !== undefined && tabIndex >= 0) {
      setActiveTabIndex(tabIndex)
    }
    setWidgetOpen(true)
  }

  const handleWidgetPromptClick = (prompt: { text: string; link: string }) => {
    if (!prompt.link) return

    const targetIndex = resolveHashToTab(prompt.link)
    if (targetIndex === -1) return

    const targetTab = tabs[targetIndex]
    const isTargetChat = targetTab.type === 'AI Chat' || targetTab.type === 'chat' || targetTab.type === 'ai-chat'

    openWidgetToTab(targetIndex)

    if (isTargetChat && prompt.text.trim()) {
      // Small delay to let the tab switch render, then send the message
      setTimeout(() => {
        sendMessage(prompt.text)
      }, 150)
    }
  }

  const handleCalloutClick = () => {
    const calloutUrl = buttonStyle?.callout_url ?? ''
    if (calloutUrl.startsWith('#glance-')) {
      const targetIndex = resolveHashToTab(calloutUrl)
      if (targetIndex >= 0) {
        openWidgetToTab(targetIndex)
        return
      }
    }
    // If no tab link, just open the widget
    openWidgetToTab()
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin === 1) return '1 min ago'
    return `${diffMin} min ago`
  }

  const suggestedPrompts = (activeTab?.suggested_prompts ?? []).filter((p: string) => p.trim())

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', position: 'relative' }}>
      {/* Back to editor link */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '8px 14px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        fontSize: '13px',
        color: '#666',
      }}>
        <Link
          href={`/glances/${glance.id}`}
          style={{ color: glance.theme_color, textDecoration: 'none', fontWeight: 500 }}
        >
          ← Back to Editor
        </Link>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>Preview of <strong>{glance.name}</strong></span>
      </div>

      {/* Widget in bottom right, matching demo.html layout */}
      <div className="glancewrapper" style={{ '--vcs-purple': glance.theme_color } as React.CSSProperties}>
        <div className="glancewidget" style={{
          display: widgetOpen ? 'flex' : 'none',
          animation: widgetOpen ? 'widgetSlideUp 0.25s ease-out' : undefined,
        }}>
          <div className="glancewidget-tabs">
            {/* Chat tab content */}
            {isChatTab && (
              <div className="tldrchat-wrapper chat" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="tldrchats" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`glancechat-block${msg.role === 'user' ? ' userchat-block' : ''}`}
                      style={{
                        opacity: msg.content ? 1 : 0.5,
                        animation: 'fadeInUp 0.2s ease-out',
                      }}
                    >
                      <div className={`tldrchat-bubble${msg.role === 'user' ? ' userchat' : ''}`}>
                        {msg.role === 'user' ? (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        ) : (
                          <div className="chat-markdown">
                            {msg.content ? (
                              <ReactMarkdown
                                components={{
                                  a: ({ href, children }) => (
                                    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                                  ),
                                }}
                              >{msg.content}</ReactMarkdown>
                            ) : (
                              isStreaming && i === messages.length - 1 ? '...' : ''
                            )}
                          </div>
                        )}
                      </div>
                      <div className="glancechat-label">
                        {msg.role === 'user' ? 'You' : glance.name} &bull; {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="glancechat-messaging" style={{ position: 'relative', flexShrink: 0 }}>
                  {suggestedPrompts.length > 0 && (
                    <div className="suggested-prompts-wrapper">
                      {suggestedPrompts.map((prompt: string, i: number) => (
                        <a
                          key={i}
                          href="#"
                          className="suggested-prompt-pill w-inline-block"
                          onClick={(e) => { e.preventDefault(); handlePromptClick(prompt) }}
                        >
                          <div>{prompt}</div>
                        </a>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
                    <div className="glancechat-field" style={{ position: 'relative' }}>
                      <button
                        type="submit"
                        className="tldrchat-send-button w-inline-block"
                        style={{ border: 'none', background: 'transparent', opacity: inputValue.trim() && !isStreaming ? 1 : 0.4, color: 'var(--vcs-purple)' }}
                        disabled={!inputValue.trim() || isStreaming}
                      >
                        <svg className="sendwaves" width="9" height="13" viewBox="0 0 9 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7.04289 11.0572H4M7.04289 6.02859H1M7.04289 1H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <svg className="sendicon" width="22" height="21" viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20.0737 10.3994L4.27432 10.3994M2.95791 1.14439L19.5271 9.17792C20.5474 9.67264 20.5474 11.1262 19.5271 11.621L2.95791 19.6545C1.82281 20.2049 0.616313 19.0446 1.12194 17.8889L4.1605 10.9436C4.31226 10.5967 4.31226 10.2022 4.1605 9.85532L1.12194 2.91004C0.616314 1.75432 1.82281 0.594039 2.95791 1.14439Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <textarea
                        ref={inputRef}
                        value={inputValue}
                        maxLength={MAX_MESSAGE_LENGTH}
                        rows={1}
                        onChange={(e) => {
                          setInputValue(e.target.value)
                          autoResize()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (inputValue.trim() && !isStreaming) {
                              sendMessage(inputValue)
                            }
                          }
                        }}
                        placeholder="Type your message here..."
                        disabled={isStreaming}
                        style={{
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          padding: '0 50px 0 16px',
                          fontSize: '15.55px',
                          fontFamily: 'inherit',
                          color: '#333',
                          resize: 'none',
                          lineHeight: '1.4',
                          overflow: 'hidden',
                        }}
                      />
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TLDR tab */}
            {isTldrTab && (
              <div className="widget-content tldr">
                {/* Hero Banner */}
                {(activeTab as any).tldr_banner_url ? (
                  <div className="tabhero">
                    <img src={(activeTab as any).tldr_banner_url} alt="" className="full-image" loading="lazy" />
                  </div>
                ) : (
                  <div className="tabhero" style={{ background: '#e8e8e8', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>
                    Banner Image
                  </div>
                )}
                {/* Logo + Name Block */}
                <div className="course-logo-block">
                  <div className="logo-row">
                    {(activeTab as any).tldr_logo_url ? (
                      <div className="widget-logo">
                        <img src={(activeTab as any).tldr_logo_url} alt="" className="full-image" loading="lazy" />
                      </div>
                    ) : (
                      <div className="widget-logo" style={{ background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 10 }}>
                        Logo
                      </div>
                    )}
                    <div className="widget-name-block">
                      <div className="widget-name">{(activeTab as any).tldr_title || glance.name}</div>
                      <div className="widget-subname">{(activeTab as any).tldr_subtitle || ''}</div>
                    </div>
                  </div>
                  {/* Social Icons */}
                  {((activeTab as any).tldr_socials ?? []).some((s: any) => s.url?.trim()) && (
                    <div className="widget-social-row">
                      {((activeTab as any).tldr_socials ?? []).filter((s: any) => s.url?.trim()).map((s: any, i: number) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="widget-social-icons w-inline-block">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="social-ico">
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {/* Content Link Rows */}
                {((activeTab as any).tldr_content_links ?? []).length > 0 && (
                  <div className="content-rows">
                    {((activeTab as any).tldr_content_links ?? []).filter((cl: any) => cl.title?.trim()).map((cl: any, i: number) => (
                      <a
                        key={i}
                        href={cl.link || '#'}
                        className="content-row-link w-inline-block"
                        onClick={(e) => {
                          e.preventDefault()
                          if (cl.tabLink) {
                            const targetIndex = tabs.findIndex((t: any) =>
                              `#glance-${t.name.toLowerCase().replace(/\s+/g, '-')}` === cl.tabLink
                            )
                            if (targetIndex >= 0) setActiveTabIndex(targetIndex)
                          }
                        }}
                      >
                        {cl.image_url ? (
                          <div className="content-row-image">
                            <img src={cl.image_url} alt="" className="full-image" loading="lazy" />
                          </div>
                        ) : (
                          <div className="content-row-image" style={{ background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 10 }}>
                            IMG
                          </div>
                        )}
                        <div className="content-row-block">
                          <div className="content-row-header">{cl.title}</div>
                          <div className="content-row-subheader">{cl.description || ''}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Non-chat, non-TLDR tab placeholder */}
            {!isChatTab && !isTldrTab && (
              <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>
                <div>{activeTab?.name || 'Tab'}</div>
                <div style={{ marginTop: 8, fontSize: 12 }}>({activeTab?.type || 'Widget'})</div>
              </div>
            )}
          </div>
          <div className="glancewidget-tab-nav">
            {tabs.map((tab, index, filtered) => (
              <a
                key={index}
                href="#"
                className={`glancewidget-tablink${index === 0 ? ' first' : ''}${index === filtered.length - 1 ? ' last' : ''}${index === activeTabIndex ? ' active' : ''} w-inline-block`}
                onClick={(e) => { e.preventDefault(); setActiveTabIndex(index) }}
              >
                <img loading="lazy" src={tab.icon} alt="" className="tldrwidget-icon sm" />
                <div className="tldr-nav-label">{tab.name}</div>
              </a>
            ))}
          </div>
        </div>
        {prompts.length > 0 && !widgetOpen && (
          <div className="glanceprompts">
            {prompts.map((prompt, index) => {
              // On initial load: stagger bottom-to-top with longer delays
              // On re-open: shorter stagger bottom-to-top
              const promptDelay = hasLoadedOnce
                ? 1200 + (prompts.length - 1 - index) * 200
                : 100 + (prompts.length - 1 - index) * 80
              return (
                <a
                  key={index}
                  href={prompt.link || '#'}
                  className="glanceprompt w-inline-block"
                  onClick={(e) => { e.preventDefault(); handleWidgetPromptClick(prompt) }}
                  style={{
                    opacity: 0,
                    animation: `promptSlideIn 0.4s ease-out ${promptDelay}ms forwards`,
                  }}
                >
                  <div>{prompt.text}</div>
                </a>
              )
            })}
          </div>
        )}
        <div className="glancebutton-row">
          {calloutText && (
            <a
              href="#"
              className="glancebutton wide w-inline-block"
              onClick={(e) => { e.preventDefault(); handleCalloutClick() }}
              style={{
                opacity: 0,
                animation: 'calloutSlideUp 0.4s ease-out 800ms forwards',
              }}
            >
              <div>{calloutText}</div>
            </a>
          )}
          <a
            href="#"
            className="glancebutton w-inline-block"
            onClick={(e) => { e.preventDefault(); setWidgetOpen(prev => !prev) }}
            style={{
              opacity: 0,
              animation: 'iconFadeIn 0.4s ease-out 400ms forwards',
            }}
          >
            <img loading="lazy" src={widgetIcon} alt="" className="full-image" />
          </a>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes widgetSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes iconFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes calloutSlideUp {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes promptSlideIn {
          from { opacity: 0; transform: translateX(5px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .tldrchats::-webkit-scrollbar {
          width: 4px;
        }
        .tldrchats::-webkit-scrollbar-track {
          background: transparent;
        }
        .tldrchats::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.12);
          border-radius: 4px;
        }
        .tldrchats::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.25);
        }
        .tldrchats {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.12) transparent;
        }
        .chat-markdown {
          font-size: inherit;
          line-height: inherit;
        }
        .chat-markdown p {
          margin: 0 0 0.5em 0;
          font-size: inherit;
          line-height: inherit;
        }
        .chat-markdown p:last-child {
          margin-bottom: 0;
        }
        .chat-markdown strong {
          font-weight: 600;
        }
        .chat-markdown ul, .chat-markdown ol {
          margin: 0.4em 0;
          padding-left: 1.4em;
          font-size: inherit;
          line-height: inherit;
        }
        .chat-markdown li {
          margin-bottom: 0.25em;
          font-size: inherit;
          line-height: inherit;
        }
        .chat-markdown a {
          color: inherit;
          text-decoration: underline;
        }
        .chat-markdown h1, .chat-markdown h2, .chat-markdown h3 {
          font-size: 1em;
          font-weight: 600;
          margin: 0.6em 0 0.3em 0;
        }
        .chat-markdown code {
          background: rgba(0,0,0,0.06);
          padding: 0.15em 0.3em;
          border-radius: 3px;
          font-size: 0.9em;
        }
        .chat-markdown pre {
          background: rgba(0,0,0,0.06);
          padding: 0.6em;
          border-radius: 6px;
          overflow-x: auto;
          margin: 0.4em 0;
        }
        .chat-markdown pre code {
          background: none;
          padding: 0;
        }
        .chat-markdown hr {
          border: none;
          border-top: 1px solid rgba(0,0,0,0.1);
          margin: 0.6em 0;
        }
      `}</style>
    </div>
  )
}

export default PreviewPage
