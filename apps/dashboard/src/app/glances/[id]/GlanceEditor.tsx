'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { useToast } from '@/components/Toast'

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

interface GlanceEditorProps {
  glanceId: string
  workspaceId?: string
  workspaceName?: string
  glance?: Glance | null
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
}

export default function GlanceEditor({ glanceId, workspaceId, workspaceName, glance, glances = [] }: GlanceEditorProps) {
  const isNew = glanceId === 'new'
  const router = useRouter()
  const { showToast } = useToast()
  const prefix = workspaceId ? `/w/${workspaceId}` : ''
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
  const [tabs, setTabs] = useState<{ name: string; icon: string; type: string; is_premium?: boolean }[]>(
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

  const widgetTypeIcons: Record<string, React.ReactNode> = {
    'TLDR': <svg width="18" height="18" viewBox="0 0 270 270" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M26.8892 54.8993L67.921 95.9488C73.3865 101.4158 73.3865 110.2779 67.921 115.745L17.1906 166.4958C11.7241 171.964 11.7254 180.8283 17.1935 186.2948C19.0289 188.1297 21.3382 189.4183 23.8635 190.0167L138.2287 217.1164L228.9818 238.6215C236.5055 240.4043 244.0498 235.7505 245.8326 228.2268C246.9522 223.5021 245.5437 218.5346 242.1108 215.1007L201.0786 174.0508C195.6132 168.5838 195.6132 159.7217 201.0786 154.2547L251.8087 103.5041C257.2752 98.036 257.274 89.1717 251.8058 83.7051C249.9704 81.8703 247.6611 80.5817 245.1358 79.9833L130.7699 52.8832L40.0182 31.3785C32.4945 29.5957 24.9502 34.2495 23.1673 41.7732C22.0478 46.4979 23.4563 51.4654 26.8892 54.8993Z" fill="currentColor"/></svg>,
    'AI Chat': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M3 17.2747V9.4C3 7.15979 3 6.03969 3.43597 5.18404C3.81947 4.43139 4.43139 3.81947 5.18404 3.43597C6.03969 3 7.15979 3 9.4 3H14.6C16.8402 3 17.9603 3 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C21 6.03969 21 7.15979 21 9.4V10.6C21 12.8402 21 13.9603 20.564 14.816C20.1805 15.5686 19.5686 16.1805 18.816 16.564C17.9603 17 16.8402 17 14.6 17H10.3592C9.85793 17 9.60732 17 9.37215 17.0578C9.16368 17.109 8.96482 17.1935 8.7832 17.3079C8.57832 17.4371 8.40431 17.6174 8.05628 17.9781L7.12716 18.9411C5.8371 20.2782 5.19206 20.9468 4.63642 20.9975C4.15448 21.0415 3.68091 20.8503 3.36464 20.484C3 20.0617 3 19.1327 3 17.2747ZM7 8C7 7.44772 7.44772 7 8 7H16C16.5523 7 17 7.44772 17 8C17 8.55228 16.5523 9 16 9H8C7.44772 9 7 8.55228 7 8ZM8 11C7.44772 11 7 11.4477 7 12C7 12.5523 7.44772 13 8 13H11C11.5523 13 12 12.5523 12 12C12 11.4477 11.5523 11 11 11H8Z" fill="currentColor"/></svg>,
    'Content': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 6C13.4477 6 13 6.44772 13 7C13 7.55228 13.4477 8 14 8H20C20.5523 8 21 7.55228 21 7C21 6.44772 20.5523 6 20 6H14Z" fill="currentColor"/><path d="M14 16C13.4477 16 13 16.4477 13 17C13 17.5523 13.4477 18 14 18H20C20.5523 18 21 17.5523 21 17C21 16.4477 20.5523 16 20 16H14Z" fill="currentColor"/><path d="M3.21799 4.09202C3 4.51984 3 5.0799 3 6.2V7.8C3 8.9201 3 9.48016 3.21799 9.90798C3.40973 10.2843 3.71569 10.5903 4.09202 10.782C4.51984 11 5.0799 11 6.2 11H7.8C8.92011 11 9.48016 11 9.90798 10.782C10.2843 10.5903 10.5903 10.2843 10.782 9.90798C11 9.48016 11 8.9201 11 7.8V6.2C11 5.0799 11 4.51984 10.782 4.09202C10.5903 3.71569 10.2843 3.40973 9.90798 3.21799C9.48016 3 8.9201 3 7.8 3H6.2C5.0799 3 4.51984 3 4.09202 3.21799C3.71569 3.40973 3.40973 3.71569 3.21799 4.09202Z" fill="currentColor"/><path d="M3.21799 14.092C3 14.5198 3 15.0799 3 16.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.0799 21 6.2 21H7.8C8.92011 21 9.48016 21 9.90798 20.782C10.2843 20.5903 10.5903 20.2843 10.782 19.908C11 19.4802 11 18.9201 11 17.8V16.2C11 15.0799 11 14.5198 10.782 14.092C10.5903 13.7157 10.2843 13.4097 9.90798 13.218C9.48016 13 8.9201 13 7.8 13H6.2C5.0799 13 4.51984 13 4.09202 13.218C3.71569 13.4097 3.40973 13.7157 3.21799 14.092Z" fill="currentColor"/></svg>,
    'Gallery': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M3 9.4C3 7.15979 3 6.03969 3.43597 5.18404C3.81947 4.43139 4.43139 3.81947 5.18404 3.43597C6.03969 3 7.15979 3 9.4 3H14.6C16.8402 3 17.9603 3 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C21 6.03969 21 7.15979 21 9.4V12.9202C21 13.4005 21 13.6407 20.8997 13.7742C20.8123 13.8905 20.6786 13.9629 20.5335 13.9726C20.3669 13.9838 20.1657 13.8527 19.7632 13.5904L16.9181 11.7363L16.8222 11.6737C16.4266 11.4146 16.0296 11.1546 15.5799 11.0549C15.1883 10.968 14.7816 10.9766 14.394 11.0801C13.949 11.1988 13.5635 11.4754 13.1792 11.7511L13.0861 11.8178L10.5804 13.6068C10.1013 13.9489 10.0419 13.9763 10.0012 13.9888C9.93257 14.0099 9.86019 14.016 9.789 14.0066C9.74682 14.001 9.68368 13.9839 9.15429 13.7263L8.62594 13.4691L8.54278 13.4285C8.19415 13.2581 7.84351 13.0866 7.46216 13.0286C7.12928 12.978 6.78961 12.9951 6.46352 13.079C6.08995 13.1751 5.75836 13.381 5.42866 13.5857L5.35002 13.6345L3.41481 14.8311C3.23366 14.9431 3 14.813 3 14.6V9.4ZM3.49522 17.1328C3.34038 17.2286 3.26295 17.2765 3.20745 17.3483C3.16172 17.4075 3.1244 17.4915 3.1111 17.5651C3.09496 17.6544 3.10936 17.7334 3.13817 17.8912C3.20266 18.2446 3.29724 18.5437 3.43597 18.816C3.81947 19.5686 4.43139 20.1805 5.18404 20.564C6.03969 21 7.15979 21 9.4 21H14.6C16.8402 21 17.9603 21 18.816 20.564C19.5686 20.1805 20.1805 19.5686 20.564 18.816C20.7825 18.3872 20.8915 17.892 20.9459 17.2228C20.9586 17.0662 20.9649 16.988 20.9455 16.909C20.9289 16.8416 20.8948 16.772 20.8516 16.7176C20.8011 16.654 20.7311 16.6083 20.5911 16.5171L15.8261 13.4119C15.2635 13.0453 15.1928 13.0176 15.1469 13.0074C15.0685 12.99 14.9872 12.9918 14.9097 13.0124C14.8642 13.0246 14.7948 13.0553 14.2482 13.4455L11.7426 15.2345L11.6614 15.2927C11.3226 15.5355 10.9822 15.7797 10.5887 15.9006C10.2455 16.0061 9.88366 16.0364 9.5277 15.9895C9.11962 15.9357 8.74329 15.7516 8.36887 15.5685L8.27911 15.5246L7.75075 15.2675C7.25915 15.0282 7.20113 15.0119 7.1615 15.0059C7.09492 14.9958 7.02698 14.9992 6.96177 15.016C6.92294 15.026 6.86686 15.048 6.40185 15.3356L3.49522 17.1328ZM11 9C11 10.1046 10.1046 11 9 11C7.89543 11 7 10.1046 7 9C7 7.89543 7.89543 7 9 7C10.1046 7 11 7.89543 11 9Z" fill="currentColor"/></svg>,
    'Form': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10H19C20.1046 10 21 9.10457 21 8C21 6.89543 20.1046 6 19 6H9ZM9 14C7.89543 14 7 14.8954 7 16C7 17.1046 7.89543 18 9 18H15C16.1046 18 17 17.1046 17 16C17 14.8954 16.1046 14 15 14H9Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M4 3C4.55228 3 5 3.44772 5 4V20C5 20.5523 4.55228 21 4 21C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3Z" fill="currentColor"/></svg>,
    'Poll': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M3 20C3 19.4477 3.44772 19 4 19H20C20.5523 19 21 19.4477 21 20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M16 3C14.8954 3 14 3.89543 14 5V15C14 16.1046 14.8954 17 16 17C17.1046 17 18 16.1046 18 15V5C18 3.89543 17.1046 3 16 3Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M8 9C6.89543 9 6 9.89543 6 11V15C6 16.1046 6.89543 17 8 17C9.10457 17 10 16.1046 10 15V11C10 9.89543 9.10457 9 8 9Z" fill="currentColor"/></svg>,
  }

  const widgetTypeImages: Record<string, { img: string; className: string }> = {
    'Ashby': { img: '/images/Wf_LJXhG_400x400.png', className: 'fullimage' },
    'Greenhouse': { img: '/images/V7s98SAp_400x400.jpg', className: 'fullimage' },
    'Lever': { img: '/images/lever__logo.jpeg', className: 'fullimage' },
    'Tally': { img: '/images/V3mlVijc_400x400.jpg', className: 'fullimage' },
    'Spotify': { img: '/images/spotify_400x400.png', className: 'fullimage' },
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
    if (logoFile && workspaceId) {
      const fileExt = logoFile.name.split('.').pop()
      const filePath = `${workspaceId}/${Date.now()}.${fileExt}`
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
    if (widgetIconFile && workspaceId) {
      const fileExt = widgetIconFile.name.split('.').pop()
      const filePath = `${workspaceId}/widget-icon-${Date.now()}.${fileExt}`
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
        if (!file || !workspaceId) return tab
        const fileExt = file.name.split('.').pop()
        const filePath = `${workspaceId}/tab-icon-${Date.now()}-${i}.${fileExt}`
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
    if (!name.trim() || !workspaceId) return
    setSaving(true)

    const supabase = createClient()
    let logoUrl: string | null = null

    // Upload logo if provided
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop()
      const filePath = `${workspaceId}/${Date.now()}.${fileExt}`
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
        workspace_id: workspaceId,
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
    router.push(`${prefix}/glances/${data.id}`)
  }

  return (
    <div className="pagewrapper" style={{ '--vcs-purple': themeColor } as React.CSSProperties}>
      <div className="pagecontent">
        <Sidebar workspaceName={workspaceName} workspaceId={workspaceId} glances={glances} />

        <div className="mainwrapper">
          <div className="maincontent flex">
            <div className="textside">
              <div className="innerhero">
                <div className="innerbreadcrumb-row">
                  <Link href={`${prefix}/glances`} className="innerbreadcrumb-link">Glances</Link>
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
                    <Link href={`${prefix}/glances/${glanceId}/preview`} className="innerhero-nav-link w-inline-block">
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
                                    {tab.type && widgetTypeIcons[tab.type] && (
                                      <div className="navbarlink-icon sm">
                                        {widgetTypeIcons[tab.type]}
                                      </div>
                                    )}
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
                                        {['TLDR', 'AI Chat', 'Content', 'Gallery', 'Form', 'Poll'].map((w) => {
                                          const widgetIcons: Record<string, React.ReactNode> = {
                                            'TLDR': <svg width="18" height="18" viewBox="0 0 270 270" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M26.8892 54.8993L67.921 95.9488C73.3865 101.4158 73.3865 110.2779 67.921 115.745L17.1906 166.4958C11.7241 171.964 11.7254 180.8283 17.1935 186.2948C19.0289 188.1297 21.3382 189.4183 23.8635 190.0167L138.2287 217.1164L228.9818 238.6215C236.5055 240.4043 244.0498 235.7505 245.8326 228.2268C246.9522 223.5021 245.5437 218.5346 242.1108 215.1007L201.0786 174.0508C195.6132 168.5838 195.6132 159.7217 201.0786 154.2547L251.8087 103.5041C257.2752 98.036 257.274 89.1717 251.8058 83.7051C249.9704 81.8703 247.6611 80.5817 245.1358 79.9833L130.7699 52.8832L40.0182 31.3785C32.4945 29.5957 24.9502 34.2495 23.1673 41.7732C22.0478 46.4979 23.4563 51.4654 26.8892 54.8993Z" fill="currentColor"/></svg>,
                                            'AI Chat': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M3 17.2747V9.4C3 7.15979 3 6.03969 3.43597 5.18404C3.81947 4.43139 4.43139 3.81947 5.18404 3.43597C6.03969 3 7.15979 3 9.4 3H14.6C16.8402 3 17.9603 3 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C21 6.03969 21 7.15979 21 9.4V10.6C21 12.8402 21 13.9603 20.564 14.816C20.1805 15.5686 19.5686 16.1805 18.816 16.564C17.9603 17 16.8402 17 14.6 17H10.3592C9.85793 17 9.60732 17 9.37215 17.0578C9.16368 17.109 8.96482 17.1935 8.7832 17.3079C8.57832 17.4371 8.40431 17.6174 8.05628 17.9781L7.12716 18.9411C5.8371 20.2782 5.19206 20.9468 4.63642 20.9975C4.15448 21.0415 3.68091 20.8503 3.36464 20.484C3 20.0617 3 19.1327 3 17.2747ZM7 8C7 7.44772 7.44772 7 8 7H16C16.5523 7 17 7.44772 17 8C17 8.55228 16.5523 9 16 9H8C7.44772 9 7 8.55228 7 8ZM8 11C7.44772 11 7 11.4477 7 12C7 12.5523 7.44772 13 8 13H11C11.5523 13 12 12.5523 12 12C12 11.4477 11.5523 11 11 11H8Z" fill="currentColor"/></svg>,
                                            'Content': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 6C13.4477 6 13 6.44772 13 7C13 7.55228 13.4477 8 14 8H20C20.5523 8 21 7.55228 21 7C21 6.44772 20.5523 6 20 6H14Z" fill="currentColor"/><path d="M14 16C13.4477 16 13 16.4477 13 17C13 17.5523 13.4477 18 14 18H20C20.5523 18 21 17.5523 21 17C21 16.4477 20.5523 16 20 16H14Z" fill="currentColor"/><path d="M3.21799 4.09202C3 4.51984 3 5.0799 3 6.2V7.8C3 8.9201 3 9.48016 3.21799 9.90798C3.40973 10.2843 3.71569 10.5903 4.09202 10.782C4.51984 11 5.0799 11 6.2 11H7.8C8.92011 11 9.48016 11 9.90798 10.782C10.2843 10.5903 10.5903 10.2843 10.782 9.90798C11 9.48016 11 8.9201 11 7.8V6.2C11 5.0799 11 4.51984 10.782 4.09202C10.5903 3.71569 10.2843 3.40973 9.90798 3.21799C9.48016 3 8.9201 3 7.8 3H6.2C5.0799 3 4.51984 3 4.09202 3.21799C3.71569 3.40973 3.40973 3.71569 3.21799 4.09202Z" fill="currentColor"/><path d="M3.21799 14.092C3 14.5198 3 15.0799 3 16.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.0799 21 6.2 21H7.8C8.92011 21 9.48016 21 9.90798 20.782C10.2843 20.5903 10.5903 20.2843 10.782 19.908C11 19.4802 11 18.9201 11 17.8V16.2C11 15.0799 11 14.5198 10.782 14.092C10.5903 13.7157 10.2843 13.4097 9.90798 13.218C9.48016 13 8.9201 13 7.8 13H6.2C5.0799 13 4.51984 13 4.09202 13.218C3.71569 13.4097 3.40973 13.7157 3.21799 14.092Z" fill="currentColor"/></svg>,
                                            'Gallery': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M3 9.4C3 7.15979 3 6.03969 3.43597 5.18404C3.81947 4.43139 4.43139 3.81947 5.18404 3.43597C6.03969 3 7.15979 3 9.4 3H14.6C16.8402 3 17.9603 3 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C21 6.03969 21 7.15979 21 9.4V12.9202C21 13.4005 21 13.6407 20.8997 13.7742C20.8123 13.8905 20.6786 13.9629 20.5335 13.9726C20.3669 13.9838 20.1657 13.8527 19.7632 13.5904L16.9181 11.7363L16.8222 11.6737C16.4266 11.4146 16.0296 11.1546 15.5799 11.0549C15.1883 10.968 14.7816 10.9766 14.394 11.0801C13.949 11.1988 13.5635 11.4754 13.1792 11.7511L13.0861 11.8178L10.5804 13.6068C10.1013 13.9489 10.0419 13.9763 10.0012 13.9888C9.93257 14.0099 9.86019 14.016 9.789 14.0066C9.74682 14.001 9.68368 13.9839 9.15429 13.7263L8.62594 13.4691L8.54278 13.4285C8.19415 13.2581 7.84351 13.0866 7.46216 13.0286C7.12928 12.978 6.78961 12.9951 6.46352 13.079C6.08995 13.1751 5.75836 13.381 5.42866 13.5857L5.35002 13.6345L3.41481 14.8311C3.23366 14.9431 3 14.813 3 14.6V9.4ZM3.49522 17.1328C3.34038 17.2286 3.26295 17.2765 3.20745 17.3483C3.16172 17.4075 3.1244 17.4915 3.1111 17.5651C3.09496 17.6544 3.10936 17.7334 3.13817 17.8912C3.20266 18.2446 3.29724 18.5437 3.43597 18.816C3.81947 19.5686 4.43139 20.1805 5.18404 20.564C6.03969 21 7.15979 21 9.4 21H14.6C16.8402 21 17.9603 21 18.816 20.564C19.5686 20.1805 20.1805 19.5686 20.564 18.816C20.7825 18.3872 20.8915 17.892 20.9459 17.2228C20.9586 17.0662 20.9649 16.988 20.9455 16.909C20.9289 16.8416 20.8948 16.772 20.8516 16.7176C20.8011 16.654 20.7311 16.6083 20.5911 16.5171L15.8261 13.4119C15.2635 13.0453 15.1928 13.0176 15.1469 13.0074C15.0685 12.99 14.9872 12.9918 14.9097 13.0124C14.8642 13.0246 14.7948 13.0553 14.2482 13.4455L11.7426 15.2345L11.6614 15.2927C11.3226 15.5355 10.9822 15.7797 10.5887 15.9006C10.2455 16.0061 9.88366 16.0364 9.5277 15.9895C9.11962 15.9357 8.74329 15.7516 8.36887 15.5685L8.27911 15.5246L7.75075 15.2675C7.25915 15.0282 7.20113 15.0119 7.1615 15.0059C7.09492 14.9958 7.02698 14.9992 6.96177 15.016C6.92294 15.026 6.86686 15.048 6.40185 15.3356L3.49522 17.1328ZM11 9C11 10.1046 10.1046 11 9 11C7.89543 11 7 10.1046 7 9C7 7.89543 7.89543 7 9 7C10.1046 7 11 7.89543 11 9Z" fill="currentColor"/></svg>,
                                            'Form': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10H19C20.1046 10 21 9.10457 21 8C21 6.89543 20.1046 6 19 6H9ZM9 14C7.89543 14 7 14.8954 7 16C7 17.1046 7.89543 18 9 18H15C16.1046 18 17 17.1046 17 16C17 14.8954 16.1046 14 15 14H9Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M4 3C4.55228 3 5 3.44772 5 4V20C5 20.5523 4.55228 21 4 21C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3Z" fill="currentColor"/></svg>,
                                            'Poll': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M3 20C3 19.4477 3.44772 19 4 19H20C20.5523 19 21 19.4477 21 20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M16 3C14.8954 3 14 3.89543 14 5V15C14 16.1046 14.8954 17 16 17C17.1046 17 18 16.1046 18 15V5C18 3.89543 17.1046 3 16 3Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M8 9C6.89543 9 6 9.89543 6 11V15C6 16.1046 6.89543 17 8 17C9.10457 17 10 16.1046 10 15V11C10 9.89543 9.10457 9 8 9Z" fill="currentColor"/></svg>,
                                          };
                                          return (
                                            <a key={w} href="#" className={`widgetpill w-inline-block${tab.type === w ? ' active' : ''}`} onClick={(e) => { e.preventDefault(); selectWidgetType(index, w) }}>
                                              <div className="alignrow aligncenter">
                                                <div className="navbarlink-icon sm">
                                                  {widgetIcons[w]}
                                                </div>
                                                <div>{w}</div>
                                              </div>
                                            </a>
                                          );
                                        })}
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
                                          { name: 'Spotify', img: '/images/spotify_400x400.png' },
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
                                <Link href={tab.type ? `${prefix}/glances/${glanceId}/tab/${index}` : '#'} className={`tablebutton square w-inline-block${!tab.type ? ' disabled' : ''}`} onClick={!tab.type ? (e: React.MouseEvent) => e.preventDefault() : undefined}>
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
              {!isNew && (
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
              )}
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
