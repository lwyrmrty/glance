'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { dragIconSvg, uploadIconSvg, socialPlatforms, type TabHookProps, type TabHookResult } from './shared/icons'

type ContentType = 'row' | 'stack' | 'quote' | 'photo' | 'video'

type ContentLink = {
  content_type?: ContentType
  title?: string
  description?: string
  link?: string
  tabLink?: string
  imageUrl?: string
  quoteText?: string
  quoteName?: string
  quoteTitle?: string
  imageLabel?: string
  imageLink?: string
  aspectRatio?: string
  videoUrl?: string
}

const contentTypeIcons: Record<ContentType, React.ReactNode> = {
  row: <img src="/images/row.svg" alt="" width={18} height={18} />,
  stack: <img src="/images/stack.svg" alt="" width={18} height={18} />,
  quote: <img src="/images/quote.svg" alt="" width={18} height={18} />,
  photo: <img src="/images/gallerydark.svg" alt="" width={18} height={18} />,
  video: <img src="/images/video.svg" alt="" width={18} height={18} />,
}

const normalizeContentLinks = (links: ContentLink[]) =>
  links.map((link) => ({
    content_type: link.content_type || 'row',
    title: link.title || '',
    description: link.description || '',
    link: link.link || '',
    tabLink: link.tabLink || '',
    imageUrl: link.imageUrl || '',
    quoteText: link.quoteText || '',
    quoteName: link.quoteName || '',
    quoteTitle: link.quoteTitle || '',
    imageLabel: link.imageLabel || '',
    imageLink: link.imageLink || '',
    aspectRatio: link.aspectRatio || '',
    videoUrl: link.videoUrl || '',
  }))

export function useTldrTab({ tab, glanceId, tabIndex, glanceName, themeColor, tabs, onSave, saving }: TabHookProps): TabHookResult {
  const tabType = tab.type || ''
  const isContentTab = tabType === 'Content' || tabType === 'Static Content'
  // Saved values
  const savedTldrTitle = (tab as any).tldr_title ?? ''
  const savedTldrSubtitle = (tab as any).tldr_subtitle ?? ''
  const savedBannerUrl = (tab as any).tldr_banner_url ?? null
  const savedBannerAspectRatio = (tab as any).tldr_banner_aspect_ratio ?? ''
  const savedLogoUrl = (tab as any).tldr_logo_url ?? null
  const savedSocials = (tab as any).tldr_socials ?? [
    { platform: 'linkedin', url: '' },
    { platform: 'x', url: '' },
    { platform: 'youtube', url: '' },
    { platform: 'facebook', url: '' },
    { platform: 'instagram', url: '' },
    { platform: 'tiktok', url: '' },
  ]
  const savedContentLinks = normalizeContentLinks((tab as any).tldr_content_links ?? [])

  // State
  const [tldrTitle, setTldrTitle] = useState(savedTldrTitle)
  const [tldrSubtitle, setTldrSubtitle] = useState(savedTldrSubtitle)
  const [tldrBannerPreview, setTldrBannerPreview] = useState<string | null>(savedBannerUrl)
  const [tldrBannerAspectRatio, setTldrBannerAspectRatio] = useState(savedBannerAspectRatio)
  const [tldrLogoPreview, setTldrLogoPreview] = useState<string | null>(savedLogoUrl)
  const [tldrSocials, setTldrSocials] = useState<{ platform: string; url: string }[]>(savedSocials)
  const [tldrContentLinks, setTldrContentLinks] = useState<ContentLink[]>(savedContentLinks)
  const [contentDragIndex, setContentDragIndex] = useState<number | null>(null)
  const [contentDragOverIndex, setContentDragOverIndex] = useState<number | null>(null)
  const [openContentTypeDropdown, setOpenContentTypeDropdown] = useState<number | null>(null)

  // Refs
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const contentImageRefs = useRef<(HTMLInputElement | null)[]>([])
  const contentTypeDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openContentTypeDropdown === null) return
    const handler = (e: MouseEvent) => {
      if (contentTypeDropdownRef.current && !contentTypeDropdownRef.current.contains(e.target as Node)) {
        setOpenContentTypeDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openContentTypeDropdown])

  // File refs for actual upload on save
  const bannerFileRef = useRef<File | null>(null)
  const logoFileRef = useRef<File | null>(null)
  const contentImageFileRefs = useRef<Record<number, File>>({})

  // Tab links for content link pills
  const tabLinkNames = tabs.filter((t: any) => t.name?.trim()).map((t: any) => t.name)
  const aspectRatioValue = (ratio?: string) => {
    if (!ratio) return undefined
    const map: Record<string, string> = {
      '16:9': '16 / 9',
      '2:1': '2 / 1',
      '3:1': '3 / 1',
      '4:1': '4 / 1',
    }
    return map[ratio] || undefined
  }

  // Handlers
  const handleBannerUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    bannerFileRef.current = file
    setTldrBannerPreview(URL.createObjectURL(file))
  }, [])

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    logoFileRef.current = file
    setTldrLogoPreview(URL.createObjectURL(file))
  }, [])

  const handleContentImageUpload = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    contentImageFileRefs.current[index] = file
    const url = URL.createObjectURL(file)
    setTldrContentLinks(prev => prev.map((cl, i) => (i === index ? { ...cl, imageUrl: url } : cl)))
  }, [])

  const updateSocialUrl = (index: number, url: string) => {
    setTldrSocials(prev => prev.map((s, i) => (i === index ? { ...s, url } : s)))
  }
  const addContentLink = () => {
    setTldrContentLinks(prev => [...prev, {
      content_type: 'row',
      title: '',
      description: '',
      link: '',
      tabLink: '',
      imageUrl: '',
      quoteText: '',
      quoteName: '',
      quoteTitle: '',
      imageLabel: '',
      imageLink: '',
      aspectRatio: '',
      videoUrl: '',
    }])
  }
  const updateContentLink = (index: number, field: keyof ContentLink, value: string) => {
    setTldrContentLinks(prev => prev.map((cl, i) => (i === index ? { ...cl, [field]: value } : cl)))
  }
  const updateContentType = (index: number, nextType: ContentType) => {
    setTldrContentLinks(prev => prev.map((cl, i) => (i === index ? { ...cl, content_type: nextType } : cl)))
  }
  const removeContentLink = (index: number) => {
    setTldrContentLinks(prev => prev.filter((_, i) => i !== index))
  }
  const handleContentDragStart = (index: number) => {
    setContentDragIndex(index)
  }
  const handleContentDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault()
    if (contentDragIndex === null || contentDragIndex === index) return
    setContentDragOverIndex(index)
  }
  const handleContentDrop = (index: number) => {
    if (contentDragIndex === null || contentDragIndex === index) return
    setTldrContentLinks((prev) => {
      const next = [...prev]
      const [moved] = next.splice(contentDragIndex, 1)
      next.splice(index, 0, moved)
      return next
    })
    setContentDragIndex(null)
    setContentDragOverIndex(null)
  }
  const handleContentDragEnd = () => {
    setContentDragIndex(null)
    setContentDragOverIndex(null)
  }

  // Change detection
  const hasChanges =
    tldrTitle !== savedTldrTitle ||
    tldrSubtitle !== savedTldrSubtitle ||
    tldrBannerPreview !== savedBannerUrl ||
    tldrBannerAspectRatio !== savedBannerAspectRatio ||
    tldrLogoPreview !== savedLogoUrl ||
    JSON.stringify(tldrSocials) !== JSON.stringify(savedSocials) ||
    JSON.stringify(tldrContentLinks) !== JSON.stringify(savedContentLinks)

  // Save handler — uploads images to Supabase storage first
  const handleSave = async () => {
    const supabase = createClient()

    // Upload banner if a new file was selected
    let bannerUrl = tldrBannerPreview
    if (bannerFileRef.current) {
      const ext = bannerFileRef.current.name.split('.').pop()
      const path = `${glanceId}/banner-${tabIndex}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('logos').upload(path, bannerFileRef.current, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
        bannerUrl = urlData.publicUrl
        setTldrBannerPreview(bannerUrl)
        bannerFileRef.current = null
      }
    }

    // Upload logo if a new file was selected
    let logoUrl = tldrLogoPreview
    if (logoFileRef.current) {
      const ext = logoFileRef.current.name.split('.').pop()
      const path = `${glanceId}/tldr-logo-${tabIndex}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('logos').upload(path, logoFileRef.current, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
        logoUrl = urlData.publicUrl
        setTldrLogoPreview(logoUrl)
        logoFileRef.current = null
      }
    }

    // Upload content link images if new files were selected
    const updatedContentLinks = [...tldrContentLinks]
    for (const [indexStr, file] of Object.entries(contentImageFileRefs.current)) {
      const idx = parseInt(indexStr, 10)
      if (!file || idx >= updatedContentLinks.length) continue
      const ext = file.name.split('.').pop()
      const path = `${glanceId}/content-${tabIndex}-${idx}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
        updatedContentLinks[idx] = { ...updatedContentLinks[idx], imageUrl: urlData.publicUrl }
      }
    }
    contentImageFileRefs.current = {}
    setTldrContentLinks(updatedContentLinks)

    return onSave({
      tldr_title: tldrTitle,
      tldr_subtitle: tldrSubtitle,
      tldr_banner_url: bannerUrl,
      tldr_banner_aspect_ratio: tldrBannerAspectRatio || null,
      tldr_logo_url: logoUrl,
      tldr_socials: tldrSocials,
      tldr_content_links: updatedContentLinks,
    })
  }

  // ===== Editor Sections (left side) =====
  const editorSections = (
    <>
      {/* ===== Top Section ===== */}
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
                    <div className="thumbnailpreview" style={{ aspectRatio: aspectRatioValue(tldrBannerAspectRatio) }}>
                      <img src={tldrBannerPreview} alt="" className="fullimage" />
                    </div>
                    <div>
                      <div className="uploadtitle">Banner image</div>
                      <div className="uploadactions">
                        <a href="#" className="deletelink" onClick={(e) => { e.preventDefault(); setTldrBannerPreview(null); bannerFileRef.current = null }}>Delete</a>
                      </div>
                    </div>
                  </div>
                )}
                {!tldrBannerPreview && (
                  <div className="uploadcard" style={{ cursor: 'pointer', aspectRatio: aspectRatioValue(tldrBannerAspectRatio) }} onClick={() => bannerInputRef.current?.click()}>
                    {uploadIconSvg}
                    <div>Upload Image</div>
                  </div>
                )}
                <div className="alignrow aligncenter wrap">
                  <div className="labeltext">Aspect Ratio</div>
                  {['16:9', '2:1', '3:1', '4:1'].map((ratio) => {
                    const isSelected = tldrBannerAspectRatio === ratio
                    return (
                      <a
                        key={ratio}
                        href="#"
                        className={`calloutpill w-inline-block${isSelected ? ' selected' : ''}`}
                        onClick={(e) => {
                          e.preventDefault()
                          setTldrBannerAspectRatio(isSelected ? '' : ratio)
                        }}
                      >
                        <div>{ratio}</div>
                      </a>
                    )
                  })}
                </div>
              </div>

              {/* Logo Image */}
              <div className="fieldblocks">
                <div className="labelrow">
                  <div className="labeltext">Logo</div>
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
                        <a href="#" className="deletelink" onClick={(e) => { e.preventDefault(); setTldrLogoPreview(null); logoFileRef.current = null }}>Delete</a>
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

      {/* ===== Content Links ===== */}
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
                  {tldrContentLinks.map((cl, i) => {
                    const activeType = cl.content_type || 'row'
                    return (
                    <div
                      key={i}
                      className="rowcard withdrag down"
                      draggable
                      onDragStart={() => handleContentDragStart(i)}
                      onDragOver={(e) => handleContentDragOver(e, i)}
                      onDrop={() => handleContentDrop(i)}
                      onDragEnd={handleContentDragEnd}
                      style={{
                        opacity: contentDragIndex === i ? 0.4 : 1,
                        borderTop: contentDragOverIndex === i && contentDragIndex !== null && contentDragIndex > i ? '2px solid var(--vcs-purple, #6c5ce7)' : undefined,
                        borderBottom: contentDragOverIndex === i && contentDragIndex !== null && contentDragIndex < i ? '2px solid var(--vcs-purple, #6c5ce7)' : undefined,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <div className="alignrow aligncenter stretch">
                        <div className="draggingblock moved">{dragIconSvg}</div>
                        <div className="prompt-block">
                          <div className="filterswrapper filterswrapper-full" ref={openContentTypeDropdown === i ? contentTypeDropdownRef : undefined}>
                            <a
                              href="#"
                              className={`dropdownbuttons dropdownbuttons-full ${activeType ? '' : 'empty'} w-inline-block`}
                              onClick={(e) => { e.preventDefault(); setOpenContentTypeDropdown(openContentTypeDropdown === i ? null : i) }}
                            >
                              <div className="alignrow aligncenter">
                                <div className="navbarlink-icon sm">
                                  {contentTypeIcons[activeType]}
                                </div>
                                <div>{activeType.charAt(0).toUpperCase() + activeType.slice(1)}</div>
                              </div>
                              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="dropdowntoggle" style={{ transform: openContentTypeDropdown === i ? 'rotate(90deg)' : undefined, transition: 'transform 0.2s' }}>
                                <path d="M10 8L14 12L10 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </a>
                            {openContentTypeDropdown === i && (
                              <div className="widgetsmodal" style={{ display: 'flex', position: 'absolute', inset: 'auto', right: 0, top: '100%', zIndex: 50, minWidth: 200, height: 'auto' }}>
                                <div className="widgetsmodal-block">
                                  <div className="labelrow">
                                    <div className="labeltext">Content Type</div>
                                    <div className="labeldivider" />
                                  </div>
                                  <div className="pillswrapper">
                                    {(['row', 'stack', 'quote', 'photo', 'video'] as ContentType[]).map((type) => (
                                      <a
                                        key={type}
                                        href="#"
                                        className={`widgetpill w-inline-block${activeType === type ? ' active' : ''}`}
                                        onClick={(e) => {
                                          e.preventDefault()
                                          updateContentType(i, type)
                                          setOpenContentTypeDropdown(null)
                                        }}
                                      >
                                        <div className="alignrow aligncenter">
                                          <div className="navbarlink-icon sm">
                                            {contentTypeIcons[type]}
                                          </div>
                                          <div>{type.charAt(0).toUpperCase() + type.slice(1)}</div>
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div content-type="video" className="contenttype-block" style={{ display: activeType === 'video' ? 'flex' : 'none' }}>
                            <input
                              className="formfields hash w-input"
                              maxLength={256}
                              name="name"
                              data-name="Name"
                              placeholder="Link to video (YouTube, Vimeo, Loom, etc)"
                              type="text"
                              id="name"
                              value={cl.videoUrl || ''}
                              onChange={(e) => updateContentLink(i, 'videoUrl', e.target.value)}
                            />
                          </div>

                          <div content-type="photo" className="contenttype-block" style={{ display: activeType === 'photo' ? 'flex' : 'none' }}>
                            <input
                              ref={(el) => { contentImageRefs.current[i] = el }}
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleContentImageUpload(i, e)}
                            />
                            {cl.imageUrl ? (
                              <div className="stylefield-block" style={{ justifyContent: 'flex-start' }}>
                                <div className="thumbnailpreview" style={{ aspectRatio: aspectRatioValue(cl.aspectRatio) }}>
                                  <img src={cl.imageUrl} alt="" className="fullimage" />
                                </div>
                                <div>
                                  <div className="uploadtitle">Upload image</div>
                                  <div className="uploadactions">
                                    <a href="#" className="deletelink" onClick={(e) => { e.preventDefault(); updateContentLink(i, 'imageUrl', '') }}>Delete</a>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="uploadcard"
                                style={{ cursor: 'pointer', aspectRatio: aspectRatioValue(cl.aspectRatio) }}
                                onClick={() => contentImageRefs.current[i]?.click()}
                              >
                                {uploadIconSvg}
                                <div>Upload Image</div>
                              </div>
                            )}
                            <div className="alignrow aligncenter wrap">
                              <div className="labeltext">Aspect Ratio</div>
                              {['16:9', '2:1', '3:1', '4:1'].map((ratio) => {
                                const isSelected = cl.aspectRatio === ratio
                                return (
                                  <a
                                    key={ratio}
                                    href="#"
                                    className={`calloutpill w-inline-block${isSelected ? ' selected' : ''}`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      updateContentLink(i, 'aspectRatio', isSelected ? '' : ratio)
                                    }}
                                  >
                                    <div>{ratio}</div>
                                  </a>
                                )
                              })}
                            </div>
                            <div className="alignrow">
                              <input
                                className="formfields w-input"
                                maxLength={256}
                                name="field-3"
                                data-name="Field 3"
                                placeholder="Image Label"
                                type="text"
                                id="field-3"
                                value={cl.imageLabel || ''}
                                onChange={(e) => updateContentLink(i, 'imageLabel', e.target.value)}
                              />
                            </div>
                            <input
                              className="formfields hash w-input"
                              maxLength={256}
                              name="name"
                              data-name="Name"
                              placeholder="Image link (optional)"
                              type="text"
                              id="name"
                              value={cl.imageLink || ''}
                              onChange={(e) => updateContentLink(i, 'imageLink', e.target.value)}
                            />
                            <div className="alignrow aligncenter wrap">
                              <div className="labeltext">Links:</div>
                              {tabLinkNames.map((tn: string) => {
                                const hash = `#glance-${tn.toLowerCase().replace(/\s+/g, '-')}`
                                const isSelected = cl.tabLink === hash || cl.imageLink === hash
                                return (
                                  <a
                                    key={tn}
                                    href="#"
                                    className={`calloutpill w-inline-block${isSelected ? ' selected' : ''}`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      const newVal = isSelected ? '' : hash
                                      updateContentLink(i, 'tabLink', newVal)
                                      updateContentLink(i, 'imageLink', newVal)
                                    }}
                                  >
                                    <div>{tn}</div>
                                  </a>
                                )
                              })}
                            </div>
                          </div>

                          <div content-type="row" className="contenttype-block" style={{ display: activeType === 'row' ? 'flex' : 'none' }}>
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
                                style={{ cursor: 'pointer', ...(cl.imageUrl ? {} : { background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 11 }) }}
                                onClick={() => contentImageRefs.current[i]?.click()}
                              >
                                {cl.imageUrl ? (
                                  <img src={cl.imageUrl} alt="" className="full-image" loading="lazy" />
                                ) : (
                                  'IMG'
                                )}
                              </div>
                              <input
                                className="formfields w-input"
                                maxLength={256}
                                name="field-3"
                                data-name="Field 3"
                                placeholder="Title"
                                type="text"
                                id="field-3"
                                value={cl.title || ''}
                                onChange={(e) => updateContentLink(i, 'title', e.target.value)}
                              />
                            </div>
                            <textarea
                              placeholder="Short Description"
                              maxLength={5000}
                              id="field-4"
                              name="field-4"
                              data-name="Field 4"
                              className="formfields w-input"
                              value={cl.description || ''}
                              onChange={(e) => updateContentLink(i, 'description', e.target.value)}
                            />
                            <input
                              className="formfields hash w-input"
                              maxLength={256}
                              name="name"
                              data-name="Name"
                              placeholder="Content link"
                              type="text"
                              id="name"
                              value={cl.link || ''}
                              onChange={(e) => updateContentLink(i, 'link', e.target.value)}
                            />
                            <div className="alignrow aligncenter wrap">
                              <div className="labeltext">Tab Links:</div>
                              {tabLinkNames.map((tn: string) => {
                                const hash = `#glance-${tn.toLowerCase().replace(/\s+/g, '-')}`
                                const isSelected = cl.tabLink === hash || cl.link === hash
                                return (
                                  <a
                                    key={tn}
                                    href="#"
                                    className={`calloutpill w-inline-block${isSelected ? ' selected' : ''}`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      const newVal = isSelected ? '' : hash
                                      updateContentLink(i, 'tabLink', newVal)
                                      updateContentLink(i, 'link', newVal)
                                    }}
                                  >
                                    <div>{tn}</div>
                                  </a>
                                )
                              })}
                            </div>
                          </div>

                          <div content-type="stack" className="contenttype-block" style={{ display: activeType === 'stack' ? 'flex' : 'none' }}>
                            <input
                              ref={(el) => { contentImageRefs.current[i] = el }}
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleContentImageUpload(i, e)}
                            />
                            {cl.imageUrl ? (
                              <div className="stylefield-block" style={{ justifyContent: 'flex-start' }}>
                                <div className="thumbnailpreview" style={{ aspectRatio: aspectRatioValue(cl.aspectRatio) }}>
                                  <img src={cl.imageUrl} alt="" className="fullimage" />
                                </div>
                                <div>
                                  <div className="uploadtitle">Upload image</div>
                                  <div className="uploadactions">
                                    <a href="#" className="deletelink" onClick={(e) => { e.preventDefault(); updateContentLink(i, 'imageUrl', '') }}>Delete</a>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="uploadcard"
                                style={{ cursor: 'pointer', aspectRatio: aspectRatioValue(cl.aspectRatio) }}
                                onClick={() => contentImageRefs.current[i]?.click()}
                              >
                                {uploadIconSvg}
                                <div>Upload Image</div>
                              </div>
                            )}
                            <div className="alignrow aligncenter wrap">
                              <div className="labeltext">Aspect Ratio:</div>
                              {['16:9', '2:1', '3:1', '4:1'].map((ratio) => {
                                const isSelected = cl.aspectRatio === ratio
                                return (
                                  <a
                                    key={ratio}
                                    href="#"
                                    className={`calloutpill w-inline-block${isSelected ? ' selected' : ''}`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      updateContentLink(i, 'aspectRatio', isSelected ? '' : ratio)
                                    }}
                                  >
                                    <div>{ratio}</div>
                                  </a>
                                )
                              })}
                            </div>
                            <div className="alignrow">
                              <input
                                className="formfields w-input"
                                maxLength={256}
                                name="field-3"
                                data-name="Field 3"
                                placeholder="Title"
                                type="text"
                                id="field-3"
                                value={cl.title || ''}
                                onChange={(e) => updateContentLink(i, 'title', e.target.value)}
                              />
                            </div>
                            <textarea
                              placeholder="Short Description"
                              maxLength={5000}
                              id="field-4"
                              name="field-4"
                              data-name="Field 4"
                              className="formfields w-input"
                              value={cl.description || ''}
                              onChange={(e) => updateContentLink(i, 'description', e.target.value)}
                            />
                            <input
                              className="formfields hash w-input"
                              maxLength={256}
                              name="name"
                              data-name="Name"
                              placeholder="Content link"
                              type="text"
                              id="name"
                              value={cl.link || ''}
                              onChange={(e) => updateContentLink(i, 'link', e.target.value)}
                            />
                            <div className="alignrow aligncenter wrap">
                              <div className="labeltext">Tab Links:</div>
                              {tabLinkNames.map((tn: string) => {
                                const hash = `#glance-${tn.toLowerCase().replace(/\s+/g, '-')}`
                                const isSelected = cl.tabLink === hash || cl.link === hash
                                return (
                                  <a
                                    key={tn}
                                    href="#"
                                    className={`calloutpill w-inline-block${isSelected ? ' selected' : ''}`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      const newVal = isSelected ? '' : hash
                                      updateContentLink(i, 'tabLink', newVal)
                                      updateContentLink(i, 'link', newVal)
                                    }}
                                  >
                                    <div>{tn}</div>
                                  </a>
                                )
                              })}
                            </div>
                          </div>

                          <div content-type="quote" className="contenttype-block" style={{ display: activeType === 'quote' ? 'flex' : 'none' }}>
                            <input
                              ref={(el) => { contentImageRefs.current[i] = el }}
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleContentImageUpload(i, e)}
                            />
                            <div className="alignrow">
                              <div
                                className="thumbnailpicker"
                                style={{ cursor: 'pointer', ...(cl.imageUrl ? {} : { background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 11 }) }}
                                onClick={() => contentImageRefs.current[i]?.click()}
                              >
                                {cl.imageUrl ? (
                                  <img src={cl.imageUrl} alt="" className="full-image" loading="lazy" />
                                ) : (
                                  'IMG'
                                )}
                              </div>
                              <input
                                className="formfields w-input"
                                maxLength={256}
                                placeholder="Name"
                                type="text"
                                value={cl.quoteName || ''}
                                onChange={(e) => updateContentLink(i, 'quoteName', e.target.value)}
                              />
                            </div>
                            <input
                              className="formfields w-input"
                              maxLength={256}
                              placeholder="Title"
                              type="text"
                              value={cl.quoteTitle || ''}
                              onChange={(e) => updateContentLink(i, 'quoteTitle', e.target.value)}
                            />
                            <textarea
                              placeholder="Quote"
                              maxLength={5000}
                              className="formfields w-input"
                              value={cl.quoteText || ''}
                              onChange={(e) => updateContentLink(i, 'quoteText', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="rowcard-actions" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                        <div
                          className="rowcard-action delete"
                          title="Delete content link"
                          style={{ cursor: 'pointer' }}
                          onClick={() => removeContentLink(i)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                    )
                  })}
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
  )

  // ===== Preview (right side) =====
  const preview = (
    <div className="widget-content tldr">
      {/* Hero Banner */}
      {tldrBannerPreview ? (
        <div className="tabhero" style={tldrBannerAspectRatio ? { aspectRatio: aspectRatioValue(tldrBannerAspectRatio), height: 'auto' } : undefined}>
          <img src={tldrBannerPreview} alt="" className="full-image" loading="lazy" />
        </div>
      ) : (
        <div className="tabhero" style={{ background: '#e8e8e8', minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 12 }}>
          Banner Image
        </div>
      )}
      {/* Name Block */}
      <div className="course-logo-block">
        <div className="logo-row">
          {tldrLogoPreview && (
            <div className="widget-logo">
              <img src={tldrLogoPreview} alt="" className="full-image" loading="lazy" />
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
          {tldrContentLinks.map((cl, i) => {
            const contentType = cl.content_type || 'row'
            if (contentType === 'row') {
              return (
                <div key={i} content-type="row" className="contenttype">
                  <a href="#" className="content-row-link w-inline-block" onClick={(e) => e.preventDefault()}>
                    {cl.imageUrl ? (
                      <div className="content-row-image">
                        <img src={cl.imageUrl} alt="" className="full-image" loading="lazy" />
                      </div>
                    ) : (
                      <div className="content-row-image" style={{ background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 9 }}>
                        IMG
                      </div>
                    )}
                    <div className="content-row-block">
                      <div className="content-row-header">{cl.title || 'Title'}</div>
                      <div className="content-row-subheader">{cl.description || 'Description'}</div>
                    </div>
                  </a>
                </div>
              )
            }
            if (contentType === 'stack') {
              return (
                <div key={i} content-type="stack" className="contenttype">
                  <a href="#" className="content-stack-link w-inline-block" onClick={(e) => e.preventDefault()}>
                    <div className="content-stack-image" style={{ aspectRatio: aspectRatioValue(cl.aspectRatio) }}>
                      {cl.imageUrl ? (
                        <img src={cl.imageUrl} alt="" className="full-image" loading="lazy" />
                      ) : (
                        <div className="full-image" style={{ background: '#e8e8e8' }} />
                      )}
                    </div>
                    <div className="content-stack-block">
                      <div className="content-stack-header">{cl.title || 'Title'}</div>
                      <div className="content-stack-subheader">{cl.description || 'Description'}</div>
                    </div>
                  </a>
                </div>
              )
            }
            if (contentType === 'quote') {
              return (
                <div key={i} content-type="quote" className="contenttype">
                  <div className="content-quote">
                    <div className="content-quote-wrapper">
                      <div className="text-block-2">{cl.quoteText || 'Quote text goes here.'}</div>
                    </div>
                    <div className="contentquote-row">
                      <div className="content-quote-image">
                        {cl.imageUrl ? (
                          <img src={cl.imageUrl} alt="" className="full-image" loading="lazy" />
                        ) : (
                          <div className="full-image" style={{ background: '#e8e8e8' }} />
                        )}
                      </div>
                      <div>
                        <div className="content-quote-name">{cl.quoteName || 'Name'}</div>
                        <div className="content-quote-title">{cl.quoteTitle || 'Title'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            if (contentType === 'photo') {
              return (
                <div key={i} content-type="photo" className="contenttype">
                  <div className="galleryimage" style={{ aspectRatio: aspectRatioValue(cl.aspectRatio) }}>
                    {cl.imageUrl ? (
                      <img src={cl.imageUrl} alt="" className="full-image" loading="lazy" />
                    ) : (
                      <div className="full-image" style={{ background: '#e8e8e8' }} />
                    )}
                    {cl.imageLabel?.trim() && (
                      <div className="imageoverlay">
                        <div>{cl.imageLabel}</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }
            if (contentType === 'video') {
              return (
                <div key={i} content-type="video" className="contenttype">
                  <div className="videowrapper">
                    <div style={{ paddingTop: '56.17021276595745%' }} className="w-video w-embed">
                      <iframe
                        className="embedly-embed"
                        src={cl.videoUrl || ''}
                        width="940"
                        height="528"
                        scrolling="no"
                        allowFullScreen
                        title="Video"
                      ></iframe>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          })}
        </div>
      )}
    </div>
  )

  return { editorSections, preview, hasChanges, handleSave }
}
