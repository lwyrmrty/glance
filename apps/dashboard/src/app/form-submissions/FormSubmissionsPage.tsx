'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'

interface FormSubmissionsPageProps {
  workspaceName?: string
  workspaceId?: string
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
}

interface FormSubmission {
  id: string
  workspace_id: string
  widget_id: string
  form_name: string
  data: Record<string, string>
  file_urls: Record<string, string>
  webhook_url: string | null
  webhook_status: number | null
  submitted_at: string
}

export function FormSubmissionsPage({ workspaceName, workspaceId, glances }: FormSubmissionsPageProps) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<FormSubmission | null>(null)
  const pageSize = 15

  const fetchSubmissions = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const offset = (currentPage - 1) * pageSize
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        limit: pageSize.toString(),
        offset: offset.toString(),
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/forms/submissions?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setSubmissions(data.submissions)
        setTotal(data.total)
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, currentPage, search])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} submission(s)? This cannot be undone.`)) return
    try {
      const res = await fetch('/api/forms/submissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        setSelected(null)
        fetchSubmissions()
      }
    } catch (err) {
      console.error('Failed to delete submissions:', err)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' \u2022 ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  /** Primary display name for a table row: user name + email, or fallback to form tab + "Anonymous User". */
  const getRowName = (sub: FormSubmission): React.ReactNode => {
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

  /** Pull a short summary line from the submission data (first non-internal value). */
  const getSummary = (sub: FormSubmission): string => {
    const entries = Object.entries(sub.data || {}).filter(([k]) => !k.startsWith('_'))
    if (entries.length === 0) return ''
    // Return first non-empty value, truncated
    for (const [, v] of entries) {
      if (v && v.trim()) {
        return v.length > 60 ? v.slice(0, 57) + '...' : v
      }
    }
    return ''
  }

  /** Get visible data fields (exclude internal _ prefixed keys). */
  const getVisibleFields = (data: Record<string, string>): [string, string][] =>
    Object.entries(data || {}).filter(([k]) => !k.startsWith('_'))

  /** Extract logged-in user info from internal fields. */
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

  const prefix = workspaceId ? `/w/${workspaceId}` : ''

  return (
    <div className="pagewrapper">
      <div className="pagecontent">
        <Sidebar workspaceName={workspaceName} workspaceId={workspaceId} glances={glances} />
        <div className="mainwrapper">
          <div className="maincontent flex">
            <div className="textside">
              <div className="innerhero">
                <div className="herorow">
                  <div className="pageicon-block large">
                    <img src="/images/playerslite.svg" loading="lazy" alt="" className="heroicon" />
                  </div>
                  <div className="alignrow alignbottom">
                    <h1 className="pageheading">User Data</h1>
                  </div>
                </div>
                <div className="pagesubheading">Manage user accounts and submissions across your widgets.</div>
                <div className="inner-hero-nav">
                  <a href={`${prefix}/accounts`} className="innerhero-nav-link w-inline-block">
                    <div>Accounts</div>
                  </a>
                  <a href={`${prefix}/form-submissions`} className="innerhero-nav-link active w-inline-block">
                    <div>Form Submissions</div>
                  </a>
                  <a href={`${prefix}/account-creation`} className="innerhero-nav-link w-inline-block">
                    <div>Account Creation</div>
                  </a>
                </div>
              </div>

              <div className="contentblock">
                <div>
                  {/* Table header */}
                  <div className="tablerow header">
                    <div className="tablerow-left">
                      <div className="tableblock">
                        <div className="checkboxwrapper">
                          <div className="checkboxelement"></div>
                        </div>
                        <div className="bulkactions-row">
                          <a
                            href="#"
                            className="bulkaction-button delete w-inline-block"
                            onClick={(e) => { e.preventDefault(); handleDelete() }}
                            style={{ opacity: selectedIds.size > 0 ? 1 : 0.4, pointerEvents: selectedIds.size > 0 ? 'auto' : 'none' }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="actionicon">
                              <path d="M14.5 18C15.3284 18 16 17.3284 16 16.5V10.5C16 9.67158 15.3284 9 14.5 9C13.6716 9 13 9.67158 13 10.5V16.5C13 17.3284 13.6716 18 14.5 18Z" fill="currentColor"></path>
                              <path d="M9.5 18C10.3284 18 11 17.3284 11 16.5V10.5C11 9.67158 10.3284 9 9.5 9C8.67158 9 8 9.67158 8 10.5V16.5C8 17.3284 8.67158 18 9.5 18Z" fill="currentColor"></path>
                              <path d="M23 4.5C23 3.67158 22.3285 3 21.5 3H17.724C17.0921 1.20736 15.4007 0.00609375 13.5 0H10.5C8.59928 0.00609375 6.90789 1.20736 6.27602 3H2.5C1.67158 3 1 3.67158 1 4.5C1 5.32842 1.67158 6 2.5 6H3.00002V18.5C3.00002 21.5376 5.46245 24 8.5 24H15.5C18.5376 24 21 21.5376 21 18.5V6H21.5C22.3285 6 23 5.32842 23 4.5ZM18 18.5C18 19.8807 16.8807 21 15.5 21H8.5C7.1193 21 6.00002 19.8807 6.00002 18.5V6H18V18.5Z" fill="currentColor"></path>
                            </svg>
                            <div>Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</div>
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="tablerow-right">
                      <div className="formblock w-form">
                        <form onSubmit={(e) => { e.preventDefault(); setCurrentPage(1); fetchSubmissions() }}>
                          <input
                            className="formfields tablesearch w-input"
                            maxLength={256}
                            placeholder="Search..."
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); fetchSubmissions() } }}
                          />
                        </form>
                      </div>
                    </div>
                  </div>

                  {/* Table body */}
                  <div className="tablewrapper">
                    <div className="tablerows">
                      {loading && submissions.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                          Loading...
                        </div>
                      ) : submissions.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                          {search ? 'No submissions match your search.' : 'No form submissions yet. Submissions will appear here when visitors submit forms on your widgets.'}
                        </div>
                      ) : submissions.map((sub) => (
                        <div
                          key={sub.id}
                          className={`tablerow${selected?.id === sub.id ? ' selectedrow' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelected(sub)}
                        >
                          <div className="tablerow-left">
                            <div className="tableblock">
                              <div
                                className="checkboxwrapper"
                                onClick={(e) => { e.stopPropagation(); toggleSelect(sub.id) }}
                              >
                                <div className={`checkboxelement${selectedIds.has(sub.id) ? ' checked' : ''}`}></div>
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
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelected(sub) }}
                              >
                                <div>View</div>
                              </a>
                            </div>
                            {selected?.id === sub.id && (
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
                  <div className="paginationrow">
                    <div className="alignrow">
                      <a
                        href="#"
                        className="paginationlink w-inline-block"
                        onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1) }}
                        style={{ opacity: currentPage > 1 ? 1 : 0.3 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="paginationicons">
                          <g>
                            <path d="M19 12H5M5 12L11 18M5 12L11 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                          </g>
                        </svg>
                      </a>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
                        <a
                          key={page}
                          href="#"
                          className={`paginationlink w-inline-block${page === currentPage ? ' active' : ''}`}
                          onClick={(e) => { e.preventDefault(); setCurrentPage(page) }}
                        >
                          <div>{page}</div>
                        </a>
                      ))}
                      <a
                        href="#"
                        className="paginationlink w-inline-block"
                        onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1) }}
                        style={{ opacity: currentPage < totalPages ? 1 : 0.3 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="paginationicons">
                          <g>
                            <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                          </g>
                        </svg>
                      </a>
                    </div>
                    <div className="labeltext large">{total.toLocaleString()} <span className="dim">submissions</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side — Detail panel */}
            <div className="contextside">
              {!selected ? (
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
                      <h2 className="sidedrawer-heading">{selected.form_name}</h2>
                      <div className="pagesubheading"><span className="dim">Submitted</span> {formatDateTime(selected.submitted_at)}</div>
                    </div>

                    {/* Submitted By (logged-in user) */}
                    {(() => {
                      const by = getSubmittedBy(selected.data)
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
                      {getVisibleFields(selected.data).length === 0 ? (
                        <div className="drawercontent-blocl">
                          <div className="labeltext dim">No fields submitted</div>
                        </div>
                      ) : getVisibleFields(selected.data).map(([key, value]) => (
                        <div key={key} className="drawercontent-blocl">
                          <div className="labeltext dim">{key}</div>
                          <div className="sidedrawer-content" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {value || <span style={{ color: '#ccc' }}>—</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Files */}
                    {Object.keys(selected.file_urls || {}).length > 0 && (
                      <div className="drawercontent-block">
                        <div className="labelrow">
                          <div className="labeltext">Files</div>
                          <div className="labeldivider"></div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {Object.entries(selected.file_urls).map(([label, url]) => {
                            const fileName = selected.data[label] || label
                            return (
                              <a
                                key={label}
                                href={url}
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
                    {selected.webhook_url && (
                      <div className="drawercontent-block">
                        <div className="labelrow">
                          <div className="labeltext">Webhook</div>
                          <div className="labeldivider"></div>
                        </div>
                        <div className="drawercontent-blocl">
                          <div className="labeltext dim">URL</div>
                          <div className="sidedrawer-content" style={{ wordBreak: 'break-all', fontSize: '12px', opacity: 0.7 }}>
                            {selected.webhook_url}
                          </div>
                        </div>
                        <div className="drawercontent-blocl">
                          <div className="labeltext dim">Status</div>
                          <div className="sidedrawer-content">
                            {(() => {
                              const wh = webhookLabel(selected.webhook_status)
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
                        onClick={(e) => {
                          e.preventDefault()
                          if (confirm('Delete this submission? This cannot be undone.')) {
                            fetch('/api/forms/submissions', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ids: [selected.id] }),
                            }).then(() => {
                              setSelected(null)
                              fetchSubmissions()
                            })
                          }
                        }}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
