'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useCallback } from 'react'
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
  markdown: '/images/doc-icon.png',
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
  const isTldrTab = tabType === 'TLDR'

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

  // TLDR-specific state
  const [tldrTitle, setTldrTitle] = useState((tab as any).tldr_title ?? '')
  const [tldrSubtitle, setTldrSubtitle] = useState((tab as any).tldr_subtitle ?? '')
  const [tldrSocials, setTldrSocials] = useState<{ platform: string; url: string }[]>(
    (tab as any).tldr_socials ?? [
      { platform: 'linkedin', url: '' },
      { platform: 'x', url: '' },
      { platform: 'youtube', url: '' },
      { platform: 'facebook', url: '' },
      { platform: 'instagram', url: '' },
      { platform: 'tiktok', url: '' },
    ]
  )
  const [tldrContentLinks, setTldrContentLinks] = useState<{ title: string; description: string; link: string; tabLink: string; imagePreview?: string }[]>(
    (tab as any).tldr_content_links ?? []
  )

  // TLDR image state (local previews)
  const [tldrBannerPreview, setTldrBannerPreview] = useState<string | null>((tab as any).tldr_banner_url ?? null)
  const [tldrLogoPreview, setTldrLogoPreview] = useState<string | null>((tab as any).tldr_logo_url ?? null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const contentImageRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleBannerUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTldrBannerPreview(URL.createObjectURL(file))
  }, [])

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTldrLogoPreview(URL.createObjectURL(file))
  }, [])

  const handleContentImageUpload = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setTldrContentLinks(prev => prev.map((cl, i) => (i === index ? { ...cl, imagePreview: url } : cl)))
  }, [])

  const updateSocialUrl = (index: number, url: string) => {
    setTldrSocials(prev => prev.map((s, i) => (i === index ? { ...s, url } : s)))
  }
  const addContentLink = () => {
    setTldrContentLinks(prev => [...prev, { title: '', description: '', link: '', tabLink: '' }])
  }
  const updateContentLink = (index: number, field: string, value: string) => {
    setTldrContentLinks(prev => prev.map((cl, i) => (i === index ? { ...cl, [field]: value } : cl)))
  }
  const removeContentLink = (index: number) => {
    setTldrContentLinks(prev => prev.filter((_, i) => i !== index))
  }

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

  const uploadIconSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="uploadicons">
      <path d="M8 16L12 12M12 12L16 16M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.3414 6.15897C7.16507 3.73597 9.38755 2 12 2C15.3137 2 18 4.79305 18 8.23846C20.2091 8.23846 22 10.1005 22 12.3974C22 13.9368 21.1956 15.2809 20 16M6.32069 6.20644C3.8806 6.55106 2 8.72597 2 11.3576C2 13.0582 2.7854 14.5682 3.99965 15.5167" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const socialPlatforms = [
    {
      key: 'linkedin', cssClass: 'linkedin', placeholder: 'linkedin.com/in/username',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="socialico"><path fillRule="evenodd" clipRule="evenodd" d="M9.42857 8.96884H13.1429V10.8193C13.6783 9.75524 15.0503 8.79887 17.1114 8.79887C21.0623 8.79887 22 10.9167 22 14.8028V22H18V15.6878C18 13.4748 17.4646 12.2266 16.1029 12.2266C14.2143 12.2266 13.4286 13.5722 13.4286 15.6878V22H9.42857V8.96884ZM2.57143 21.83H6.57143V8.79887H2.57143V21.83ZM7.14286 4.54958C7.14286 4.88439 7.07635 5.21593 6.94712 5.52526C6.81789 5.83458 6.62848 6.11565 6.3897 6.3524C6.15092 6.58915 5.86745 6.77695 5.55547 6.90508C5.24349 7.0332 4.90911 7.09915 4.57143 7.09915C4.23374 7.09915 3.89937 7.0332 3.58739 6.90508C3.27541 6.77695 2.99193 6.58915 2.75315 6.3524C2.51437 6.11565 2.32496 5.83458 2.19574 5.52526C2.06651 5.21593 2 4.88439 2 4.54958C2 3.87339 2.27092 3.22489 2.75315 2.74675C3.23539 2.26862 3.88944 2 4.57143 2C5.25341 2 5.90747 2.26862 6.3897 2.74675C6.87194 3.22489 7.14286 3.87339 7.14286 4.54958Z" fill="currentColor" /></svg>,
    },
    {
      key: 'x', cssClass: 'x', placeholder: 'x.com/username',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="socialico"><path d="M13.8076 10.4686L20.8808 2H19.2046L13.063 9.3532L8.15769 2H2.5L9.91779 13.1193L2.5 22H4.17621L10.6619 14.2348L15.8423 22H21.5L13.8072 10.4686H13.8076ZM11.5118 13.2173L10.7602 12.1101L4.78017 3.29968H7.35474L12.1807 10.4099L12.9323 11.5172L19.2054 20.7594H16.6309L11.5118 13.2177V13.2173Z" fill="currentColor" /></svg>,
    },
    {
      key: 'youtube', cssClass: 'youtube', placeholder: 'youtube.com/@channel',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="socialico"><path d="M23.4994 6.50662C23.3672 6.02747 23.1033 5.58939 22.7342 5.2363C22.365 4.88321 21.9036 4.62752 21.3961 4.49486C19.5182 4.00074 11.9939 4.00074 11.9939 4.00074C8.85647 3.96531 5.7199 4.1225 2.60425 4.47133C2.0966 4.61368 1.63593 4.87526 1.26573 5.23138C0.895536 5.58749 0.628022 6.02638 0.488446 6.50662C0.151841 8.32067-0.0115629 10.1594 0.000183311 12.0007C-0.0123684 13.8421 0.151042 15.6809 0.488446 17.4949C0.625149 17.9738 0.892086 18.4111 1.26304 18.7639C1.63399 19.1166 2.09619 19.3725 2.60425 19.5066C4.50723 20.0007 11.9939 20.0007 11.9939 20.0007C15.1355 20.0362 18.2763 19.879 21.3961 19.5301C21.9036 19.3975 22.365 19.1418 22.7342 18.7887C23.1033 18.4356 23.3672 17.9975 23.4994 17.5184C23.8446 15.7052 24.0122 13.8662 24.0002 12.0243C24.0261 10.1741 23.8583 8.32597 23.4994 6.50662ZM9.60269 15.4243V8.57721L15.8625 12.0007L9.60269 15.4243Z" fill="currentColor" /></svg>,
    },
    {
      key: 'facebook', cssClass: '', placeholder: 'facebook.com/page',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="socialico"><path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z" fill="currentColor" /></svg>,
    },
    {
      key: 'instagram', cssClass: 'instagram', placeholder: 'instagram.com/username',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="socialico"><path fillRule="evenodd" clipRule="evenodd" d="M7.46494 1.066C8.63828 1.01222 9.01228 1 12 1C14.9883 1 15.3617 1.01283 16.5344 1.066C17.7059 1.11917 18.5059 1.30556 19.2056 1.5775C19.9395 1.85381 20.6043 2.28674 21.1538 2.84617C21.7133 3.3956 22.1463 4.06046 22.4225 4.79439C22.6944 5.49411 22.8802 6.29406 22.934 7.46494C22.9878 8.63828 23 9.01228 23 12C23 14.9877 22.9872 15.3617 22.934 16.5351C22.8808 17.7059 22.6944 18.5059 22.4225 19.2056C22.1414 19.9286 21.7649 20.5427 21.1538 21.1538C20.6044 21.7133 19.9395 22.1463 19.2056 22.4225C18.5059 22.6944 17.7059 22.8802 16.5351 22.934C15.3617 22.9878 14.9877 23 12 23C9.01228 23 8.63828 22.9872 7.46494 22.934C6.29406 22.8808 5.49411 22.6944 4.79439 22.4225C4.07144 22.1414 3.45728 21.7649 2.84617 21.1538C2.28664 20.6044 1.85368 19.9395 1.5775 19.2056C1.30556 18.5059 1.11978 17.7059 1.066 16.5351C1.01222 15.3617 1 14.9883 1 12C1 9.01167 1.01283 8.63828 1.066 7.46556C1.11917 6.29406 1.30556 5.49411 1.5775 4.79439C1.85381 4.06051 2.28674 3.39568 2.84617 2.84617C3.39559 2.28664 4.06045 1.85368 4.79439 1.5775C5.49411 1.30556 6.29406 1.11978 7.46494 1.066ZM16.4452 3.046C15.2853 2.99344 14.937 2.98183 12 2.98183C9.063 2.98183 8.71467 2.99344 7.55478 3.046C6.48228 3.09489 5.89989 3.27394 5.51244 3.42489C4.99911 3.62411 4.63244 3.86244 4.24744 4.24744C3.86306 4.63244 3.62411 4.99911 3.42489 5.51244C3.27394 5.89989 3.09489 6.48228 3.046 7.55478C2.99344 8.71467 2.98183 9.063 2.98183 12C2.98183 14.937 2.99344 15.2853 3.046 16.4452C3.09489 17.5177 3.27394 18.1001 3.42489 18.4876C3.60111 18.9654 3.88219 19.3976 4.24744 19.7526C4.60234 20.1178 5.03461 20.3989 5.51244 20.5751C5.89989 20.7261 6.48228 20.9051 7.55478 20.954C8.71467 21.0066 9.06239 21.0182 12 21.0182C14.9376 21.0182 15.2853 21.0066 16.4452 20.954C17.5177 20.9051 18.1001 20.7261 18.4876 20.5751C19.0009 20.3759 19.3676 20.1376 19.7526 19.7526C20.1178 19.3977 20.3989 18.9654 20.5751 18.4876C20.7261 18.1001 20.9051 17.5177 20.954 16.4452C21.0066 15.2853 21.0182 14.937 21.0182 12C21.0182 9.063 21.0066 8.71467 20.954 7.55478C20.9051 6.48228 20.7261 5.89989 20.5751 5.51244C20.3759 4.99911 20.1376 4.63244 19.7526 4.24744C19.3676 3.86306 19.0009 3.62411 18.4876 3.42489C18.1001 3.27394 17.5177 3.09489 16.4452 3.046ZM10.5955 15.3909C11.0408 15.5754 11.518 15.6703 12 15.6703C12.9735 15.6703 13.907 15.2836 14.5953 14.5953C15.2837 13.907 15.6704 12.9734 15.6704 12C15.6704 11.0266 15.2837 10.093 14.5953 9.40468C13.907 8.71636 12.9735 8.32966 12 8.32966C11.518 8.32966 11.0408 8.4246 10.5955 8.60905C10.1501 8.7935 9.74553 9.06385 9.40471 9.40468C9.06389 9.7455 8.79353 10.1501 8.60908 10.5954C8.42463 11.0407 8.3297 11.518 8.3297 12C8.3297 12.482 8.42463 12.9593 8.60908 13.4046C8.79353 13.8499 9.06389 14.2545 9.40471 14.5953C9.74553 14.9361 10.1501 15.2065 10.5955 15.3909ZM8.00205 8.00201C9.06238 6.94168 10.5005 6.34599 12 6.34599C13.4996 6.34599 14.9377 6.94168 15.998 8.00201C17.0583 9.06234 17.654 10.5005 17.654 12C17.654 13.4995 17.0583 14.9376 15.998 15.998C14.9377 17.0583 13.4996 17.654 12 17.654C10.5005 17.654 9.06238 17.0583 8.00205 15.998C6.94172 14.9376 6.34603 13.4995 6.34603 12C6.34603 10.5005 6.94172 9.06234 8.00205 8.00201ZM18.9077 7.18838C19.1583 6.93773 19.2991 6.59779 19.2991 6.24333C19.2991 5.88886 19.1583 5.54892 18.9077 5.29828C18.657 5.04764 18.3171 4.90683 17.9626 4.90683C17.6082 4.90683 17.2682 5.04764 17.0176 5.29828C16.7669 5.54892 16.6261 5.88886 16.6261 6.24333C16.6261 6.59779 16.7669 6.93773 17.0176 7.18838C17.2682 7.43902 17.6082 7.57983 17.9626 7.57983C18.3171 7.57983 18.657 7.43902 18.9077 7.18838Z" fill="currentColor" /></svg>,
    },
    {
      key: 'tiktok', cssClass: 'x', placeholder: 'tiktok.com/@username',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="socialico"><path d="M19.3214 5.56219C19.1695 5.4837 19.0217 5.39765 18.8784 5.30438C18.4618 5.02896 18.0799 4.70445 17.7408 4.33781C16.8923 3.36703 16.5754 2.38219 16.4587 1.69266H16.4634C16.3659 1.12031 16.4062 0.75 16.4123 0.75H12.5479V15.6928C12.5479 15.8934 12.5479 16.0917 12.5395 16.2877C12.5395 16.312 12.5372 16.3345 12.5358 16.3608C12.5358 16.3716 12.5358 16.3828 12.5334 16.3941C12.5334 16.3969 12.5334 16.3997 12.5334 16.4025C12.4927 16.9386 12.3208 17.4566 12.0329 17.9107C11.7451 18.3648 11.35 18.7413 10.8825 19.0069C10.3952 19.2841 9.84414 19.4295 9.28357 19.4288C7.4831 19.4288 6.02388 17.9606 6.02388 16.1475C6.02388 14.3344 7.4831 12.8663 9.28357 12.8663C9.62439 12.8659 9.96311 12.9196 10.2872 13.0252L10.2918 9.09047C9.30811 8.9634 8.30872 9.04158 7.35671 9.32008C6.4047 9.59858 5.52074 10.0714 4.7606 10.7086C4.09454 11.2873 3.53457 11.9778 3.10591 12.7491C2.94279 13.0303 2.32732 14.1605 2.25279 15.9947C2.20591 17.0358 2.51857 18.1144 2.66763 18.5602V18.5695C2.76138 18.832 3.12466 19.7278 3.71669 20.483C4.19409 21.0887 4.75811 21.6208 5.3906 22.0622V22.0528L5.39997 22.0622C7.27076 23.3334 9.34497 23.25 9.34497 23.25C9.70404 23.2355 10.9068 23.25 12.2728 22.6027C13.7878 21.885 14.6503 20.8158 14.6503 20.8158C15.2013 20.1769 15.6394 19.4488 15.9459 18.6628C16.2956 17.7436 16.4123 16.6411 16.4123 16.2005V8.27297C16.4592 8.30109 17.0836 8.71406 17.0836 8.71406C17.0836 8.71406 17.9831 9.29063 19.3865 9.66609C20.3934 9.93328 21.75 9.98953 21.75 9.98953V6.15328C21.2747 6.20484 20.3095 6.05484 19.3214 5.56219Z" fill="currentColor" /></svg>,
    },
  ]

  // Tab links derived from sibling tabs (for content link pills)
  const tabLinkNames = tabs.filter((t: any) => t.name?.trim()).map((t: any) => t.name)

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
                  {isTldrTab ? (
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

              {/* ===== TLDR Editor ===== */}
              {isTldrTab && (
                <>
                  {/* ===== TLDR: Top Section ===== */}
                  <div className="contentblock">
                    <div className="contenthead-row">
                      <h2 className="contenthead">Top Section</h2>
                    </div>
                    <div className="formblock w-form">
                      <form>
                        <div className="formcontent">
                          {/* Banner Image */}
                          <div className="fieldblocks">
                            <div className="labelrow">
                              <div className="labeltext">Banner Image</div>
                              <div className="labeldivider"></div>
                            </div>
                            <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />
                            {tldrBannerPreview && (
                              <div className="stylefield-block" style={{ justifyContent: 'flex-start' }}>
                                <div className="thumbnailpreview">
                                  <img src={tldrBannerPreview} alt="" className="fullimage" />
                                </div>
                                <div>
                                  <div className="uploadtitle">Banner image</div>
                                  <div className="uploadactions">
                                    <a href="#" className="deletelink" onClick={(e) => { e.preventDefault(); setTldrBannerPreview(null) }}>Delete</a>
                                  </div>
                                </div>
                              </div>
                            )}
                            {!tldrBannerPreview && (
                              <div className="uploadcard" style={{ cursor: 'pointer' }} onClick={() => bannerInputRef.current?.click()}>
                                {uploadIconSvg}
                                <div>Upload Image</div>
                              </div>
                            )}
                          </div>

                          {/* Logo Image */}
                          <div className="fieldblocks">
                            <div className="labelrow">
                              <div className="labeltext">Logo Image</div>
                              <div className="labeldivider"></div>
                            </div>
                            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                            {tldrLogoPreview && (
                              <div className="stylefield-block" style={{ justifyContent: 'flex-start' }}>
                                <div className="thumbnailpreview square">
                                  <img src={tldrLogoPreview} alt="" className="fullimage" />
                                </div>
                                <div>
                                  <div className="uploadtitle">Logo image</div>
                                  <div className="uploadactions">
                                    <a href="#" className="deletelink" onClick={(e) => { e.preventDefault(); setTldrLogoPreview(null) }}>Delete</a>
                                  </div>
                                </div>
                              </div>
                            )}
                            {!tldrLogoPreview && (
                              <div className="uploadcard" style={{ cursor: 'pointer' }} onClick={() => logoInputRef.current?.click()}>
                                {uploadIconSvg}
                                <div>Upload Image</div>
                              </div>
                            )}
                          </div>

                          {/* Title */}
                          <div className="fieldblocks">
                            <div className="labelrow">
                              <div className="labeltext">Title</div>
                              <div className="labeldivider"></div>
                            </div>
                            <input
                              className="formfields w-input"
                              maxLength={256}
                              placeholder=""
                              type="text"
                              value={tldrTitle}
                              onChange={(e) => setTldrTitle(e.target.value)}
                            />
                          </div>

                          {/* Subtitle */}
                          <div className="fieldblocks">
                            <div className="labelrow">
                              <div className="labeltext">Subtitle</div>
                              <div className="labeldivider"></div>
                            </div>
                            <div>
                              <textarea
                                placeholder=""
                                maxLength={5000}
                                className="formfields message _100 w-input"
                                value={tldrSubtitle}
                                onChange={(e) => setTldrSubtitle(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Social Links */}
                          <div className="fieldblocks">
                            <div className="labelrow">
                              <div className="labeltext">Social Links</div>
                              <div className="labeldivider"></div>
                            </div>
                            <div className="rowcards">
                              {socialPlatforms.map((sp, i) => (
                                <div key={sp.key} className="rowcard withdrag">
                                  <div className="alignrow aligncenter stretch middle">
                                    <div className="draggingblock">{dragIconSvg}</div>
                                    <div className={`iconpicker socials${sp.cssClass ? ` ${sp.cssClass}` : ''}`}>
                                      {sp.icon}
                                    </div>
                                    <div className="prompt-block">
                                      <input
                                        className="formfields w-input"
                                        maxLength={256}
                                        placeholder={sp.placeholder}
                                        type="text"
                                        value={tldrSocials[i]?.url ?? ''}
                                        onChange={(e) => updateSocialUrl(i, e.target.value)}
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

                  {/* ===== TLDR: Content Links ===== */}
                  <div className="contentblock">
                    <div className="contenthead-row">
                      <h2 className="contenthead">Content Links</h2>
                    </div>
                    <div className="formblock w-form">
                      <form>
                        <div className="formcontent">
                          <div className="fieldblocks">
                            <div className="labelrow">
                              <div className="labeltext">Content Links</div>
                              <div className="labeldivider"></div>
                            </div>
                            <div className="rowcards">
                              {tldrContentLinks.map((cl, i) => (
                                <div key={i} className="rowcard withdrag">
                                  <div className="alignrow aligncenter stretch">
                                    <div className="draggingblock moved">{dragIconSvg}</div>
                                    <div className="prompt-block">
                                      <div className="alignrow">
                                        <input
                                          ref={(el) => { contentImageRefs.current[i] = el }}
                                          type="file"
                                          accept="image/*"
                                          style={{ display: 'none' }}
                                          onChange={(e) => handleContentImageUpload(i, e)}
                                        />
                                        <div
                                          className="thumbnailpicker"
                                          style={{ cursor: 'pointer', ...(cl.imagePreview ? {} : { background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 11 }) }}
                                          onClick={() => contentImageRefs.current[i]?.click()}
                                        >
                                          {cl.imagePreview ? (
                                            <img src={cl.imagePreview} alt="" className="full-image" loading="lazy" />
                                          ) : (
                                            'IMG'
                                          )}
                                        </div>
                                        <input
                                          className="formfields w-input"
                                          maxLength={256}
                                          placeholder="Title"
                                          type="text"
                                          value={cl.title}
                                          onChange={(e) => updateContentLink(i, 'title', e.target.value)}
                                        />
                                      </div>
                                      <textarea
                                        placeholder="Short Description"
                                        maxLength={5000}
                                        className="formfields w-input"
                                        value={cl.description}
                                        onChange={(e) => updateContentLink(i, 'description', e.target.value)}
                                      />
                                      <input
                                        className="formfields hash w-input"
                                        maxLength={256}
                                        placeholder="Content link"
                                        type="text"
                                        value={cl.link}
                                        onChange={(e) => updateContentLink(i, 'link', e.target.value)}
                                      />
                                      <div className="alignrow aligncenter wrap">
                                        <div className="labeltext">Tab Links:</div>
                                        {tabLinkNames.map((tn: string) => {
                                          const hash = `#glance-${tn.toLowerCase().replace(/\s+/g, '-')}`
                                          const isSelected = cl.tabLink === hash
                                          return (
                                            <a
                                              key={tn}
                                              href="#"
                                              className={`calloutpill w-inline-block${isSelected ? ' selected' : ''}`}
                                              onClick={(e) => {
                                                e.preventDefault()
                                                updateContentLink(i, 'tabLink', isSelected ? '' : hash)
                                              }}
                                            >
                                              <div>{tn}</div>
                                            </a>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <a
                              href="#"
                              className="button add-new w-inline-block"
                              onClick={(e) => { e.preventDefault(); addContentLink() }}
                            >
                              <div>Add new link</div>
                            </a>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </>
              )}

              {!isTldrTab && (<>
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

              </>)}

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
                    {isTldrTab ? (
                      <div className="widget-content tldr">
                        {/* Hero Banner */}
                        {tldrBannerPreview ? (
                          <div className="tabhero">
                            <img src={tldrBannerPreview} alt="" className="full-image" loading="lazy" />
                          </div>
                        ) : (
                          <div className="tabhero" style={{ background: '#e8e8e8', minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 12 }}>
                            Banner Image
                          </div>
                        )}
                        {/* Logo + Name Block */}
                        <div className="course-logo-block">
                          <div className="logo-row">
                            {tldrLogoPreview ? (
                              <div className="widget-logo">
                                <img src={tldrLogoPreview} alt="" className="full-image" loading="lazy" />
                              </div>
                            ) : (
                              <div className="widget-logo" style={{ background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 9 }}>
                                Logo
                              </div>
                            )}
                            <div className="widget-name-block">
                              <div className="widget-name">{tldrTitle || 'Title'}</div>
                              <div className="widget-subname">{tldrSubtitle || 'Subtitle'}</div>
                            </div>
                          </div>
                          {/* Social Icons */}
                          {tldrSocials.some(s => s.url.trim()) && (
                            <div className="widget-social-row">
                              {tldrSocials.filter(s => s.url.trim()).map((s) => {
                                const sp = socialPlatforms.find(p => p.key === s.platform)
                                if (!sp) return null
                                return (
                                  <a key={s.platform} href="#" className="widget-social-icons w-inline-block" onClick={(e) => e.preventDefault()}>
                                    {/* Reuse editor icon SVG with widget class */}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="social-ico">
                                      {sp.icon.props.children}
                                    </svg>
                                  </a>
                                )
                              })}
                            </div>
                          )}
                        </div>
                        {/* Content Link Rows */}
                        {tldrContentLinks.length > 0 && (
                          <div className="content-rows">
                            {tldrContentLinks.filter(cl => cl.title.trim()).map((cl, i) => (
                              <a key={i} href="#" className="content-row-link w-inline-block" onClick={(e) => e.preventDefault()}>
                                {cl.imagePreview ? (
                                  <div className="content-row-image">
                                    <img src={cl.imagePreview} alt="" className="full-image" loading="lazy" />
                                  </div>
                                ) : (
                                  <div className="content-row-image" style={{ background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 9 }}>
                                    IMG
                                  </div>
                                )}
                                <div className="content-row-block">
                                  <div className="content-row-header">{cl.title}</div>
                                  <div className="content-row-subheader">{cl.description || 'Description'}</div>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
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
                    )}
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
