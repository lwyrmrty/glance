'use client'

import { useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import { useToast } from '@/components/Toast'

// Document icon SVG used for markdown/text file sources
function DocIcon({ className }: { className?: string }) {
  return (
    <img src="/images/doc-icon.png" alt="Document" className={className} style={{ objectFit: 'contain' }} />
  )
}

// Globe icon SVG used for URL-type sources
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <clipPath>
          <rect width="24" height="24" fill="currentColor"></rect>
        </clipPath>
      </defs>
      <g clipPath="url(#clip0_203_29047)">
        <path d="M12 0C9.62663 0 7.30655 0.703788 5.33316 2.02236C3.35977 3.34094 1.8217 5.21509 0.913451 7.4078C0.00519943 9.60051 -0.232441 12.0133 0.230582 14.3411C0.693605 16.6689 1.83649 18.8071 3.51472 20.4853C5.19295 22.1635 7.33115 23.3064 9.65892 23.7694C11.9867 24.2324 14.3995 23.9948 16.5922 23.0866C18.7849 22.1783 20.6591 20.6402 21.9776 18.6668C23.2962 16.6935 24 14.3734 24 12C23.9966 8.81846 22.7312 5.76821 20.4815 3.51852C18.2318 1.26883 15.1815 0.00344108 12 0V0ZM20.941 11H17.463C17.2362 8.39489 16.4558 5.86823 15.174 3.589C16.7235 4.17499 18.0815 5.17671 19.0989 6.48411C20.1163 7.79151 20.7537 9.35402 20.941 11ZM9.68501 14H14.315C13.9213 16.0948 13.1359 18.0964 12 19.9C10.864 18.0965 10.0786 16.0948 9.68501 14ZM9.55301 11C9.83307 8.54378 10.67 6.18386 12 4.1C13.3302 6.18379 14.1671 8.54374 14.447 11H9.55301ZM8.82601 3.589C7.54417 5.86823 6.76377 8.39489 6.53701 11H3.05901C3.24635 9.35402 3.88372 7.79151 4.9011 6.48411C5.91847 5.17671 7.2765 4.17499 8.82601 3.589ZM3.23201 14H6.64101C6.97749 16.2511 7.7177 18.423 8.82601 20.411C7.43814 19.885 6.20149 19.0248 5.22569 17.9064C4.24989 16.7881 3.56509 15.4463 3.23201 14ZM15.174 20.411C16.2828 18.4231 17.023 16.2512 17.359 14H20.768C20.4349 15.4463 19.7501 16.7881 18.7743 17.9064C17.7985 19.0248 16.5619 19.885 15.174 20.411Z" fill="currentColor"></path>
      </g>
    </svg>
  )
}

// Right panel view state
type PanelView = 'empty' | 'edit' | 'create' | 'create-form'

// DB source shape
interface KnowledgeSourceRecord {
  id: string
  account_id: string
  name: string
  type: string
  config: Record<string, unknown>
  content: string | null
  sync_status: string
  last_synced_at: string | null
  chunk_count: number
  created_at: string
  updated_at: string
}

// Icon map for source types
const sourceTypeIcons: Record<string, string> = {
  google_doc: '/images/google-docs.png',
  google_sheet: '/images/google-sheets.png',
  airtable_base: '/images/airtable.png',
  airtable_table: '/images/airtable.png',
  markdown: '/images/doc-icon.png',
  website: 'globe',
  url: 'globe',
  text: 'globe',
}


interface KnowledgePageProps {
  initialSources?: KnowledgeSourceRecord[]
}

export function KnowledgePage({ initialSources = [] }: KnowledgePageProps) {
  const { showToast } = useToast()
  const [panelView, setPanelView] = useState<PanelView>('empty')
  const [sources, setSources] = useState<KnowledgeSourceRecord[]>(initialSources)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [selectedCreateType, setSelectedCreateType] = useState<string | null>(null)
  const [shareLink, setShareLink] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [editName, setEditName] = useState('')

  // Markdown file upload state
  const [mdFileName, setMdFileName] = useState('')
  const [mdFileContent, setMdFileContent] = useState('')
  const mdFileInputRef = useRef<HTMLInputElement>(null)

  // Airtable create flow state
  const [airtableBases, setAirtableBases] = useState<{ id: string; name: string }[]>([])
  const [airtableTables, setAirtableTables] = useState<{ id: string; name: string }[]>([])
  const [selectedBaseId, setSelectedBaseId] = useState('')
  const [selectedBaseName, setSelectedBaseName] = useState('')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [selectedTableName, setSelectedTableName] = useState('')
  const [loadingBases, setLoadingBases] = useState(false)
  const [loadingTables, setLoadingTables] = useState(false)


  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const selectedSource = sources.find(s => s.id === selectedSourceId)
  const hasSources = sources.length > 0
  const allSelected = hasSources && selectedIds.size === sources.length
  const someSelected = selectedIds.size > 0

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sources.map(s => s.id)))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    if (!confirm(`Delete ${count} knowledge source${count > 1 ? 's' : ''}? This cannot be undone.`)) return

    try {
      const idsToDelete = Array.from(selectedIds)
      await Promise.all(
        idsToDelete.map(id =>
          fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' })
        )
      )
      setSources(prev => prev.filter(s => !selectedIds.has(s.id)))
      // If the currently viewed source was deleted, close the panel
      if (selectedSourceId && selectedIds.has(selectedSourceId)) {
        setSelectedSourceId(null)
        setPanelView('empty')
      }
      setSelectedIds(new Set())
      showToast(`Deleted ${count} source${count > 1 ? 's' : ''}`, 'success')
    } catch (err) {
      console.error('Bulk delete error:', err)
      showToast('Failed to delete some sources', 'error')
    }
  }

  const handleViewEdit = (e: React.MouseEvent, sourceId: string) => {
    e.preventDefault()
    const source = sources.find(s => s.id === sourceId)
    setSelectedSourceId(sourceId)
    setEditName(source?.name || '')
    setPanelView('edit')
  }

  const handleNewResource = (e: React.MouseEvent) => {
    e.preventDefault()
    setSelectedSourceId(null)
    setSelectedCreateType(null)
    setShareLink('')
    setMdFileName('')
    setMdFileContent('')
    setPanelView('create')
  }

  const handleSelectCreateType = (e: React.MouseEvent, type: string) => {
    e.preventDefault()
    setSelectedCreateType(selectedCreateType === type ? null : type)
  }

  const handleCreateResource = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selectedCreateType) return

    setShareLink('')
    setMdFileName('')
    setMdFileContent('')

    if (selectedCreateType === 'airtable') {
      // Fetch bases from Airtable before showing the form
      setLoadingBases(true)
      setAirtableBases([])
      setAirtableTables([])
      setSelectedBaseId('')
      setSelectedBaseName('')
      setSelectedTableId('')
      setSelectedTableName('')
      setPanelView('create-form')

      try {
        const response = await fetch('/api/airtable?action=bases')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch bases')
        }

        setAirtableBases(data.bases || [])
      } catch (error) {
        console.error('Fetch bases error:', error)
        showToast(error instanceof Error ? error.message : 'Failed to load Airtable bases.', 'error')
      } finally {
        setLoadingBases(false)
      }
    } else {
      setPanelView('create-form')
    }
  }

  const handleSelectBase = async (baseId: string, baseName: string) => {
    setSelectedBaseId(baseId)
    setSelectedBaseName(baseName)
    setSelectedTableId('')
    setSelectedTableName('')
    setAirtableTables([])
    setLoadingTables(true)

    try {
      const response = await fetch(`/api/airtable?action=tables&baseId=${baseId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tables')
      }

      setAirtableTables(data.tables || [])
    } catch (error) {
      console.error('Fetch tables error:', error)
      showToast(error instanceof Error ? error.message : 'Failed to load tables.', 'error')
    } finally {
      setLoadingTables(false)
    }
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selectedSourceId) return

    try {
      const response = await fetch('/api/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedSourceId, name: editName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      setSources(prev => prev.map(s => s.id === selectedSourceId ? data.source : s))
      showToast('Saved.')
    } catch (error) {
      console.error('Save error:', error)
      showToast(error instanceof Error ? error.message : 'Save failed.', 'error')
    }
  }

  const handleResync = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selectedSourceId || syncing) return

    setSyncing(true)
    try {
      const response = await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedSourceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Re-sync failed')
      }

      // Update the source in the list
      setSources(prev => prev.map(s => s.id === selectedSourceId ? data.source : s))
      showToast(`Re-synced successfully! ${data.chunkCount} chunks created.`)
    } catch (error) {
      console.error('Re-sync error:', error)
      showToast(error instanceof Error ? error.message : 'Re-sync failed.', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selectedSourceId) return
    if (!confirm('Are you sure you want to delete this resource? This will also remove all associated chunks and embeddings.')) return

    try {
      const response = await fetch(`/api/knowledge?id=${selectedSourceId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete')
      }

      setSources(prev => prev.filter(s => s.id !== selectedSourceId))
      setSelectedSourceId(null)
      setPanelView('empty')
      showToast('Resource deleted.')
    } catch (error) {
      console.error('Delete error:', error)
      showToast(error instanceof Error ? error.message : 'Delete failed.', 'error')
    }
  }

  const handleCreateAndSync = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selectedCreateType) return

    // Validate based on type
    if ((selectedCreateType === 'google_doc' || selectedCreateType === 'google_sheet') && !shareLink.trim()) return
    if (selectedCreateType === 'airtable' && (!selectedBaseId || !selectedTableId)) return
    if (selectedCreateType === 'markdown' && !mdFileContent.trim()) return
    if (selectedCreateType === 'website' && !shareLink.trim()) return

    setSyncing(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bodyPayload: Record<string, any> = { type: selectedCreateType === 'airtable' ? 'airtable_table' : selectedCreateType }

      if (selectedCreateType === 'google_doc' || selectedCreateType === 'google_sheet') {
        bodyPayload.shareLink = shareLink.trim()
      } else if (selectedCreateType === 'airtable') {
        bodyPayload.baseId = selectedBaseId
        bodyPayload.baseName = selectedBaseName
        bodyPayload.tableId = selectedTableId
        bodyPayload.tableName = selectedTableName
      } else if (selectedCreateType === 'markdown') {
        bodyPayload.content = mdFileContent
        bodyPayload.fileName = mdFileName
      } else if (selectedCreateType === 'website') {
        bodyPayload.url = shareLink.trim()
      }

      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create knowledge source')
      }

      setSources(prev => [data.source, ...prev])
      setSelectedSourceId(data.source.id)
      setEditName(data.source.name || '')
        setPanelView('edit')
        setShareLink('')
        setMdFileName('')
        setMdFileContent('')
        showToast(`Synced successfully! ${data.chunkCount} chunks created.`)
    } catch (error) {
      console.error('Create & Sync error:', error)
      showToast(error instanceof Error ? error.message : 'Sync failed. Please try again.', 'error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="pagewrapper">
      <div className="pagecontent">
        <Sidebar />

        <div className="mainwrapper padd">
          <div className="maincontent flex">
            {/* Left Panel — Source List */}
            <div className="textside">
              <div className="innerhero">
                <div className="herorow">
                  <div className="pageicon-block large">
                    <img loading="lazy" src="/images/brain-circuit.svg" alt="" className="heroicon" />
                  </div>
                  <div className="alignrow alignbottom">
                    <h1 className="pageheading">Knowledge</h1>
                  </div>
                </div>
                <div className="pagesubheading">The content here is used to power your AI chat widget.</div>
              </div>

              <div className="contentblock">
                {/* Non-empty state: table header + rows */}
                {hasSources && (
                  <div className="nonempty">
                    {/* Table Header */}
                    <div className="tablerow header">
                      <div className="tablerow-left">
                        <div className="tableblock">
                          <div className="checkboxwrapper" onClick={toggleSelectAll} style={{ cursor: 'pointer' }}>
                            <div className={`checkboxelement${allSelected ? ' checked' : ''}`}></div>
                          </div>
                          <div className="bulkactions-row">
                            <a href="#" className={`bulkaction-button delete w-inline-block${!someSelected ? ' disabled' : ''}`} onClick={(e) => { e.preventDefault(); handleBulkDelete() }} style={!someSelected ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
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
                      <div className="tablerow-right">
                        <div className="tableblock right nopadding">
                          <a href="#" className="bulkaction-button w-inline-block" onClick={handleNewResource}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="currentColor" className="addicon">
                              <g>
                                <g data-name="plus-square">
                                  <path d="M15 11h-2V9a1 1 0 0 0-2 0v2H9a1 1 0 0 0 0 2h2v2a1 1 0 0 0 2 0v-2h2a1 1 0 0 0 0-2z"></path>
                                  <path d="M18 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3zm1 15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1z"></path>
                                  <rect width="24" height="24" fill="currentColor" opacity="0"></rect>
                                </g>
                              </g>
                            </svg>
                            <div>New Resource</div>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Table Rows */}
                    <div className="tablewrapper">
                      <div className="tablerows">
                        {sources.map((source) => {
                          const icon = sourceTypeIcons[source.type] || 'globe'
                          const isSyncing = source.sync_status === 'syncing' || source.sync_status === 'pending'
                          const contentSize = source.content
                            ? source.content.length >= 1024 * 1024
                              ? `${(source.content.length / (1024 * 1024)).toFixed(1)}MB`
                              : source.content.length >= 1024
                                ? `${Math.round(source.content.length / 1024)}KB`
                                : `${source.content.length}B`
                            : null
                          const sublabel = isSyncing
                            ? 'Syncing...'
                            : source.sync_status === 'error'
                              ? 'Sync failed'
                              : contentSize || source.type.replace('_', ' ')
                          return (
                            <div
                              key={source.id}
                              className={`tablerow${selectedSourceId === source.id && panelView === 'edit' ? ' selectedrow' : ''}`}
                            >
                              <div className="tablerow-left">
                                <div className="tableblock">
                                  <div className="checkboxwrapper" onClick={(e) => { e.stopPropagation(); toggleSelectOne(source.id) }} style={{ cursor: 'pointer' }}>
                                    <div className={`checkboxelement${selectedIds.has(source.id) ? ' checked' : ''}`}></div>
                                  </div>
                                  <div className="tableimage">
                                    {icon === 'globe' ? (
                                      <GlobeIcon className="navicon" />
                                    ) : icon === 'doc' ? (
                                      <DocIcon className="navicon" />
                                    ) : (
                                      <img src={icon} loading="lazy" alt="" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="alignrow aligncenter">
                                      <div className="tablename">{source.name || 'Untitled'}</div>
                                      <div className={`statuscircle${source.sync_status === 'synced' ? '' : source.sync_status === 'error' ? ' error' : ' pending'}`}></div>
                                    </div>
                                    <div className="tablesublabel">{sublabel}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="tablerow-right">
                                <div className="tableblock right">
                                  <a
                                    href="#"
                                    className="tablebutton w-inline-block"
                                    style={{ opacity: selectedSourceId === source.id && panelView === 'edit' ? 1 : undefined }}
                                    onClick={(e) => handleViewEdit(e, source.id)}
                                  >
                                    <div>View / Edit</div>
                                  </a>
                                </div>
                                {selectedSourceId === source.id && panelView === 'edit' && (
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
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty state (shown when no sources) */}
                {!hasSources && (
                  <div className="emptycard" style={{ display: 'flex' }}>
                    <div className="emptystate-content">
                      <div>
                        <div className="emptystate-heading">No resources yet...</div>
                        <div className="emptystate-subheading">Add knowledge sources to power your AI chat widget with relevant context.</div>
                      </div>
                      <a href="#" className="bulkaction-button callout w-inline-block" onClick={handleNewResource}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="currentColor" className="addicon">
                          <g>
                            <g data-name="plus-square">
                              <path d="M15 11h-2V9a1 1 0 0 0-2 0v2H9a1 1 0 0 0 0 2h2v2a1 1 0 0 0 2 0v-2h2a1 1 0 0 0 0-2z"></path>
                              <path d="M18 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3zm1 15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1z"></path>
                              <rect width="24" height="24" fill="currentColor" opacity="0"></rect>
                            </g>
                          </g>
                        </svg>
                        <div>New Resource</div>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — Context Side */}
            <div className="contextside wide">
              {/* Empty state (default) */}
              {panelView === 'empty' && (
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 10 }}>
                  <img
                    src="/images/datalayer.png"
                    loading="lazy"
                    alt=""
                    className="fullimage"
                  />
                </div>
              )}

              {/* Active / Edit view */}
              {panelView === 'edit' && selectedSource && (() => {
                const editIcon = sourceTypeIcons[selectedSource.type] || 'globe'
                const lastSynced = selectedSource.last_synced_at
                  ? new Date(selectedSource.last_synced_at).toLocaleDateString()
                  : 'Never'
                return (
                  <div className="activecontent">
                    <div className="contentblock">
                      <div className="drawercontent-block _5">
                        <div className="headeralign">
                          <div className="tableimage">
                            {editIcon === 'globe' ? (
                              <GlobeIcon className="navicon full" />
                            ) : editIcon === 'doc' ? (
                              <DocIcon className="navicon full" />
                            ) : (
                              <img src={editIcon} loading="lazy" alt="" />
                            )}
                          </div>
                          <div>
                            <h2 className="sidedrawer-heading">{selectedSource.name || 'Untitled'}</h2>
                          </div>
                        </div>
                      </div>
                      <div className="drawercontent-block">
                        <div className="formblock w-form">
                          <form>
                            <div className="formcontent">
                              <div className="fieldblocks">
                                <div className="labelrow">
                                  <div className="labeltext">Resource Name</div>
                                  <div className="labeldivider"></div>
                                </div>
                                <input className="formfields textfield w-input" maxLength={256} name="name" placeholder="" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                              </div>

                              {(selectedSource.type === 'google_doc' || selectedSource.type === 'google_sheet') && (
                                <div className="fieldblocks">
                                  <div className="labelrow">
                                    <div className="labeltext">{selectedSource.type === 'google_doc' ? 'Google Doc Share Link' : 'Google Sheet Share Link'}</div>
                                    <div className="labeldivider"></div>
                                  </div>
                                  <a
                                    href={(selectedSource.config as { shareLink?: string })?.shareLink || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="formfields urlfield w-input"
                                    style={{ display: 'block', textDecoration: 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  >
                                    {(selectedSource.config as { shareLink?: string })?.shareLink || ''}
                                  </a>
                                </div>
                              )}

                              {selectedSource.type === 'airtable_table' && (
                                <>
                                  <div className="fieldblocks">
                                    <div className="labelrow">
                                      <div className="labeltext">Airtable Base</div>
                                      <div className="labeldivider"></div>
                                    </div>
                                    <div className="formfields textfield w-input" style={{ cursor: 'default' }}>
                                      {(selectedSource.config as { baseName?: string })?.baseName || (selectedSource.config as { baseId?: string })?.baseId || '—'}
                                    </div>
                                  </div>
                                  <div className="fieldblocks">
                                    <div className="labelrow">
                                      <div className="labeltext">Airtable Table</div>
                                      <div className="labeldivider"></div>
                                    </div>
                                    <div className="formfields textfield w-input" style={{ cursor: 'default' }}>
                                      {(selectedSource.config as { tableName?: string })?.tableName || (selectedSource.config as { tableId?: string })?.tableId || '—'}
                                    </div>
                                  </div>
                                </>
                              )}

                              {selectedSource.type === 'markdown' && (
                                <div className="fieldblocks">
                                  <div className="labelrow">
                                    <div className="labeltext">File</div>
                                    <div className="labeldivider"></div>
                                  </div>
                                  <div className="formfields textfield w-input" style={{ cursor: 'default' }}>
                                    {(selectedSource.config as { fileName?: string })?.fileName || 'Uploaded file'}
                                  </div>
                                </div>
                              )}

                              {selectedSource.type === 'website' && (
                                <div className="fieldblocks">
                                  <div className="labelrow">
                                    <div className="labeltext">Website URL</div>
                                    <div className="labeldivider"></div>
                                  </div>
                                  <a
                                    href={(selectedSource.config as { url?: string })?.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="formfields urlfield w-input"
                                    style={{ display: 'block', textDecoration: 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  >
                                    {(selectedSource.config as { url?: string })?.url || ''}
                                  </a>
                                </div>
                              )}

                              <div className="fieldblocks">
                                <div className="labelrow">
                                  <div className="labeltext">Sync Status</div>
                                  <div className="labeldivider"></div>
                                </div>
                                <div className="rowcard">
                                  <div className="alignrow aligncenter">
                                    <div className={`statuscircle${selectedSource.sync_status === 'synced' ? '' : selectedSource.sync_status === 'error' ? ' error' : ' pending'}`}></div>
                                    <div>{selectedSource.sync_status === 'synced' ? 'Synced' : selectedSource.sync_status === 'error' ? 'Error' : selectedSource.sync_status === 'syncing' ? 'Syncing...' : 'Pending'}</div>
                                  </div>
                                  <div className="alignright">
                                    <div className="smallsubtext">{selectedSource.chunk_count} chunks</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>

                    {/* Sticky save row */}
                    <div className="stickysave-row">
                      <div className="alignrow aligncenter _15">
                        <div style={{ display: 'flex', gap: 5 }}>
                          <a href="#" className="buttonblock callout w-inline-block" onClick={handleSave}>
                            <div>Save</div>
                          </a>
                          <a
                            href="#"
                            className="buttonblock w-inline-block"
                            onClick={handleResync}
                            style={syncing ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
                          >
                            <div>{syncing ? 'Syncing...' : 'Re-sync'}</div>
                          </a>
                        </div>
                        <div>
                          <div className="labeltext dim">Last Synced</div>
                          <div>{lastSynced}</div>
                        </div>
                      </div>
                      <div className="alignrow aligncenter _15">
                        <a href="#" className="buttonblock delete w-inline-block" onClick={handleDelete}>
                          <div>Delete</div>
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Create view — type picker */}
              {panelView === 'create' && (
                <div className="createcontent">
                  <div className="contentblock">
                    <div className="drawercontent-block _5">
                      <div className="headeralign">
                        <div>
                          <h2 className="sidedrawer-heading">Create a Knowledge Resource</h2>
                        </div>
                      </div>
                    </div>
                    <div className="drawercontent-block">
                      <div className="labelrow">
                        <div className="labeltext">Select a Resource Type</div>
                        <div className="labeldivider"></div>
                      </div>

                      <a
                        href="#"
                        className={`selectcard${selectedCreateType === 'google_doc' ? ' selected' : ''} w-inline-block`}
                        onClick={(e) => handleSelectCreateType(e, 'google_doc')}
                      >
                        <div className="alignrow aligncenter">
                          <div className="selectcard-icons">
                            <img src="/images/google-docs.png" loading="lazy" alt="" />
                          </div>
                          <div>
                            <div className="selectcard-heading">Google Doc</div>
                            <div className="selectcard-subheading">Import content from a Google Doc to use as knowledge.</div>
                          </div>
                        </div>
                      </a>

                      <a
                        href="#"
                        className={`selectcard${selectedCreateType === 'google_sheet' ? ' selected' : ''} w-inline-block`}
                        onClick={(e) => handleSelectCreateType(e, 'google_sheet')}
                      >
                        <div className="alignrow aligncenter">
                          <div className="selectcard-icons">
                            <img src="/images/google-sheets.png" loading="lazy" alt="" />
                          </div>
                          <div>
                            <div className="selectcard-heading">Google Sheet</div>
                            <div className="selectcard-subheading">Import rows from a Google Sheet as knowledge.</div>
                          </div>
                        </div>
                      </a>

                      <a
                        href="#"
                        className={`selectcard${selectedCreateType === 'airtable' ? ' selected' : ''} w-inline-block`}
                        onClick={(e) => handleSelectCreateType(e, 'airtable')}
                      >
                        <div className="alignrow aligncenter">
                          <div className="selectcard-icons">
                            <img src="/images/airtable.png" loading="lazy" alt="" />
                          </div>
                          <div>
                            <div className="selectcard-heading">Airtable</div>
                            <div className="selectcard-subheading">Connect an Airtable base or table as a knowledge source.</div>
                          </div>
                        </div>
                      </a>

                      <a
                        href="#"
                        className={`selectcard${selectedCreateType === 'markdown' ? ' selected' : ''} w-inline-block`}
                        onClick={(e) => handleSelectCreateType(e, 'markdown')}
                      >
                        <div className="alignrow aligncenter">
                          <div className="selectcard-icons">
                            <DocIcon className="navicon full" />
                          </div>
                          <div>
                            <div className="selectcard-heading">Markdown File</div>
                            <div className="selectcard-subheading">Upload a .md file to use as a knowledge source.</div>
                          </div>
                        </div>
                      </a>

                      <a
                        href="#"
                        className={`selectcard${selectedCreateType === 'website' ? ' selected' : ''} w-inline-block`}
                        onClick={(e) => handleSelectCreateType(e, 'website')}
                      >
                        <div className="alignrow aligncenter">
                          <div className="selectcard-icons">
                            <GlobeIcon className="navicon full" />
                          </div>
                          <div>
                            <div className="selectcard-heading">Website</div>
                            <div className="selectcard-subheading">Crawl a website and its pages to use as knowledge.</div>
                          </div>
                        </div>
                      </a>

                      <div className="buttonalign">
                        {!selectedCreateType ? (
                          <a href="#" className="buttonblock disabled w-inline-block" onClick={(e) => e.preventDefault()}>
                            <div>Create Resource</div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="buttonicons">
                              <g>
                                <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                              </g>
                            </svg>
                          </a>
                        ) : (
                          <a href="#" className="buttonblock w-inline-block" onClick={handleCreateResource}>
                            <div>Create Resource</div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="buttonicons">
                              <g>
                                <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                              </g>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Create form — type-specific form after picking a type */}
              {panelView === 'create-form' && selectedCreateType === 'google_doc' && (
                <div className="activecontent">
                  <div className="contentblock">
                    <div className="drawercontent-block _5">
                      <div className="headeralign">
                        <div className="tableimage">
                          <img src="/images/google-docs.png" loading="lazy" alt="" />
                        </div>
                        <div>
                          <h2 className="sidedrawer-heading">Google Doc</h2>
                        </div>
                      </div>
                    </div>
                    <div className="drawercontent-block">
                      <div className="formblock w-form">
                        <form onSubmit={(e) => e.preventDefault()}>
                          <div className="formcontent">
                            <div className="fieldblocks">
                              <div className="labelrow">
                                <div className="labeltext">Google Doc Share Link</div>
                                <div className="labeldivider"></div>
                              </div>
                              <input
                                className="formfields urlfield w-input"
                                maxLength={512}
                                name="share-link"
                                placeholder="https://docs.google.com/document/d/..."
                                type="url"
                                value={shareLink}
                                onChange={(e) => setShareLink(e.target.value)}
                                disabled={syncing}
                              />
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>

                  <div className="stickysave-row">
                    <div className="alignrow aligncenter _15">
                      {syncing ? (
                        <a href="#" className="buttonblock callout w-inline-block" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                          <div>Syncing...</div>
                        </a>
                      ) : (
                        <a
                          href="#"
                          className={`buttonblock callout w-inline-block${!shareLink.trim() ? ' disabled' : ''}`}
                          onClick={handleCreateAndSync}
                          style={!shareLink.trim() ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                        >
                          <div>Create &amp; Sync</div>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Create form — Google Sheet */}
              {panelView === 'create-form' && selectedCreateType === 'google_sheet' && (
                <div className="activecontent">
                  <div className="contentblock">
                    <div className="drawercontent-block _5">
                      <div className="headeralign">
                        <div className="tableimage">
                          <img src="/images/google-sheets.png" loading="lazy" alt="" />
                        </div>
                        <div>
                          <h2 className="sidedrawer-heading">Google Sheet</h2>
                        </div>
                      </div>
                    </div>
                    <div className="drawercontent-block">
                      <div className="formblock w-form">
                        <form onSubmit={(e) => e.preventDefault()}>
                          <div className="formcontent">
                            <div className="fieldblocks">
                              <div className="labelrow">
                                <div className="labeltext">Google Sheet Share Link</div>
                                <div className="labeldivider"></div>
                              </div>
                              <input
                                className="formfields urlfield w-input"
                                maxLength={512}
                                name="share-link"
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                type="url"
                                value={shareLink}
                                onChange={(e) => setShareLink(e.target.value)}
                                disabled={syncing}
                              />
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>

                  <div className="stickysave-row">
                    <div className="alignrow aligncenter _15">
                      {syncing ? (
                        <a href="#" className="buttonblock callout w-inline-block" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                          <div>Syncing...</div>
                        </a>
                      ) : (
                        <a
                          href="#"
                          className={`buttonblock callout w-inline-block${!shareLink.trim() ? ' disabled' : ''}`}
                          onClick={handleCreateAndSync}
                          style={!shareLink.trim() ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                        >
                          <div>Create &amp; Sync</div>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Create form — Airtable */}
              {panelView === 'create-form' && selectedCreateType === 'airtable' && (
                <div className="activecontent">
                  <div className="contentblock">
                    <div className="drawercontent-block _5">
                      <div className="headeralign">
                        <div className="tableimage">
                          <img src="/images/airtable.png" loading="lazy" alt="" />
                        </div>
                        <div>
                          <h2 className="sidedrawer-heading">Airtable</h2>
                        </div>
                      </div>
                    </div>
                    <div className="drawercontent-block">
                      <div className="formblock w-form">
                        <form onSubmit={(e) => e.preventDefault()}>
                          <div className="formcontent">
                            {/* Base picker */}
                            <div className="fieldblocks">
                              <div className="labelrow">
                                <div className="labeltext">Select a Base</div>
                                <div className="labeldivider"></div>
                              </div>
                              {loadingBases ? (
                                <div className="fieldexplainer">Loading bases...</div>
                              ) : airtableBases.length === 0 ? (
                                <div className="fieldexplainer">
                                  No bases found. Make sure your Airtable API key has access to at least one base.{' '}
                                  <a href="/integrations" style={{ textDecoration: 'underline' }}>Check Integrations</a>
                                </div>
                              ) : (
                                <select
                                  className="formfields w-input"
                                  value={selectedBaseId}
                                  onChange={(e) => {
                                    const base = airtableBases.find(b => b.id === e.target.value)
                                    if (base) handleSelectBase(base.id, base.name)
                                  }}
                                  disabled={syncing}
                                >
                                  <option value="">Choose a base...</option>
                                  {airtableBases.map(base => (
                                    <option key={base.id} value={base.id}>{base.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>

                            {/* Table picker (shown after base is selected) */}
                            {selectedBaseId && (
                              <div className="fieldblocks">
                                <div className="labelrow">
                                  <div className="labeltext">Select a Table</div>
                                  <div className="labeldivider"></div>
                                </div>
                                {loadingTables ? (
                                  <div className="fieldexplainer">Loading tables...</div>
                                ) : airtableTables.length === 0 ? (
                                  <div className="fieldexplainer">No tables found in this base.</div>
                                ) : (
                                  <select
                                    className="formfields w-input"
                                    value={selectedTableId}
                                    onChange={(e) => {
                                      const table = airtableTables.find(t => t.id === e.target.value)
                                      if (table) {
                                        setSelectedTableId(table.id)
                                        setSelectedTableName(table.name)
                                      }
                                    }}
                                    disabled={syncing}
                                  >
                                    <option value="">Choose a table...</option>
                                    {airtableTables.map(table => (
                                      <option key={table.id} value={table.id}>{table.name}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )}
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>

                  <div className="stickysave-row">
                    <div className="alignrow aligncenter _15">
                      {syncing ? (
                        <a href="#" className="buttonblock callout w-inline-block" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                          <div>Syncing...</div>
                        </a>
                      ) : (
                        <a
                          href="#"
                          className={`buttonblock callout w-inline-block${!selectedBaseId || !selectedTableId ? ' disabled' : ''}`}
                          onClick={handleCreateAndSync}
                          style={!selectedBaseId || !selectedTableId ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                        >
                          <div>Create &amp; Sync</div>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Create form — Markdown */}
              {panelView === 'create-form' && selectedCreateType === 'markdown' && (
                <div className="activecontent">
                  <div className="contentblock">
                    <div className="drawercontent-block _5">
                      <div className="headeralign">
                        <div className="tableimage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <DocIcon className="navicon full" />
                        </div>
                        <div>
                          <h2 className="sidedrawer-heading">Markdown File</h2>
                        </div>
                      </div>
                    </div>
                    <div className="drawercontent-block">
                      <div className="formblock w-form">
                        <form onSubmit={(e) => e.preventDefault()}>
                          <div className="formcontent">
                            <div className="fieldblocks">
                              <div className="labelrow">
                                <div className="labeltext">Upload .md File</div>
                                <div className="labeldivider"></div>
                              </div>
                              <input
                                ref={mdFileInputRef}
                                type="file"
                                accept=".md,.markdown,.txt"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  setMdFileName(file.name)
                                  const reader = new FileReader()
                                  reader.onload = (ev) => {
                                    const text = ev.target?.result
                                    if (typeof text === 'string') {
                                      setMdFileContent(text)
                                    }
                                  }
                                  reader.readAsText(file)
                                }}
                              />
                              {mdFileName ? (
                                <div className="stylefield-block" style={{ justifyContent: 'flex-start' }}>
                                  <div className="tableimage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <DocIcon className="navicon" />
                                  </div>
                                  <div>
                                    <div className="uploadtitle">{mdFileName}</div>
                                    <div className="uploadsubtitle">
                                      {mdFileContent.length >= 1024 * 1024
                                        ? `${(mdFileContent.length / (1024 * 1024)).toFixed(1)}mb`
                                        : mdFileContent.length >= 1024
                                          ? `${Math.round(mdFileContent.length / 1024)}kb`
                                          : `${mdFileContent.length}b`
                                      }
                                    </div>
                                    <div className="uploadactions">
                                      <a
                                        href="#"
                                        className="deletelink"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          setMdFileName('')
                                          setMdFileContent('')
                                          if (mdFileInputRef.current) mdFileInputRef.current.value = ''
                                        }}
                                      >
                                        Delete
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="uploadcard"
                                  onClick={() => mdFileInputRef.current?.click()}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="uploadicons">
                                    <path d="M8 16L12 12M12 12L16 16M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                    <path d="M6.3414 6.15897C7.16507 3.73597 9.38755 2 12 2C15.3137 2 18 4.79305 18 8.23846C20.2091 8.23846 22 10.1005 22 12.3974C22 13.9368 21.1956 15.2809 20 16M6.32069 6.20644C3.8806 6.55106 2 8.72597 2 11.3576C2 13.0582 2.7854 14.5682 3.99965 15.5167" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                  </svg>
                                  <div>Upload File</div>
                                </div>
                              )}
                              <div className="fieldexplainer" style={{ marginTop: '6px' }}>
                                Markdown (.md) and plain text (.txt) files are supported.
                              </div>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>

                  <div className="stickysave-row">
                    <div className="alignrow aligncenter _15">
                      {syncing ? (
                        <a href="#" className="buttonblock callout w-inline-block" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                          <div>Syncing...</div>
                        </a>
                      ) : (
                        <a
                          href="#"
                          className={`buttonblock callout w-inline-block${!mdFileContent.trim() ? ' disabled' : ''}`}
                          onClick={handleCreateAndSync}
                          style={!mdFileContent.trim() ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                        >
                          <div>Create &amp; Sync</div>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Create form — Website */}
              {panelView === 'create-form' && selectedCreateType === 'website' && (
                <div className="activecontent">
                  <div className="contentblock">
                    <div className="drawercontent-block _5">
                      <div className="headeralign">
                        <div className="tableimage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <GlobeIcon className="navicon full" />
                        </div>
                        <div>
                          <h2 className="sidedrawer-heading">Website</h2>
                        </div>
                      </div>
                    </div>
                    <div className="drawercontent-block">
                      <div className="formblock w-form">
                        <form onSubmit={(e) => e.preventDefault()}>
                          <div className="formcontent">
                            <div className="fieldblocks">
                              <div className="labelrow">
                                <div className="labeltext">Website URL</div>
                                <div className="labeldivider"></div>
                              </div>
                              <input
                                className="formfields urlfield w-input"
                                maxLength={512}
                                name="website-url"
                                placeholder="https://www.vcsheet.com/sheets"
                                type="url"
                                value={shareLink}
                                onChange={(e) => setShareLink(e.target.value)}
                                disabled={syncing}
                              />
                              <div className="fieldexplainer" style={{ marginTop: '6px' }}>
                                All pages linked from this URL on the same domain will be crawled and indexed.
                              </div>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>

                  <div className="stickysave-row">
                    <div className="alignrow aligncenter _15">
                      {syncing ? (
                        <a href="#" className="buttonblock callout w-inline-block" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                          <div>Crawling...</div>
                        </a>
                      ) : (
                        <a
                          href="#"
                          className={`buttonblock callout w-inline-block${!shareLink.trim() ? ' disabled' : ''}`}
                          onClick={handleCreateAndSync}
                          style={!shareLink.trim() ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                        >
                          <div>Crawl &amp; Sync</div>
                        </a>
                      )}
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

export default KnowledgePage
