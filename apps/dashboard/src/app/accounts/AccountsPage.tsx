'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'

interface AccountsPageProps {
  workspaceName?: string
  workspaceId?: string
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
}

interface WidgetUser {
  id: string
  workspace_id: string
  email: string
  first_name: string | null
  last_name: string | null
  auth_provider: string
  status: string
  last_active_at: string | null
  created_at: string
}

export function AccountsPage({ workspaceName, workspaceId, glances }: AccountsPageProps) {
  const [users, setUsers] = useState<WidgetUser[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedUser, setSelectedUser] = useState<WidgetUser | null>(null)
  const pageSize = 15

  const fetchUsers = useCallback(async () => {
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

      const res = await fetch(`/api/widget-auth/users?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users)
        setTotalUsers(data.total)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, currentPage, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize))

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
    if (!confirm(`Delete ${selectedIds.size} user(s)? This cannot be undone.`)) return
    try {
      const res = await fetch('/api/widget-auth/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        setSelectedUser(null)
        fetchUsers()
      }
    } catch (err) {
      console.error('Failed to delete users:', err)
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
                  <a href={`${prefix}/accounts`} className="innerhero-nav-link active w-inline-block">
                    <div>Accounts</div>
                  </a>
                  <a href={`${prefix}/form-submissions`} className="innerhero-nav-link w-inline-block">
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
                        <form onSubmit={(e) => { e.preventDefault(); setCurrentPage(1); fetchUsers() }}>
                          <input
                            className="formfields tablesearch w-input"
                            maxLength={256}
                            placeholder="Search..."
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); fetchUsers() } }}
                          />
                        </form>
                      </div>
                    </div>
                  </div>

                  {/* Table body */}
                  <div className="tablewrapper">
                    <div className="tablerows">
                      {loading && users.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                          Loading...
                        </div>
                      ) : users.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                          {search ? 'No users match your search.' : 'No user accounts yet. Users will appear here when they sign up via premium content gates on your widgets.'}
                        </div>
                      ) : users.map((user) => (
                        <div
                          key={user.id}
                          className={`tablerow${selectedUser?.id === user.id ? ' selectedrow' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedUser(user)}
                        >
                          <div className="tablerow-left">
                            <div className="tableblock">
                              <div
                                className="checkboxwrapper"
                                onClick={(e) => { e.stopPropagation(); toggleSelect(user.id) }}
                              >
                                <div className={`checkboxelement${selectedIds.has(user.id) ? ' checked' : ''}`}></div>
                              </div>
                              <div>
                                <div className="alignrow aligncenter">
                                  <div className="tablename">{user.first_name} {user.last_name}</div>
                                  <div className={`statuscircle${user.status === 'active' ? '' : ' inactive'}`}></div>
                                </div>
                                <div className="tablesublabel">{user.email}</div>
                              </div>
                            </div>
                          </div>
                          <div className="tablerow-right">
                            <div className="tableblock right">
                              <div>
                                <div className="urltext">{formatDate(user.created_at)}</div>
                              </div>
                            </div>
                            <div className="tableblock right">
                              <a
                                href="#"
                                className="tablebutton w-inline-block"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedUser(user) }}
                              >
                                <div>View</div>
                              </a>
                            </div>
                            {selectedUser?.id === user.id && (
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
                    <div className="labeltext large">{totalUsers.toLocaleString()} <span className="dim">people</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side panel */}
            <div className="contextside">
              {!selectedUser ? (
                <div className="emptystatecontent">
                  <div className="emptystate-card">
                    <img src="/images/golfcartsolo.webp" loading="lazy" alt="" className="emptystate-image" />
                    <div className="emptystate-content">
                      <div>
                        <div className="emptystate-heading">Select a user to view more details</div>
                        <img src="/images/arrow-turn-down-left.svg" loading="lazy" alt="" className="leftarrow" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="activecontent">
                  <div className="contentblock">
                    <div className="pagesubheading status" style={{ textTransform: 'capitalize' }}>{selectedUser.status}</div>
                    <div className="drawercontent-block _5">
                      <h2 className="sidedrawer-heading">{selectedUser.first_name} {selectedUser.last_name}</h2>
                      <div className="pagesubheading"><span className="dim">Created</span> {formatDateTime(selectedUser.created_at)}</div>
                    </div>
                    <div className="drawercontent-block">
                      <div className="labelrow">
                        <div className="labeltext">User Info</div>
                        <div className="labeldivider"></div>
                      </div>
                      <div className="drawercontent-blocl">
                        <div className="labeltext dim">Name</div>
                        <div className="sidedrawer-content">{selectedUser.first_name} {selectedUser.last_name}</div>
                      </div>
                      <div className="drawercontent-blocl">
                        <div className="labeltext dim">Email</div>
                        <div className="sidedrawer-content">{selectedUser.email}</div>
                      </div>
                      <div className="drawercontent-blocl">
                        <div className="labeltext dim">Auth Method</div>
                        <div className="sidedrawer-content" style={{ textTransform: 'capitalize' }}>{selectedUser.auth_provider}</div>
                      </div>
                      {selectedUser.last_active_at && (
                        <div className="drawercontent-blocl">
                          <div className="labeltext dim">Last Active</div>
                          <div className="sidedrawer-content">{formatDateTime(selectedUser.last_active_at)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="stickysave-row">
                    <div className="alignrow aligncenter _15">
                      <a
                        href="#"
                        className="buttonblock delete w-inline-block"
                        onClick={(e) => {
                          e.preventDefault()
                          if (confirm('Delete this user? This cannot be undone.')) {
                            fetch('/api/widget-auth/users', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ids: [selectedUser.id] }),
                            }).then(() => {
                              setSelectedUser(null)
                              fetchUsers()
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
