'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { useToast } from '@/components/Toast'

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

interface GlanceEditorProps {
  glanceId: string
  accountId?: string
  glance?: Glance | null
}

export default function GlanceEditor({ glanceId, accountId, glance }: GlanceEditorProps) {
  const isNew = glanceId === 'new'
  const router = useRouter()
  const { showToast } = useToast()
  const [name, setName] = useState(glance?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(glance?.logo_url ?? null)
  const [themeColor, setThemeColor] = useState(glance?.theme_color ?? '#000000')
  const [widgetIconFile, setWidgetIconFile] = useState<File | null>(null)
  const [widgetIconPreview, setWidgetIconPreview] = useState<string>(glance?.logo_url ?? '/images/glance-default.png')
  const [calloutText, setCalloutText] = useState((glance?.button_style as any)?.callout_text ?? '')
  const [calloutUrl, setCalloutUrl] = useState((glance?.button_style as any)?.callout_url ?? '')

  // Glance Tabs (up to 5)
  const defaultTabs = [
    { name: '', icon: '/images/Chats.svg', type: '' },
    { name: '', icon: '/images/Chats.svg', type: '' },
    { name: '', icon: '/images/Chats.svg', type: '' },
    { name: '', icon: '/images/Chats.svg', type: '' },
    { name: '', icon: '/images/Chats.svg', type: '' },
  ]
  const savedTabs = (glance?.button_style as any)?.tabs ?? defaultTabs
  const [tabs, setTabs] = useState<{ name: string; icon: string; type: string }[]>(
    savedTabs.length === 5 ? savedTabs : defaultTabs
  )

  const updateTab = (index: number, field: 'name' | 'icon' | 'type', value: string) => {
    setTabs(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  const [tabIconFiles, setTabIconFiles] = useState<(File | null)[]>([null, null, null, null, null])

  const handleTabIconUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    updateTab(index, 'icon', URL.createObjectURL(file))
    setTabIconFiles(prev => prev.map((f, i) => i === index ? file : f))
  }

  const [tabDragIndex, setTabDragIndex] = useState<number | null>(null)
  const [tabDragOverIndex, setTabDragOverIndex] = useState<number | null>(null)

  const handleTabDragStart = (index: number) => setTabDragIndex(index)
  const handleTabDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setTabDragOverIndex(index)
  }
  const handleTabDrop = (index: number) => {
    if (tabDragIndex === null || tabDragIndex === index) {
      setTabDragIndex(null)
      setTabDragOverIndex(null)
      return
    }
    setTabs(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(tabDragIndex, 1)
      updated.splice(index, 0, moved)
      return updated
    })
    // Keep tabIconFiles in sync with tab reorder
    setTabIconFiles(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(tabDragIndex, 1)
      updated.splice(index, 0, moved)
      return updated
    })
    setTabDragIndex(null)
    setTabDragOverIndex(null)
  }
  const handleTabDragEnd = () => {
    setTabDragIndex(null)
    setTabDragOverIndex(null)
  }

  // Widget type picker modal
  const [openWidgetModal, setOpenWidgetModal] = useState<number | null>(null)
  const widgetModalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openWidgetModal === null) return
    const handler = (e: MouseEvent) => {
      if (widgetModalRef.current && !widgetModalRef.current.contains(e.target as Node)) {
        setOpenWidgetModal(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openWidgetModal])

  const widgetTypeImages: Record<string, { img: string; className: string }> = {
    'TLDR': { img: '/images/glanceicons.svg', className: 'navicon nonactive' },
    'AI Chat': { img: '/images/glanceicons.svg', className: 'navicon nonactive' },
    'Content': { img: '/images/glanceicons.svg', className: 'navicon nonactive' },
    'Gallery': { img: '/images/glanceicons.svg', className: 'navicon nonactive' },
    'Form': { img: '/images/glanceicons.svg', className: 'navicon nonactive' },
    'Poll': { img: '/images/glanceicons.svg', className: 'navicon nonactive' },
    'Ashby': { img: '/images/Wf_LJXhG_400x400.png', className: 'fullimage' },
    'Greenhouse': { img: '/images/V7s98SAp_400x400.jpg', className: 'fullimage' },
    'Lever': { img: '/images/lever__logo.jpeg', className: 'fullimage' },
    'Tally': { img: '/images/V3mlVijc_400x400.jpg', className: 'fullimage' },
  }

  const selectWidgetType = (index: number, type: string) => {
    updateTab(index, 'type', type)
    setOpenWidgetModal(null)
  }

  const defaultPrompts = [
    { text: '', link: '' },
    { text: '', link: '' },
    { text: '', link: '' },
  ]
  const savedPrompts = (glance?.button_style as any)?.prompts ?? defaultPrompts
  const [prompts, setPrompts] = useState<{ text: string; link: string }[]>(
    savedPrompts.length === 3 ? savedPrompts : defaultPrompts
  )

  // Derive link pills from the actual configured tabs (only tabs with a name)
  const tabLinks = tabs.filter(t => t.name.trim() !== '').map(t => t.name)

  const updatePrompt = (index: number, field: 'text' | 'link', value: string) => {
    setPrompts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const togglePromptLink = (index: number, tabName: string) => {
    const hash = `#glance-${tabName.toLowerCase().replace(/\s+/g, '-')}`
    setPrompts(prev => prev.map((p, i) => 
      i === index ? { ...p, link: p.link === hash ? '' : hash } : p
    ))
  }

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    setPrompts(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(dragIndex, 1)
      updated.splice(index, 0, moved)
      return updated
    })
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  // Track whether anything has changed from the saved state
  const hasChanges = isNew
    ? name.trim().length > 0
    : (
        name !== (glance?.name ?? '') ||
        themeColor !== (glance?.theme_color ?? '#000000') ||
        calloutText !== ((glance?.button_style as any)?.callout_text ?? '') ||
        calloutUrl !== ((glance?.button_style as any)?.callout_url ?? '') ||
        JSON.stringify(prompts) !== JSON.stringify(savedPrompts) ||
        JSON.stringify(tabs) !== JSON.stringify(savedTabs) ||
        logoFile !== null ||
        widgetIconFile !== null ||
        tabIconFiles.some(f => f !== null)
      )

  const handleSave = async () => {
    if (!glance || !hasChanges) return
    setSaving(true)

    const supabase = createClient()
    let logoUrl = glance.logo_url

    // Upload new logo if changed
    if (logoFile && accountId) {
      const fileExt = logoFile.name.split('.').pop()
      const filePath = `${accountId}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, logoFile)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath)
        logoUrl = urlData.publicUrl
      }
    }

    // Upload new widget icon if changed
    if (widgetIconFile && accountId) {
      const fileExt = widgetIconFile.name.split('.').pop()
      const filePath = `${accountId}/widget-icon-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, widgetIconFile)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath)
        logoUrl = urlData.publicUrl
      }
    }

    // Upload any pending tab icon files
    const resolvedTabs = await Promise.all(
      tabs.map(async (tab, i) => {
        const file = tabIconFiles[i]
        if (!file || !accountId) return tab
        const fileExt = file.name.split('.').pop()
        const filePath = `${accountId}/tab-icon-${Date.now()}-${i}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('logos')
            .getPublicUrl(filePath)
          return { ...tab, icon: urlData.publicUrl }
        }
        return tab
      })
    )

    const { error } = await supabase
      .from('widgets')
      .update({
        name: name.trim(),
        theme_color: themeColor,
        logo_url: logoUrl,
        button_style: {
          ...(glance.button_style as Record<string, unknown>),
          callout_text: calloutText,
          callout_url: calloutUrl,
          prompts,
          tabs: resolvedTabs,
        },
      })
      .eq('id', glance.id)

    if (error) {
      console.error('Error saving glance:', error)
      showToast('Failed to save changes. Please try again.', 'error')
    } else {
      showToast('Changes saved successfully!')
      setTabIconFiles([null, null, null, null, null])
      router.refresh()
    }
    setSaving(false)
  }

  const handleWidgetIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setWidgetIconFile(file)
    setWidgetIconPreview(URL.createObjectURL(file))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleCreate = async () => {
    if (!name.trim() || !accountId) return
    setSaving(true)

    const supabase = createClient()
    let logoUrl: string | null = null

    // Upload logo if provided
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop()
      const filePath = `${accountId}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, logoFile)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath)
        logoUrl = urlData.publicUrl
      }
    }

    const { data, error } = await supabase
      .from('widgets')
      .insert({
        account_id: accountId,
        name: name.trim(),
        logo_url: logoUrl,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating glance:', error)
      showToast('Failed to create glance. Please try again.', 'error')
      setSaving(false)
      return
    }

    showToast('Glance created successfully!')
    router.push(`/glances/${data.id}`)
  }

  return (
    <div className="pagewrapper" style={{ '--vcs-purple': themeColor } as React.CSSProperties}>
      <div className="pagecontent">
        <Sidebar />

        <div className="mainwrapper">
          <div className="maincontent flex">
            <div className="textside">
              <div className="innerhero">
                <div className="innerbreadcrumb-row">
                  <Link href="/glances" className="innerbreadcrumb-link">Glances</Link>
                  <div className="innerbreadcrumb-divider">/</div>
                  <a href="#" className="innerbreadcrumb-link active">{isNew ? 'New Glance' : name}</a>
                </div>
                <div className="herorow">
                  {logoPreview && (
                    <div className="pageicon-block large">
                      <img src={logoPreview} loading="lazy" alt="" className="full-image" />
                    </div>
                  )}
                  <div>
                    <div className="alignrow alignbottom">
                      <h1 className="pageheading">{isNew ? 'New Glance' : name}</h1>
                    </div>
                  </div>
                </div>
                {!isNew && (
                  <div className="inner-hero-nav">
                    <a href="#" className="innerhero-nav-link active w-inline-block">
                      <div>Widget</div>
                    </a>
                    <a href="#" className="innerhero-nav-link w-inline-block">
                      <div>Analytics</div>
                    </a>
                    <a href="#" className="innerhero-nav-link w-inline-block">
                      <div>Embed</div>
                    </a>
                    <Link href={`/glances/${glanceId}/preview`} className="innerhero-nav-link w-inline-block">
                      <div>Preview</div>
                    </Link>
                  </div>
                )}
              </div>

              {/* Glance Settings */}
              <div className="contentblock">
                <div className="contenthead-row">
                  <h2 className="contenthead">Glance Settings</h2>
                </div>
                <div className="formblock w-form">
                  <form>
                    <div className="formcontent">
                      {/* Name and Icon */}
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <h3 className="contenthead h3">Name and Icon</h3>
                          <div className="labeldivider"></div>
                        </div>
                        <div className="stylefield-block">
                          <label className="emojipicker" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                            {logoPreview ? (
                              <img src={logoPreview} loading="lazy" alt="" className="full-image" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleLogoUpload}
                              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                            />
                          </label>
                          <input 
                            className="formfields invisible nopadding large w-input" 
                            maxLength={256} 
                            name="field" 
                            placeholder={isNew ? 'Name your Glance' : 'Glance name'} 
                            type="text" 
                            id="field" 
                            required 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Glance Tabs - hidden on new */}
                      {!isNew && <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="contenthead h3">Glance Tabs <span className="dim">(up to 5)</span></div>
                          <div className="labeldivider"></div>
                        </div>
                        <div className="rowcards">
                          {tabs.map((tab, index) => (
                            <div 
                              key={index} 
                              className="rowcard withdrag"
                              draggable
                              onDragStart={() => handleTabDragStart(index)}
                              onDragOver={(e) => handleTabDragOver(e, index)}
                              onDrop={() => handleTabDrop(index)}
                              onDragEnd={handleTabDragEnd}
                              style={{
                                opacity: tabDragIndex === index ? 0.4 : 1,
                                borderTop: tabDragOverIndex === index && tabDragIndex !== null && tabDragIndex > index ? '2px solid var(--vcs-purple)' : undefined,
                                borderBottom: tabDragOverIndex === index && tabDragIndex !== null && tabDragIndex < index ? '2px solid var(--vcs-purple)' : undefined,
                                transition: 'opacity 0.15s',
                              }}
                            >
                              <div className="draggingblock" style={{ cursor: 'grab' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="dragicons">
                                  <g>
                                    <path d="M11 18C11 19.1 10.1 20 9 20C7.9 20 7 19.1 7 18C7 16.9 7.9 16 9 16C10.1 16 11 16.9 11 18ZM9 10C7.9 10 7 10.9 7 12C7 13.1 7.9 14 9 14C10.1 14 11 13.1 11 12C11 10.9 10.1 10 9 10ZM9 4C7.9 4 7 4.9 7 6C7 7.1 7.9 8 9 8C10.1 8 11 7.1 11 6C11 4.9 10.1 4 9 4ZM15 8C16.1 8 17 7.1 17 6C17 4.9 16.1 4 15 4C13.9 4 13 4.9 13 6C13 7.1 13.9 8 15 8ZM15 10C13.9 10 13 10.9 13 12C13 13.1 13.9 14 15 14C16.1 14 17 13.1 17 12C17 10.9 16.1 10 15 10ZM15 16C13.9 16 13 16.9 13 18C13 19.1 13.9 20 15 20C16.1 20 17 19.1 17 18C17 16.9 16.1 16 15 16Z" fill="currentColor"></path>
                                  </g>
                                </svg>
                              </div>
                              <label className="iconpicker" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                                <img loading="lazy" src={tab.icon} alt="" className="navicon med" />
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={(e) => handleTabIconUpload(index, e)}
                                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                                />
                              </label>
                              <input 
                                className="formfields w-input" 
                                maxLength={256} 
                                placeholder="Tab name" 
                                type="text" 
                                value={tab.name}
                                onChange={(e) => updateTab(index, 'name', e.target.value)}
                              />
                              <div className="filterswrapper" ref={openWidgetModal === index ? widgetModalRef : undefined}>
                                <a 
                                  href="#" 
                                  className={`dropdownbuttons ${tab.type ? '' : 'empty'} w-inline-block`} 
                                  onClick={(e) => { e.preventDefault(); setOpenWidgetModal(openWidgetModal === index ? null : index) }}
                                >
                                  <div className="alignrow aligncenter">
                                    {tab.type && widgetTypeImages[tab.type] && (
                                      <div className="navbarlink-icon sm">
                                        <img loading="lazy" src={widgetTypeImages[tab.type].img} alt="" className={widgetTypeImages[tab.type].className} />
                                      </div>
                                    )}
                                    <div>{tab.type || 'Widget Type'}</div>
                                  </div>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="dropdowntoggle" style={{ transform: openWidgetModal === index ? 'rotate(90deg)' : undefined, transition: 'transform 0.2s' }}>
                                    <path d="M10 8L14 12L10 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                  </svg>
                                </a>
                                {openWidgetModal === index && (
                                  <div className="widgetsmodal" style={{ display: 'flex', top: '100%', bottom: 'auto', left: 'auto', right: 0, minWidth: 400, height: 'auto' }}>
                                    <div className="widgetsmodal-block">
                                      <div className="labelrow">
                                        <div className="labeltext">Standard Widgets</div>
                                        <div className="labeldivider"></div>
                                      </div>
                                      <div className="pillswrapper">
                                        {['TLDR', 'AI Chat', 'Content', 'Gallery', 'Form', 'Poll'].map((w) => (
                                          <a key={w} href="#" className={`widgetpill w-inline-block${tab.type === w ? ' active' : ''}`} onClick={(e) => { e.preventDefault(); selectWidgetType(index, w) }}>
                                            <div className="alignrow aligncenter">
                                              <div className="navbarlink-icon sm">
                                                <img loading="lazy" src="/images/glanceicons.svg" alt="" className="navicon nonactive" />
                                              </div>
                                              <div>{w}</div>
                                            </div>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="widgetsmodal-block">
                                      <div className="labelrow">
                                        <div className="labeltext">Integrations</div>
                                        <div className="labeldivider"></div>
                                      </div>
                                      <div className="pillswrapper">
                                        {[
                                          { name: 'Ashby', img: '/images/Wf_LJXhG_400x400.png' },
                                          { name: 'Greenhouse', img: '/images/V7s98SAp_400x400.jpg' },
                                          { name: 'Lever', img: '/images/lever__logo.jpeg' },
                                          { name: 'Tally', img: '/images/V3mlVijc_400x400.jpg' },
                                        ].map((w) => (
                                          <a key={w.name} href="#" className={`widgetpill w-inline-block${tab.type === w.name ? ' active' : ''}`} onClick={(e) => { e.preventDefault(); selectWidgetType(index, w.name) }}>
                                            <div className="alignrow aligncenter">
                                              <div className="navbarlink-icon sm">
                                                <img loading="lazy" src={w.img} alt="" className="fullimage" />
                                              </div>
                                              <div>{w.name}</div>
                                            </div>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="rowcard-actions">
                                <Link href={tab.type ? `/glances/${glanceId}/tab/${index}` : '#'} className={`tablebutton square w-inline-block${!tab.type ? ' disabled' : ''}`} onClick={!tab.type ? (e: React.MouseEvent) => e.preventDefault() : undefined}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="go-arrow">
                                    <g>
                                      <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                    </g>
                                  </svg>
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>}
                    </div>
                  </form>
                </div>
              </div>

              {/* Customizations - hidden on new */}
              {!isNew && <div className="contentblock">
                <div className="contenthead-row">
                  <h2 className="contenthead">Customizations</h2>
                </div>
                <div className="formblock w-form">
                  <form>
                    <div className="formcontent">
                      {/* Suggested Prompts */}
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Suggested Prompts <span className="dim">(up to 3)</span></div>
                          <div className="labeldivider"></div>
                        </div>
                        <div className="rowcards">
                          {prompts.map((prompt, index) => (
                            <div 
                              key={index} 
                              className="rowcard withdrag"
                              draggable
                              onDragStart={() => handleDragStart(index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDrop={() => handleDrop(index)}
                              onDragEnd={handleDragEnd}
                              style={{
                                opacity: dragIndex === index ? 0.4 : 1,
                                borderTop: dragOverIndex === index && dragIndex !== null && dragIndex > index ? '2px solid var(--vcs-purple)' : undefined,
                                borderBottom: dragOverIndex === index && dragIndex !== null && dragIndex < index ? '2px solid var(--vcs-purple)' : undefined,
                                transition: 'opacity 0.15s',
                              }}
                            >
                              <div className="alignrow aligncenter stretch">
                                <div className="draggingblock moved" style={{ cursor: 'grab' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="dragicons">
                                    <g>
                                      <path d="M11 18C11 19.1 10.1 20 9 20C7.9 20 7 19.1 7 18C7 16.9 7.9 16 9 16C10.1 16 11 16.9 11 18ZM9 10C7.9 10 7 10.9 7 12C7 13.1 7.9 14 9 14C10.1 14 11 13.1 11 12C11 10.9 10.1 10 9 10ZM9 4C7.9 4 7 4.9 7 6C7 7.1 7.9 8 9 8C10.1 8 11 7.1 11 6C11 4.9 10.1 4 9 4ZM15 8C16.1 8 17 7.1 17 6C17 4.9 16.1 4 15 4C13.9 4 13 4.9 13 6C13 7.1 13.9 8 15 8ZM15 10C13.9 10 13 10.9 13 12C13 13.1 13.9 14 15 14C16.1 14 17 13.1 17 12C17 10.9 16.1 10 15 10ZM15 16C13.9 16 13 16.9 13 18C13 19.1 13.9 20 15 20C16.1 20 17 19.1 17 18C17 16.9 16.1 16 15 16Z" fill="currentColor"></path>
                                    </g>
                                  </svg>
                                </div>
                                <div className="prompt-block">
                                  <input 
                                    className="formfields w-input" 
                                    maxLength={256} 
                                    placeholder="Prompt text" 
                                    type="text" 
                                    value={prompt.text}
                                    onChange={(e) => updatePrompt(index, 'text', e.target.value)}
                                  />
                                  <div className="alignrow aligncenter wrap">
                                    <div className="labeltext">Links:</div>
                                    {tabLinks.map((tabName) => {
                                      const hash = `#glance-${tabName.toLowerCase().replace(/\s+/g, '-')}`
                                      const isSelected = prompt.link === hash
                                      return (
                                        <a 
                                          key={tabName} 
                                          href="#" 
                                          className={`calloutpill w-inline-block${isSelected ? ' selected' : ''}`}
                                          onClick={(e) => {
                                            e.preventDefault()
                                            togglePromptLink(index, tabName)
                                          }}
                                          
                                        >
                                          <div>{tabName}</div>
                                        </a>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Callout Button */}
                      <div className="labelrow large">
                        <h3 className="contenthead h3">Callout Button</h3>
                        <div className="labeldivider"></div>
                      </div>
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Callout Button Text</div>
                          <div className="labeldivider"></div>
                        </div>
                        <input 
                          className="formfields textfield w-input" 
                          maxLength={256} 
                          name="callout-text" 
                          placeholder="e.g. Find the right investor" 
                          type="text" 
                          value={calloutText}
                          onChange={(e) => setCalloutText(e.target.value)}
                        />
                      </div>
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Callout Button URL</div>
                          <div className="labeldivider"></div>
                        </div>
                        <input 
                          className="formfields urlfield w-input" 
                          maxLength={256} 
                          name="callout-url" 
                          placeholder="https://" 
                          type="url" 
                          value={calloutUrl}
                          onChange={(e) => setCalloutUrl(e.target.value)}
                        />
                        <div className="alignrow aligncenter wrap">
                          <div className="labeltext">Links:</div>
                          {/* Smart links - these will link to tabs within the widget */}
                          {tabLinks.map((tabName) => {
                            const hash = `#glance-${tabName.toLowerCase().replace(/\s+/g, '-')}`
                            const isSelected = calloutUrl === hash
                            return (
                              <a 
                                key={tabName} 
                                href="#" 
                                className={`calloutpill w-inline-block${isSelected ? ' selected' : ''}`}
                                onClick={(e) => {
                                  e.preventDefault()
                                  setCalloutUrl(calloutUrl === hash ? '' : hash)
                                }}
                              >
                                <div>{tabName}</div>
                              </a>
                            )
                          })}
                        </div>
                      </div>

                      {/* Brand Color */}
                      <div className="fieldblocks">
                        <div className="labelrow large">
                          <h3 className="contenthead h3">Brand Color</h3>
                          <div className="labeldivider"></div>
                        </div>
                        <div className="stylefield-block">
                          <label className="colorpicker callout" style={{ backgroundColor: themeColor, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                            <input 
                              type="color" 
                              value={themeColor}
                              onChange={(e) => setThemeColor(e.target.value)}
                              style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0, cursor: 'pointer' }}
                            />
                          </label>
                          <input 
                            className="formfields invisible nopadding w-input" 
                            maxLength={7} 
                            name="field" 
                            placeholder="#7C3AED" 
                            type="text" 
                            value={themeColor}
                            onChange={(e) => {
                              const val = e.target.value
                              setThemeColor(val)
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>}

              {/* Sticky Save */}
              <div className="stickysave-row">
                <div>
                  <button 
                    type="button"
                    onClick={isNew ? handleCreate : handleSave}
                    disabled={!hasChanges || saving}
                    className="buttonblock callout w-inline-block"
                    style={{ border: 'none', cursor: 'pointer' }}
                  >
                    <div>{saving ? 'Saving...' : isNew ? 'Create Glance' : 'Save Changes'}</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Demo / Preview Side */}
            <div className="demoside downflex">
              {isNew ? (
                <img 
                  src="/images/litebgoption.webp" 
                  loading="lazy" 
                  sizes="(max-width: 5001px) 100vw, 5001px" 
                  srcSet="/images/litebgoption-p-500.webp 500w, /images/litebgoption-p-800.webp 800w, /images/litebgoption-p-1080.webp 1080w, /images/litebgoption-p-1600.webp 1600w, /images/litebgoption-p-2000.webp 2000w, /images/litebgoption-p-2600.webp 2600w, /images/litebgoption-p-3200.webp 3200w, /images/litebgoption.webp 5001w" 
                  alt="" 
                  className="fullimage" 
                />
              ) : (
                <div className="glancewrapper">
                  <div className="glancewidget">
                    <div className="glancewidget-tabs short"></div>
                  <div className="glancewidget-tab-nav">
                    {tabs.filter(t => t.name.trim()).map((tab, index, filtered) => (
                      <a 
                        key={index} 
                        href="#" 
                        className={`glancewidget-tablink${index === 0 ? ' first' : ''}${index === filtered.length - 1 ? ' last' : ''} w-inline-block`}
                        onClick={(e) => e.preventDefault()}
                      >
                        <img loading="lazy" src={tab.icon} alt="" className="tldrwidget-icon sm" />
                        <div className="tldr-nav-label">{tab.name}</div>
                      </a>
                    ))}
                  </div>
                  </div>
                  {prompts.some(p => p.text.trim()) && (
                    <div className="glanceprompts">
                      {prompts.filter(p => p.text.trim()).map((prompt, index) => (
                        <a key={index} href={prompt.link || '#'} className="glanceprompt w-inline-block" onClick={(e) => e.preventDefault()}>
                          <div>{prompt.text}</div>
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="glancebutton-row">
                    {calloutText && (
                      <a href={calloutUrl || '#'} className="glancebutton wide w-inline-block" onClick={(e) => e.preventDefault()}>
                        <div>{calloutText}</div>
                      </a>
                    )}
                    <a href="#" className="glancebutton w-inline-block">
                      <img loading="lazy" src={widgetIconPreview} alt="" className="full-image" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
