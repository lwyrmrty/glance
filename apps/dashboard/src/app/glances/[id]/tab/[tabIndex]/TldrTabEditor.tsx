'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { dragIconSvg, uploadIconSvg, socialPlatforms, type TabHookProps, type TabHookResult } from './shared/icons'

export function useTldrTab({ tab, glanceId, tabIndex, glanceName, themeColor, tabs, onSave, saving }: TabHookProps): TabHookResult {
  const tabType = tab.type || ''
  const isContentTab = tabType === 'Content'
  // Saved values
  const savedTldrTitle = (tab as any).tldr_title ?? ''
  const savedTldrSubtitle = (tab as any).tldr_subtitle ?? ''
  const savedBannerUrl = (tab as any).tldr_banner_url ?? null
  const savedLogoUrl = (tab as any).tldr_logo_url ?? null
  const savedSocials = (tab as any).tldr_socials ?? [
    { platform: 'linkedin', url: '' },
    { platform: 'x', url: '' },
    { platform: 'youtube', url: '' },
    { platform: 'facebook', url: '' },
    { platform: 'instagram', url: '' },
    { platform: 'tiktok', url: '' },
  ]
  const savedContentLinks = (tab as any).tldr_content_links ?? []

  // State
  const [tldrTitle, setTldrTitle] = useState(savedTldrTitle)
  const [tldrSubtitle, setTldrSubtitle] = useState(savedTldrSubtitle)
  const [tldrBannerPreview, setTldrBannerPreview] = useState<string | null>(savedBannerUrl)
  const [tldrLogoPreview, setTldrLogoPreview] = useState<string | null>(savedLogoUrl)
  const [tldrSocials, setTldrSocials] = useState<{ platform: string; url: string }[]>(savedSocials)
  const [tldrContentLinks, setTldrContentLinks] = useState<{ title: string; description: string; link: string; tabLink: string; imageUrl?: string }[]>(savedContentLinks)

  // Refs
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const contentImageRefs = useRef<(HTMLInputElement | null)[]>([])

  // File refs for actual upload on save
  const bannerFileRef = useRef<File | null>(null)
  const logoFileRef = useRef<File | null>(null)
  const contentImageFileRefs = useRef<Record<number, File>>({})

  // Tab links for content link pills
  const tabLinkNames = tabs.filter((t: any) => t.name?.trim()).map((t: any) => t.name)

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
    setTldrContentLinks(prev => [...prev, { title: '', description: '', link: '', tabLink: '' }])
  }
  const updateContentLink = (index: number, field: string, value: string) => {
    setTldrContentLinks(prev => prev.map((cl, i) => (i === index ? { ...cl, [field]: value } : cl)))
  }
  const removeContentLink = (index: number) => {
    setTldrContentLinks(prev => prev.filter((_, i) => i !== index))
  }

  // Change detection
  const hasChanges =
    tldrTitle !== savedTldrTitle ||
    tldrSubtitle !== savedTldrSubtitle ||
    tldrBannerPreview !== savedBannerUrl ||
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
      const path = `${glanceId}/logo-${tabIndex}-${Date.now()}.${ext}`
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
                    <div className="thumbnailpreview">
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
                  <div className="uploadcard" style={{ cursor: 'pointer' }} onClick={() => bannerInputRef.current?.click()}>
                    {uploadIconSvg}
                    <div>Upload Image</div>
                  </div>
                )}
              </div>

              {/* Logo Image (TLDR only, not Content) */}
              {!isContentTab && (
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
              )}

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
  )

  // ===== Preview (right side) =====
  const preview = (
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
                <div className="content-row-header">{cl.title}</div>
                <div className="content-row-subheader">{cl.description || 'Description'}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )

  return { editorSections, preview, hasChanges, handleSave }
}
