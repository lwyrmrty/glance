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
  submissionsTotal: number
  submissionsPanel: React.ReactNode
}

export function useFormTab({ tab, glanceId, tabIndex, glanceName, themeColor, tabs, onSave, saving, isPremium }: TabHookProps): FormTabHookResult {
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

  // Detail panel selection
  const [selectedSub, setSelectedSub] = useState<any | null>(null)

  // Bulk selection state for submissions
  const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set())
  const [deletingSubmissions, setDeletingSubmissions] = useState(false)

  const allSubsSelected = submissions.length > 0 && selectedSubIds.size === submissions.length
  const someSubsSelected = selectedSubIds.size > 0

  const toggleSelectAllSubs = () => {
    if (allSubsSelected) {
      setSelectedSubIds(new Set())
    } else {
      setSelectedSubIds(new Set(submissions.map((s: any) => s.id)))
    }
  }

  const toggleSelectOneSub = (id: string) => {
    setSelectedSubIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleBulkDeleteSubmissions = async () => {
    if (selectedSubIds.size === 0) return
    const count = selectedSubIds.size
    if (!confirm(`Delete ${count} submission${count > 1 ? 's' : ''}? This cannot be undone.`)) return

    setDeletingSubmissions(true)
    try {
      const res = await fetch('/api/forms/submissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedSubIds) }),
      })
      if (res.ok) {
        setSubmissions(prev => prev.filter((s: any) => !selectedSubIds.has(s.id)))
        setSubmissionsTotal(prev => prev - count)
        setSelectedSubIds(new Set())
      }
    } catch (e) {
      console.error('Failed to delete submissions:', e)
    }
    setDeletingSubmissions(false)
  }

  // ===== Helpers matching workspace submissions page =====
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' \u2022 ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const getRowName = (sub: any): React.ReactNode => {
    const d = sub.data || {}
    const firstName = d['_user_first_name'] || d['First Name'] || d['first_name'] || ''
    const lastName = d['_user_last_name'] || d['Last Name'] || d['last_name'] || ''
    const email = d['_user_email'] || d['Email'] || d['email'] || ''
    const name = [firstName, lastName].filter(Boolean).join(' ')
    if (name && email) return <>{name} <span className="dim">({email})</span></>
    if (name) return name
    if (email) return email
    return <>{sub.form_name} <span className="dim">— Anonymous User</span></>
  }

  const getVisibleFields = (data: Record<string, string>): [string, string][] =>
    Object.entries(data || {}).filter(([k]) => !k.startsWith('_'))

  const getSubmittedBy = (data: Record<string, string>) => {
    const email = data['_user_email']
    const firstName = data['_user_first_name']
    const lastName = data['_user_last_name']
    if (!email && !firstName) return null
    return { email: email || '', name: [firstName, lastName].filter(Boolean).join(' ') }
  }

  const webhookLabel = (status: number | null) => {
    if (status === null || status === undefined) return null
    if (status === 0) return { text: 'Failed', color: '#ef4444' }
    if (status >= 200 && status < 300) return { text: `${status} OK`, color: '#22c55e' }
    return { text: `${status} Error`, color: '#ef4444' }
  }

  const handleDeleteSingleSub = async (id: string) => {
    if (!confirm('Delete this submission? This cannot be undone.')) return
    try {
      const res = await fetch('/api/forms/submissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      if (res.ok) {
        setSelectedSub(null)
        loadSubmissions(submissionsOffset)
      }
    } catch (e) {
      console.error('Failed to delete submission:', e)
    }
  }

  const handleExportCsv = () => {
    if (submissions.length === 0) return
    const headers = ['Date', ...formFields.map(f => f.label), 'Webhook Status']
    const rows = submissions.map((sub: any) => {
      const date = new Date(sub.submitted_at).toLocaleString()
      const fields = formFields.map(f => {
        const fileUrl = sub.file_urls?.[f.label]
        return fileUrl ? fileUrl : (sub.data?.[f.label] ?? '')
      })
      const webhook = sub.webhook_url
        ? (sub.webhook_status >= 200 && sub.webhook_status < 300 ? String(sub.webhook_status) : 'Failed')
        : ''
      return [date, ...fields, webhook]
    })

    const escape = (val: string) => `"${String(val).replace(/"/g, '""')}"`
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tabName.replace(/\s+/g, '-').toLowerCase()}-submissions.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Success message ref + variable insertion
  const successMessageRef = useRef<HTMLTextAreaElement>(null)
  const insertSuccessVariable = (variable: string) => {
    const textarea = successMessageRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const token = `{{${variable}}}`
    const newValue = formSuccessMessage.slice(0, start) + token + formSuccessMessage.slice(end)
    setFormSuccessMessage(newValue)
    requestAnimationFrame(() => {
      textarea.focus()
      const cursorPos = start + token.length
      textarea.setSelectionRange(cursorPos, cursorPos)
    })
  }

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
                                <div className="widgetsmodal" style={{ display: 'flex', position: 'absolute', inset: 'auto', right: 0, top: '100%', zIndex: 50, minWidth: 400, height: 'auto' }}>
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
                            <div
                              className="rowcard-action delete"
                              title="Delete field"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setFormFields(prev => prev.filter((_, fi) => fi !== i))}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
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
                        ref={successMessageRef}
                        placeholder="Thank you! Your submission has been received."
                        maxLength={5000}
                        className="formfields message _100 w-input"
                        value={formSuccessMessage}
                        onChange={(e) => setFormSuccessMessage(e.target.value)}
                      ></textarea>
                    </div>
                    {isPremium && (
                      <div className="alignrow aligncenter">
                        <div className="labeltext dim">User Variables:</div>
                        <a href="#" className="calloutpill w-inline-block" onClick={(e) => { e.preventDefault(); insertSuccessVariable('first_name') }}>
                          <div>First Name</div>
                        </a>
                        <a href="#" className="calloutpill w-inline-block" onClick={(e) => { e.preventDefault(); insertSuccessVariable('last_name') }}>
                          <div>Last Name</div>
                        </a>
                        <a href="#" className="calloutpill w-inline-block" onClick={(e) => { e.preventDefault(); insertSuccessVariable('email') }}>
                          <div>Email Address</div>
                        </a>
                      </div>
                    )}
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
          <div>
            {/* Table header */}
            <div className="tablerow header">
              <div className="tablerow-left">
                <div className="tableblock">
                  <div className="checkboxwrapper" onClick={toggleSelectAllSubs} style={{ cursor: 'pointer' }}>
                    <div className={`checkboxelement${allSubsSelected ? ' checked' : ''}`}></div>
                  </div>
                  <div className="bulkactions-row">
                    <a
                      href="#"
                      className="bulkaction-button delete w-inline-block"
                      onClick={(e) => { e.preventDefault(); handleBulkDeleteSubmissions() }}
                      style={{ opacity: someSubsSelected && !deletingSubmissions ? 1 : 0.4, pointerEvents: someSubsSelected && !deletingSubmissions ? 'auto' : 'none' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="actionicon">
                        <path d="M14.5 18C15.3284 18 16 17.3284 16 16.5V10.5C16 9.67158 15.3284 9 14.5 9C13.6716 9 13 9.67158 13 10.5V16.5C13 17.3284 13.6716 18 14.5 18Z" fill="currentColor"></path>
                        <path d="M9.5 18C10.3284 18 11 17.3284 11 16.5V10.5C11 9.67158 10.3284 9 9.5 9C8.67158 9 8 9.67158 8 10.5V16.5C8 17.3284 8.67158 18 9.5 18Z" fill="currentColor"></path>
                        <path d="M23 4.5C23 3.67158 22.3285 3 21.5 3H17.724C17.0921 1.20736 15.4007 0.00609375 13.5 0H10.5C8.59928 0.00609375 6.90789 1.20736 6.27602 3H2.5C1.67158 3 1 3.67158 1 4.5C1 5.32842 1.67158 6 2.5 6H3.00002V18.5C3.00002 21.5376 5.46245 24 8.5 24H15.5C18.5376 24 21 21.5376 21 18.5V6H21.5C22.3285 6 23 5.32842 23 4.5ZM18 18.5C18 19.8807 16.8807 21 15.5 21H8.5C7.1193 21 6.00002 19.8807 6.00002 18.5V6H18V18.5Z" fill="currentColor"></path>
                      </svg>
                      <div>{deletingSubmissions ? 'Deleting...' : `Delete${someSubsSelected ? ` (${selectedSubIds.size})` : ''}`}</div>
                    </a>
                    <a href="#" className="bulkaction-button w-inline-block" onClick={(e) => { e.preventDefault(); handleExportCsv() }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="actionicon">
                        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                      <div>Export CSV</div>
                    </a>
                  </div>
                </div>
              </div>
              <div className="tablerow-right">
                <div className="formblock w-form">
                  <div style={{ fontSize: 13, color: '#888' }}>{submissionsTotal} submissions</div>
                </div>
              </div>
            </div>

            {/* Table body */}
            <div className="tablewrapper">
              <div className="tablerows">
                {submissionsLoading && submissions.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                    Loading...
                  </div>
                ) : submissions.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                    No form submissions yet. Submissions will appear here when visitors submit this form.
                  </div>
                ) : submissions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className={`tablerow${selectedSub?.id === sub.id ? ' selectedrow' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedSub(sub)}
                  >
                    <div className="tablerow-left">
                      <div className="tableblock">
                        <div
                          className="checkboxwrapper"
                          onClick={(e) => { e.stopPropagation(); toggleSelectOneSub(sub.id) }}
                        >
                          <div className={`checkboxelement${selectedSubIds.has(sub.id) ? ' checked' : ''}`}></div>
                        </div>
                        <div>
                          <div className="alignrow aligncenter">
                            <div className="tablename">{getRowName(sub)}</div>
                            {sub.webhook_status !== null && sub.webhook_status !== undefined && (() => {
                              const wh = webhookLabel(sub.webhook_status)
                              return wh ? (
                                <div className="statuscircle" style={{ backgroundColor: wh.color }}></div>
                              ) : null
                            })()}
                          </div>
                          <div className="tablesublabel">{formatDate(sub.submitted_at)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="tablerow-right">
                      <div className="tableblock right">
                        <a
                          href="#"
                          className="tablebutton w-inline-block"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedSub(sub) }}
                        >
                          <div>View</div>
                        </a>
                      </div>
                      {selectedSub?.id === sub.id && (
                        <div className="selectedcard">
                          <div>Selected</div>
                          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="buttonicons">
                            <g>
                              <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                            </g>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {submissionsTotal > submissionsLimit && (
              <div className="paginationrow">
                <div className="alignrow">
                  <a
                    href="#"
                    className="paginationlink w-inline-block"
                    onClick={(e) => { e.preventDefault(); if (submissionsOffset > 0) loadSubmissions(Math.max(0, submissionsOffset - submissionsLimit)) }}
                    style={{ opacity: submissionsOffset > 0 && !submissionsLoading ? 1 : 0.3 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="paginationicons">
                      <g>
                        <path d="M19 12H5M5 12L11 18M5 12L11 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                      </g>
                    </svg>
                  </a>
                  <span style={{ color: '#888', fontSize: 13 }}>
                    {submissionsOffset + 1}–{Math.min(submissionsOffset + submissionsLimit, submissionsTotal)} of {submissionsTotal}
                  </span>
                  <a
                    href="#"
                    className="paginationlink w-inline-block"
                    onClick={(e) => { e.preventDefault(); if (submissionsOffset + submissionsLimit < submissionsTotal) loadSubmissions(submissionsOffset + submissionsLimit) }}
                    style={{ opacity: submissionsOffset + submissionsLimit < submissionsTotal && !submissionsLoading ? 1 : 0.3 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="paginationicons">
                      <g>
                        <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                      </g>
                    </svg>
                  </a>
                </div>
              </div>
            )}
          </div>
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
                      <div className="uploadlabel">Up to 20MB</div>
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

  // ===== Submissions Detail Panel (right side, contextside) =====
  const submissionsPanel = (
    <>
      {!selectedSub ? (
        <div className="emptystatecontent">
          <div className="emptystate-card">
            <img src="/images/golfcartsolo.webp" loading="lazy" alt="" className="emptystate-image" />
            <div className="emptystate-content">
              <div>
                <div className="emptystate-heading">Select a submission to view more details</div>
                <img src="/images/arrow-turn-down-left.svg" loading="lazy" alt="" className="leftarrow" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="activecontent">
          <div className="contentblock">
            {/* Header */}
            <div className="drawercontent-block _5">
              <h2 className="sidedrawer-heading">{selectedSub.form_name}</h2>
              <div className="pagesubheading"><span className="dim">Submitted</span> {formatDateTime(selectedSub.submitted_at)}</div>
            </div>

            {/* Submitted By (logged-in user) */}
            {(() => {
              const by = getSubmittedBy(selectedSub.data || {})
              if (!by) return null
              return (
                <div className="drawercontent-block">
                  <div className="labelrow">
                    <div className="labeltext">Submitted By</div>
                    <div className="labeldivider"></div>
                  </div>
                  {by.name && (
                    <div className="drawercontent-blocl">
                      <div className="labeltext dim">Name</div>
                      <div className="sidedrawer-content">{by.name}</div>
                    </div>
                  )}
                  {by.email && (
                    <div className="drawercontent-blocl">
                      <div className="labeltext dim">Email</div>
                      <div className="sidedrawer-content">{by.email}</div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Form Data */}
            <div className="drawercontent-block">
              <div className="labelrow">
                <div className="labeltext">Form Data</div>
                <div className="labeldivider"></div>
              </div>
              {getVisibleFields(selectedSub.data || {}).length === 0 ? (
                <div className="drawercontent-blocl">
                  <div className="labeltext dim">No fields submitted</div>
                </div>
              ) : getVisibleFields(selectedSub.data || {}).map(([key, value]) => (
                <div key={key} className="drawercontent-blocl">
                  <div className="labeltext dim">{key}</div>
                  <div className="sidedrawer-content" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {value || <span style={{ color: '#ccc' }}>—</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Files */}
            {Object.keys(selectedSub.file_urls || {}).length > 0 && (
              <div className="drawercontent-block">
                <div className="labelrow">
                  <div className="labeltext">Files</div>
                  <div className="labeldivider"></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(selectedSub.file_urls).map(([label, url]) => {
                    const fileName = selectedSub.data?.[label] || label
                    return (
                      <a
                        key={label}
                        href={url as string}
                        download={fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="stylefield-block"
                        style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', justifyContent: 'flex-start', transition: 'border-color 0.2s' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#000' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="uploadedicon" style={{ flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                          <path d="M8 12.5L11 15.5L16 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                        <div className="uploadedcontent">
                          <div className="uploadtitle" style={{ fontSize: '14px' }}>{label}</div>
                          <div className="uploadsubtitle">{fileName}</div>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Webhook */}
            {selectedSub.webhook_url && (
              <div className="drawercontent-block">
                <div className="labelrow">
                  <div className="labeltext">Webhook</div>
                  <div className="labeldivider"></div>
                </div>
                <div className="drawercontent-blocl">
                  <div className="labeltext dim">URL</div>
                  <div className="sidedrawer-content" style={{ wordBreak: 'break-all', fontSize: '12px', opacity: 0.7 }}>
                    {selectedSub.webhook_url}
                  </div>
                </div>
                <div className="drawercontent-blocl">
                  <div className="labeltext dim">Status</div>
                  <div className="sidedrawer-content">
                    {(() => {
                      const wh = webhookLabel(selectedSub.webhook_status)
                      if (!wh) return <span style={{ color: '#ccc' }}>—</span>
                      return (
                        <span style={{ color: wh.color, fontWeight: 600 }}>{wh.text}</span>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Delete button */}
          <div className="stickysave-row">
            <div className="alignrow aligncenter _15">
              <a
                href="#"
                className="buttonblock delete w-inline-block"
                onClick={(e) => { e.preventDefault(); handleDeleteSingleSub(selectedSub.id) }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="actionicon">
                  <path d="M14.5 18C15.3284 18 16 17.3284 16 16.5V10.5C16 9.67158 15.3284 9 14.5 9C13.6716 9 13 9.67158 13 10.5V16.5C13 17.3284 13.6716 18 14.5 18Z" fill="currentColor"></path>
                  <path d="M9.5 18C10.3284 18 11 17.3284 11 16.5V10.5C11 9.67158 10.3284 9 9.5 9C8.67158 9 8 9.67158 8 10.5V16.5C8 17.3284 8.67158 18 9.5 18Z" fill="currentColor"></path>
                  <path d="M23 4.5C23 3.67158 22.3285 3 21.5 3H17.724C17.0921 1.20736 15.4007 0.00609375 13.5 0H10.5C8.59928 0.00609375 6.90789 1.20736 6.27602 3H2.5C1.67158 3 1 3.67158 1 4.5C1 5.32842 1.67158 6 2.5 6H3.00002V18.5C3.00002 21.5376 5.46245 24 8.5 24H15.5C18.5376 24 21 21.5376 21 18.5V6H21.5C22.3285 6 23 5.32842 23 4.5ZM18 18.5C18 19.8807 16.8807 21 15.5 21H8.5C7.1193 21 6.00002 19.8807 6.00002 18.5V6H18V18.5Z" fill="currentColor"></path>
                </svg>
                <div>Delete</div>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return { editorSections, preview, hasChanges, handleSave, formView, setFormView, loadSubmissions, submissions, submissionsTotal, submissionsPanel }
}
