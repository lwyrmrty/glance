'use client'

import Link from 'next/link'
import Script from 'next/script'
import { useRef, useEffect, useState } from 'react'

interface Glance {
  id: string
  workspace_id: string
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
  workspaceId?: string
}

export function PreviewPage({ glance, workspaceId }: PreviewPageProps) {
  const prefix = workspaceId ? `/w/${workspaceId}` : ''
  const containerRef = useRef<HTMLDivElement>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const widgetRef = useRef<HTMLElement | null>(null)

  const buttonStyle = (glance.button_style ?? {}) as Record<string, unknown>

  // Build the widget config in the same shape the embeddable widget expects
  const widgetConfig = {
    id: glance.id,
    name: glance.name,
    logo_url: glance.logo_url,
    theme_color: glance.theme_color,
    tabs: (buttonStyle.tabs as unknown[]) ?? [],
    prompts: (buttonStyle.prompts as unknown[]) ?? [],
    callout_text: (buttonStyle.callout_text as string) ?? '',
    callout_url: (buttonStyle.callout_url as string) ?? '',
  }

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return

    // Create the actual <glance-widget> custom element
    const widget = document.createElement('glance-widget') as any
    widget.setAttribute('data-widget-id', glance.id)
    widget.widgetConfig = widgetConfig
    widget.apiBase = window.location.origin
    containerRef.current.appendChild(widget)
    widgetRef.current = widget

    return () => {
      widget.remove()
      widgetRef.current = null
    }
  }, [scriptLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

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
          href={`${prefix}/glances/${glance.id}`}
          style={{ color: glance.theme_color, textDecoration: 'none', fontWeight: 500 }}
        >
          ← Back to Editor
        </Link>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>Preview of <strong>{glance.name}</strong></span>
      </div>

      {/* The widget custom element mounts here */}
      <div ref={containerRef} />

      {/* Load widget.js — it registers the <glance-widget> custom element.
          Without data-widget-id on the script tag, the auto-init IIFE exits silently. */}
      <Script
        src="/widget.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
    </div>
  )
}

export default PreviewPage
