'use client'

import Link from 'next/link'
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

  const buttonStyle = (glance.button_style ?? {}) as Record<string, unknown>
  const workspace = (glance as any).workspaces as Record<string, unknown> | null

  // Filter tabs: only include those with both name and widget type (omit from live nav otherwise)
  const allTabs = (buttonStyle.tabs as { name?: string; icon?: string; type?: string }[]) ?? []
  const tabs = allTabs.filter(t => (t.name?.trim() ?? '') !== '' && (t.type?.trim() ?? '') !== '')

  // Build the widget config in the same shape the embeddable widget expects
  const widgetConfig = {
    id: glance.id,
    workspace_id: glance.workspace_id,
    name: glance.name,
    logo_url: glance.logo_url,
    theme_color: glance.theme_color,
    tabs,
    prompts: (buttonStyle.prompts as unknown[]) ?? [],
    callout_text: (buttonStyle.callout_text as string) ?? '',
    callout_url: (buttonStyle.callout_url as string) ?? '',
    auth: {
      google_enabled: (workspace?.auth_google_enabled as boolean) ?? false,
      magic_link_enabled: (workspace?.auth_magic_link_enabled as boolean) ?? true,
      banner_url: (workspace?.auth_banner_url as string) ?? null,
      title: (workspace?.auth_title as string) ?? 'Premium Content',
      subtitle: (workspace?.auth_subtitle as string) ?? 'Login or create your FREE account to access this content.',
    },
  }

  // Load widget.js once on mount via plain script tag
  useEffect(() => {
    if (typeof customElements !== 'undefined' && customElements.get('glance-widget')) {
      setScriptLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = '/widget.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    document.body.appendChild(script)
    return () => { script.remove() }
  }, [])

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return

    const widget = document.createElement('glance-widget') as any
    widget.setAttribute('data-widget-id', glance.id)
    widget.widgetConfig = widgetConfig
    widget.apiBase = window.location.origin
    containerRef.current.appendChild(widget)
    return () => { widget.remove() }
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
    </div>
  )
}

export default PreviewPage
