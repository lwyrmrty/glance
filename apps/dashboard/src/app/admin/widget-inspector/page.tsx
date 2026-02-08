'use client'

import { useState, useEffect, useRef } from 'react'

export default function WidgetInspectorPage() {
  const [widgetId, setWidgetId] = useState('')
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [css, setCss] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'hover'>('html')
  const [hoverInfo, setHoverInfo] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  function handleLoad() {
    const trimmed = widgetId.trim()
    if (!trimmed) return
    setHtml(null)
    setCss(null)
    setHoverInfo(null)
    setLoadedId(trimmed)
  }

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'glance-inspector') {
        setHtml(formatHtml(e.data.html || ''))
        setCss(formatCss(e.data.css || ''))
      }
      if (e.data?.type === 'glance-hover') {
        setHoverInfo(e.data.info || null)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Widget Inspector</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
        Paste a widget ID to inspect its live Shadow DOM HTML and CSS. Click tabs in the widget preview to re-extract.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={widgetId}
          onChange={(e) => setWidgetId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          placeholder="Paste widget ID here..."
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: 14,
            border: '1px solid #ddd',
            borderRadius: 8,
            outline: 'none',
          }}
        />
        <button
          onClick={handleLoad}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: '#7C3AED',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Load
        </button>
      </div>

      {loadedId && (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Widget Preview */}
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <div
              style={{
                padding: '8px 14px',
                fontSize: 12,
                color: '#888',
                borderBottom: '1px solid #eee',
                background: '#fafafa',
                fontWeight: 500,
              }}
            >
              LIVE PREVIEW
            </div>
            <iframe
              ref={iframeRef}
              src={`/admin/widget-inspector/embed?id=${encodeURIComponent(loadedId)}`}
              style={{
                width: '100%',
                height: 700,
                border: 'none',
                display: 'block',
              }}
            />
          </div>

          {/* Code Panel */}
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 740,
            }}
          >
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #eee', background: '#fafafa' }}>
              <button
                onClick={() => setActiveTab('html')}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  borderBottom: activeTab === 'html' ? '2px solid #7C3AED' : '2px solid transparent',
                  background: 'none',
                  color: activeTab === 'html' ? '#7C3AED' : '#888',
                  cursor: 'pointer',
                }}
              >
                HTML
              </button>
              <button
                onClick={() => setActiveTab('css')}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  borderBottom: activeTab === 'css' ? '2px solid #7C3AED' : '2px solid transparent',
                  background: 'none',
                  color: activeTab === 'css' ? '#7C3AED' : '#888',
                  cursor: 'pointer',
                }}
              >
                CSS
              </button>
              <button
                onClick={() => setActiveTab('hover')}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  borderBottom: activeTab === 'hover' ? '2px solid #7C3AED' : '2px solid transparent',
                  background: 'none',
                  color: activeTab === 'hover' ? '#7C3AED' : '#888',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                Hover
                {hoverInfo && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#7C3AED',
                      position: 'absolute',
                      top: 8,
                      right: 8,
                    }}
                  />
                )}
              </button>
            </div>

            {/* Code Content */}
            <pre
              style={{
                flex: 1,
                margin: 0,
                padding: 16,
                fontSize: 12,
                lineHeight: 1.6,
                overflow: 'auto',
                background: '#1e1e1e',
                color: '#d4d4d4',
                fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {activeTab === 'html'
                ? html ?? 'Loading widget...'
                : activeTab === 'css'
                  ? css ?? 'Loading widget...'
                  : hoverInfo ?? 'Hover over an element in the widget preview to see its tag, classes, dimensions, and computed CSS.'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

/** Indent HTML for readability */
function formatHtml(raw: string): string {
  let indent = 0
  const lines: string[] = []
  // Split on tags while preserving them
  const tokens = raw.replace(/></g, '>\n<').split('\n')

  for (const token of tokens) {
    const trimmed = token.trim()
    if (!trimmed) continue

    // Closing tag — dedent first
    if (trimmed.startsWith('</')) {
      indent = Math.max(0, indent - 1)
    }

    lines.push('  '.repeat(indent) + trimmed)

    // Opening tag (not self-closing, not closing) — indent children
    if (
      trimmed.startsWith('<') &&
      !trimmed.startsWith('</') &&
      !trimmed.endsWith('/>') &&
      // Void elements
      !/^<(img|br|hr|input|meta|link|area|base|col|embed|source|track|wbr)\b/i.test(trimmed)
    ) {
      indent++
    }
  }

  return lines.join('\n')
}

/** Add newlines after } for CSS readability */
function formatCss(raw: string): string {
  return raw
    .replace(/\s*\{\s*/g, ' {\n  ')
    .replace(/\s*;\s*/g, ';\n  ')
    .replace(/\s*\}\s*/g, '\n}\n')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}
