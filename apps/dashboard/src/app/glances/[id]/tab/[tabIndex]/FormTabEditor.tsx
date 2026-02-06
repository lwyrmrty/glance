'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { dragIconSvg, uploadIconSvg, type TabHookProps, type TabHookResult } from './shared/icons'

const fieldTypes = ['Text Field', 'Text Area', 'Email', 'Phone Number', 'Link / URL', 'File Upload', 'Checkbox(es)']

export interface FormTabHookResult extends TabHookResult {
  formView: 'settings' | 'submissions'
  setFormView: (v: 'settings' | 'submissions') => void
  loadSubmissions: (offset?: number) => Promise<void>
  submissions: any[]
}

export function useFormTab({ tab, glanceId, tabIndex, glanceName, themeColor, tabs, onSave, saving }: TabHookProps): FormTabHookResult {
  const tabName = tab.name || 'Untitled Tab'

  // Saved values
  const defaultFormFields = [
    { label: 'Name', type: 'Text Field' },
    { label: 'Email', type: 'Email' },
  ]
  const savedFormFields = ((tab as any).form_fields ?? []) as { label: string; type: string }[]
  const savedFormWebhookUrl = (tab as any).form_webhook_url ?? ''
  const savedFormSuccessMessage = (tab as any).form_success_message ?? ''
  const savedTldrTitle = (tab as any).tldr_title ?? ''
  const savedTldrSubtitle = (tab as any).tldr_subtitle ?? ''
  const savedBannerUrl = (tab as any).tldr_banner_url ?? null

  // State
  const [formFields, setFormFields] = useState<{ label: string; type: string }[]>(
    savedFormFields.length > 0 ? savedFormFields : defaultFormFields
  )
  const [formWebhookUrl, setFormWebhookUrl] = useState(savedFormWebhookUrl)
  const [formSuccessMessage, setFormSuccessMessage] = useState(savedFormSuccessMessage)
  const [tldrTitle, setTldrTitle] = useState(savedTldrTitle)
  const [tldrSubtitle, setTldrSubtitle] = useState(savedTldrSubtitle)
  const [tldrBannerPreview, setTldrBannerPreview] = useState<string | null>(savedBannerUrl)
  const [openFieldDropdown, setOpenFieldDropdown] = useState<number | null>(null)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)

  // Submissions state
  const [formView, setFormView] = useState<'settings' | 'submissions'>('settings')
  const [submissions, setSubmissions] = useState<any[]>([])
  const [submissionsTotal, setSubmissionsTotal] = useState(0)
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [submissionsOffset, setSubmissionsOffset] = useState(0)
  const submissionsLimit = 20

  // Banner upload
  const bannerFileRef = useRef<File | null>(null)
  const formBannerInputRef = useRef<HTMLInputElement>(null)

  const handleFormBannerUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    bannerFileRef.current = file
    setTldrBannerPreview(URL.createObjectURL(file))
  }, [])

  // Field drag-and-drop
  const [fieldDragIndex, setFieldDragIndex] = useState<number | null>(null)
  const [fieldDragOverIndex, setFieldDragOverIndex] = useState<number | null>(null)

  const handleFieldDragStart = (index: number) => setFieldDragIndex(index)
  const handleFieldDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setFieldDragOverIndex(index)
  }
  const handleFieldDrop = (index: number) => {
    if (fieldDragIndex === null || fieldDragIndex === index) {
      setFieldDragIndex(null)
      setFieldDragOverIndex(null)
      return
    }
    setFormFields(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fieldDragIndex, 1)
      updated.splice(index, 0, moved)
      return updated
    })
    setFieldDragIndex(null)
    setFieldDragOverIndex(null)
  }
  const handleFieldDragEnd = () => {
    setFieldDragIndex(null)
    setFieldDragOverIndex(null)
  }

  // Submissions loader
  const loadSubmissions = useCallback(async (offset = 0) => {
    setSubmissionsLoading(true)
    try {
      const res = await fetch(`/api/forms/submissions?widget_id=${glanceId}&tab_name=${encodeURIComponent(tabName)}&limit=${submissionsLimit}&offset=${offset}`)
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.submissions)
        setSubmissionsTotal(data.total)
        setSubmissionsOffset(offset)
      }
    } catch (e) {
      console.error('Failed to load submissions:', e)
    }
    setSubmissionsLoading(false)
  }, [glanceId, tabName])

  // Change detection
  const hasChanges =
    JSON.stringify(formFields) !== JSON.stringify(savedFormFields.length > 0 ? savedFormFields : defaultFormFields) ||
    formWebhookUrl !== savedFormWebhookUrl ||
    formSuccessMessage !== savedFormSuccessMessage ||
    tldrTitle !== savedTldrTitle ||
    tldrSubtitle !== savedTldrSubtitle ||
    tldrBannerPreview !== savedBannerUrl

  // Save — uploads banner if needed, then passes payload to orchestrator
  const handleSave = async () => {
    let bannerUrl = tldrBannerPreview
    if (bannerFileRef.current) {
      const supabase = createClient()
      const ext = bannerFileRef.current.name.split('.').pop()
      const path = `${glanceId}/banner-${tabIndex}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('logos').upload(path, bannerFileRef.current, { upsert: true })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
        bannerUrl = urlData.publicUrl
        setTldrBannerPreview(bannerUrl)
        bannerFileRef.current = null
      }
    }
    return onSave({
      tldr_title: tldrTitle,
      tldr_subtitle: tldrSubtitle,
      tldr_banner_url: bannerUrl,
      form_fields: formFields,
      form_webhook_url: formWebhookUrl,
      form_success_message: formSuccessMessage,
    })
  }

  // ===== Editor Sections (left side) =====
  const editorSections = (
    <>
      {formView === 'settings' && (
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
                    <input ref={formBannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFormBannerUpload} />
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
                      <div className="uploadcard" style={{ cursor: 'pointer' }} onClick={() => formBannerInputRef.current?.click()}>
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
                    <input className="formfields w-input" maxLength={256} placeholder="" type="text" value={tldrTitle} onChange={(e) => setTldrTitle(e.target.value)} />
                  </div>

                  {/* Subtitle */}
                  <div className="fieldblocks">
                    <div className="labelrow">
                      <div className="labeltext">Subtitle</div>
                      <div className="labeldivider"></div>
                    </div>
                    <div>
                      <textarea placeholder="" maxLength={5000} className="formfields message _100 w-input" value={tldrSubtitle} onChange={(e) => setTldrSubtitle(e.target.value)}></textarea>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* ===== Form Fields ===== */}
          <div className="contentblock">
            <div className="contenthead-row">
              <h2 className="contenthead">Form Fields</h2>
            </div>
            <div className="formblock w-form">
              <form>
                <div className="formcontent">
                  <div className="fieldblocks">
                    <div className="labelrow">
                      <div className="labeltext">Form Fields</div>
                      <div className="labeldivider"></div>
                    </div>
                    <div className="rowcards">
                      {formFields.map((field, i) => (
                        <div
                          key={i}
                          className="rowcard withdrag down"
                          draggable
                          onDragStart={() => handleFieldDragStart(i)}
                          onDragOver={(e) => handleFieldDragOver(e, i)}
                          onDrop={() => handleFieldDrop(i)}
                          onDragEnd={handleFieldDragEnd}
                          style={{
                            opacity: fieldDragIndex === i ? 0.4 : 1,
                            borderTop: fieldDragOverIndex === i && fieldDragIndex !== null && fieldDragIndex > i ? '2px solid var(--vcs-purple, #6c5ce7)' : undefined,
                            borderBottom: fieldDragOverIndex === i && fieldDragIndex !== null && fieldDragIndex < i ? '2px solid var(--vcs-purple, #6c5ce7)' : undefined,
                          }}
                        >
                          <div className="alignrow centeralign">
                            <div className="draggingblock" style={{ cursor: 'grab' }}>{dragIconSvg}</div>
                            <input
                              className="formfields w-input"
                              maxLength={256}
                              placeholder="Field label"
                              type="text"
                              required
                              value={field.label}
                              onChange={(e) => setFormFields(prev => prev.map((f, fi) => fi === i ? { ...f, label: e.target.value } : f))}
                            />
                            <div className="filterswrapper" style={{ position: 'relative' }}>
                              <a
                                href="#"
                                className="dropdownbuttons w-inline-block"
                                onClick={(e) => { e.preventDefault(); setOpenFieldDropdown(openFieldDropdown === i ? null : i) }}
                              >
                                <div className="alignrow aligncenter">
                                  <div className="navbarlink-icon">
                                    <img loading="lazy" src="/images/glanceicons.svg" alt="" className="navicon nonactive" />
                                  </div>
                                  <div>{field.type}</div>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="dropdowntoggle" style={{ transform: openFieldDropdown === i ? 'rotate(90deg)' : undefined, transition: 'transform 0.2s' }}>
                                  <path d="M10 8L14 12L10 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                              </a>
                              {openFieldDropdown === i && (
                                <div className="widgetsmodal" style={{ display: 'flex', position: 'absolute', right: 0, top: '100%', zIndex: 50, minWidth: 400, height: 'auto' }}>
                                  <div className="widgetsmodal-block">
                                    <div className="labelrow">
                                      <div className="labeltext">Field Types</div>
                                      <div className="labeldivider"></div>
                                    </div>
                                    <div className="pillswrapper">
                                      {fieldTypes.map((ft) => (
                                        <a
                                          key={ft}
                                          href="#"
                                          className={`widgetpill w-inline-block${ft === field.type ? ' active' : ''}`}
                                          onClick={(e) => {
                                            e.preventDefault()
                                            setFormFields(prev => prev.map((f, fi) => fi === i ? { ...f, type: ft } : f))
                                            setOpenFieldDropdown(null)
                                          }}
                                        >
                                          <div className="alignrow aligncenter">
                                            <div className="navbarlink-icon sm">
                                              <img loading="lazy" src="/images/glanceicons.svg" alt="" className="navicon nonactive" />
                                            </div>
                                            <div>{ft}</div>
                                          </div>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="rowcard-action">
                              <a
                                href="#"
                                className="tablebutton square w-inline-block"
                                title="Delete field"
                                style={{ color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={(e) => {
                                  e.preventDefault()
                                  setFormFields(prev => prev.filter((_, fi) => fi !== i))
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#999')}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                      <a
                        href="#"
                        className="button add-new w-inline-block"
                        onClick={(e) => {
                          e.preventDefault()
                          setFormFields(prev => [...prev, { label: '', type: 'Text Field' }])
                        }}
                      >
                        <div>Add new field</div>
                      </a>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* ===== Submission Settings ===== */}
          <div
            className="contentblock"
            onMouseEnter={() => setHoveredSection('submission-settings')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <div className="contenthead-row">
              <h2 className="contenthead">Submission Settings</h2>
            </div>
            <div className="formblock w-form">
              <form>
                <div className="formcontent">
                  <div className="fieldblocks">
                    <div className="labelrow">
                      <div className="labeltext">Success Message</div>
                      <div className="labeldivider"></div>
                    </div>
                    <div>
                      <textarea
                        placeholder="Thank you! Your submission has been received."
                        maxLength={5000}
                        className="formfields message _100 w-input"
                        value={formSuccessMessage}
                        onChange={(e) => setFormSuccessMessage(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                  <div className="fieldblocks">
                    <div className="fieldblocks">
                      <div className="labelrow">
                        <div className="labeltext">Webhook URL</div>
                        <div className="labeldivider"></div>
                      </div>
                      <input
                        className="formfields urlfield w-input"
                        maxLength={256}
                        placeholder=""
                        type="text"
                        value={formWebhookUrl}
                        onChange={(e) => setFormWebhookUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {formView === 'submissions' && (
        <div className="contentblock">
          <div className="contenthead-row">
            <h2 className="contenthead">Submissions</h2>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>
              {submissionsTotal} total
            </div>
          </div>
          {submissionsLoading && submissions.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#888', fontSize: 14 }}>
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#888', fontSize: 14 }}>
              No submissions yet. Submissions will appear here when users fill out this form.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--admin-border, #333)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#aaa', whiteSpace: 'nowrap' }}>Date</th>
                      {formFields.map((f, fi) => (
                        <th key={fi} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#aaa', whiteSpace: 'nowrap' }}>{f.label}</th>
                      ))}
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#aaa', whiteSpace: 'nowrap' }}>Webhook</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id} style={{ borderBottom: '1px solid var(--admin-border, #222)' }}>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#ccc' }}>
                          {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                          <span style={{ color: '#777' }}>{new Date(sub.submitted_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        </td>
                        {formFields.map((f, fi) => {
                          const val = sub.data?.[f.label] ?? ''
                          const isFileUrl = sub.file_urls?.[f.label]
                          return (
                            <td key={fi} style={{ padding: '10px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isFileUrl ? (
                                <a href={isFileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--vcs-purple, #6c5ce7)', textDecoration: 'underline' }}>
                                  {String(val).split('/').pop() || 'Download'}
                                </a>
                              ) : (
                                <span style={{ color: '#ddd' }}>{val || '—'}</span>
                              )}
                            </td>
                          )
                        })}
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {sub.webhook_url ? (
                            sub.webhook_status >= 200 && sub.webhook_status < 300 ? (
                              <span style={{ color: '#2ecc71' }}>{sub.webhook_status}</span>
                            ) : (
                              <span style={{ color: '#e74c3c' }}>{sub.webhook_status || 'Failed'}</span>
                            )
                          ) : (
                            <span style={{ color: '#555' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {submissionsTotal > submissionsLimit && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '16px 0' }}>
                  <button
                    type="button"
                    disabled={submissionsOffset === 0 || submissionsLoading}
                    onClick={() => loadSubmissions(Math.max(0, submissionsOffset - submissionsLimit))}
                    className="buttonblock w-inline-block"
                    style={{ border: 'none', cursor: submissionsOffset === 0 ? 'default' : 'pointer', opacity: submissionsOffset === 0 ? 0.4 : 1, fontSize: 13, padding: '8px 16px' }}
                  >
                    Previous
                  </button>
                  <span style={{ color: '#888', fontSize: 13, lineHeight: '34px' }}>
                    {submissionsOffset + 1}–{Math.min(submissionsOffset + submissionsLimit, submissionsTotal)} of {submissionsTotal}
                  </span>
                  <button
                    type="button"
                    disabled={submissionsOffset + submissionsLimit >= submissionsTotal || submissionsLoading}
                    onClick={() => loadSubmissions(submissionsOffset + submissionsLimit)}
                    className="buttonblock w-inline-block"
                    style={{ border: 'none', cursor: submissionsOffset + submissionsLimit >= submissionsTotal ? 'default' : 'pointer', opacity: submissionsOffset + submissionsLimit >= submissionsTotal ? 0.4 : 1, fontSize: 13, padding: '8px 16px' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )

  // ===== Preview (right side) =====
  const preview = (
    <div className="widget-content forms" style={{ display: 'flex' }}>
      {tldrBannerPreview && (
        <div className="tabhero no-pull">
          <img src={tldrBannerPreview} alt="" className="full-image" loading="lazy" />
        </div>
      )}
      <div className="tabheading-wrap">
        <div className="tab-heading">{tldrTitle || 'Title'}</div>
        <div className="tab-subheading">{tldrSubtitle || 'Subtitle'}</div>
      </div>
      <div className="formcontent-wrap">
        <div className="formblocks">
          <form className="formwrap" onSubmit={(e) => e.preventDefault()}>
            {formFields.map((f, i) => (
              <div key={i} className={`formfield-block${f.type === 'File Upload' ? ' upload' : ''}`}>
                <div className="labelrow">
                  <div className="formlabel">{f.label || 'Field'}</div>
                  <div className="labeldivider"></div>
                </div>
                {f.type === 'Text Area' ? (
                  <textarea className="formfields message _100 w-input" readOnly placeholder={f.label}></textarea>
                ) : f.type === 'File Upload' ? (
                  <div className="formupload">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="uploadicons">
                      <path d="M8 16L12 12M12 12L16 16M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6.3414 6.15897C7.16507 3.73597 9.38755 2 12 2C15.3137 2 18 4.79305 18 8.23846C20.2091 8.23846 22 10.1005 22 12.3974C22 13.9368 21.1956 15.2809 20 16M6.32069 6.20644C3.8806 6.55106 2 8.72597 2 11.3576C2 13.0582 2.7854 14.5682 3.99965 15.5167" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div>
                      <div>Upload</div>
                      <div className="uploadlabel">Up to 50MB</div>
                    </div>
                  </div>
                ) : f.type === 'Checkbox(es)' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <div style={{ width: 16, height: 16, border: '1.5px solid #999', borderRadius: 3 }}></div>
                    <div style={{ fontSize: 13, color: '#999' }}>{f.label}</div>
                  </div>
                ) : (
                  <input className="formfields w-input" type={f.type === 'Email' ? 'email' : f.type === 'Phone Number' ? 'tel' : 'text'} readOnly placeholder={f.label} />
                )}
              </div>
            ))}
            <input type="submit" className="formbutton w-button" value="Submit" readOnly />
          </form>
        </div>
      </div>

      {/* Success message overlay (shown when hovering Submission Settings) */}
      {hoveredSection === 'submission-settings' && (
        <div className="successmessage" style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <div className="success-message-content">
            <svg className="success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>{formSuccessMessage || 'Thank you! Your submission has been received.'}</div>
            <button className="formbutton success-back-btn" type="button" onClick={(e) => e.preventDefault()}>Go back to form</button>
          </div>
        </div>
      )}
    </div>
  )

  return { editorSections, preview, hasChanges, handleSave, formView, setFormView, loadSubmissions, submissions }
}
