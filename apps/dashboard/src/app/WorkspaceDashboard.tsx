'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'

interface Glance {
  id: string
  name: string
  logo_url?: string | null
  tab_count: number
}

interface Workspace {
  id: string
  name: string
  logo_url?: string | null
  role: string
  glance_count: number
  glances: Glance[]
}

interface WorkspaceDashboardProps {
  workspaces: Workspace[]
}

export default function WorkspaceDashboard({ workspaces: initialWorkspaces }: WorkspaceDashboardProps) {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleEnterWorkspace = (workspaceId: string) => {
    setLoading(workspaceId)
    // Navigate directly — workspace ID is in the URL
    router.push(`/w/${workspaceId}/glances`)
  }

  const handleStartRename = (ws: Workspace) => {
    setEditingId(ws.id)
    setEditName(ws.name)
  }

  const handleRename = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null)
      return
    }

    const res = await fetch('/api/workspaces', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editName.trim() }),
    })

    if (res.ok) {
      setWorkspaces(prev =>
        prev.map(ws => ws.id === id ? { ...ws, name: editName.trim() } : ws)
      )
    }
    setEditingId(null)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setCreateError('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setCreateError('Logo must be under 5MB')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setCreateError(null)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return

    setCreateError(null)
    setLoading('creating')
    try {
      const formData = new FormData()
      formData.append('name', newName.trim())
      if (logoFile) {
        formData.append('logo', logoFile)
      }

      const res = await fetch('/api/workspaces', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        const workspace = data.workspace ?? data
        setWorkspaces(prev => [...prev, { ...workspace, glances: workspace.glances ?? [] }])
        setNewName('')
        setLogoFile(null)
        if (logoPreview) URL.revokeObjectURL(logoPreview)
        setLogoPreview(null)
        setCreating(false)
      } else {
        setCreateError(data?.error ?? 'Failed to create workspace')
      }
    } catch {
      setCreateError('Failed to create workspace')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="pagewrapper">
      <div className="pagecontent">
        <Sidebar />
        <div className="mainwrapper padd">
          <div className="maincontent flex">
            <div className="textside">
              <div className="innerhero main">
                <div className="herorow">
                  <div className="alignrow alignbottom">
                    <h1 className="pageheading">Workspaces</h1>
                  </div>
                </div>
                <div className="pagesubheading">Create a Glance for your website.</div>
              </div>
              <div className="contentblock">
                {creating ? (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <div className="alignrow" style={{ gap: '12px', marginBottom: '12px', alignItems: 'flex-start' }}>
                        <label
                          className="workspaceicon"
                          style={{ cursor: 'pointer', flexShrink: 0, overflow: 'hidden', borderRadius: '8px' }}
                        >
                          {logoPreview ? (
                            <img src={logoPreview} alt="" className="fullimage" style={{ objectFit: 'cover' }} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minWidth: 64, minHeight: 64, fontSize: '24px', fontWeight: 600, color: '#7C3AED', background: '#f3f0ff' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                          />
                        </label>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => { setNewName(e.target.value); setCreateError(null) }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreate()
                              if (e.key === 'Escape') { setCreating(false); setNewName(''); setLogoFile(null); if (logoPreview) URL.revokeObjectURL(logoPreview); setLogoPreview(null); setCreateError(null) }
                            }}
                            placeholder="Workspace name..."
                            autoFocus
                            disabled={loading === 'creating'}
                            style={{ border: '1px solid #e2e2e2', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}
                          />
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Optional: click the icon to add a logo</div>
                        </div>
                      </div>
                      <div className="alignrow" style={{ gap: '8px' }}>
                        <button className="button lite w-inline-block" onClick={handleCreate} disabled={loading === 'creating'}>
                          <div>{loading === 'creating' ? 'Creating...' : 'Create'}</div>
                        </button>
                        <button
                          className="button outline w-inline-block"
                          onClick={() => { setCreating(false); setNewName(''); setLogoFile(null); if (logoPreview) URL.revokeObjectURL(logoPreview); setLogoPreview(null); setCreateError(null) }}
                          disabled={loading === 'creating'}
                          style={{ opacity: 0.6 }}
                        >
                          <div>Cancel</div>
                        </button>
                      </div>
                    </div>
                    {createError && (
                      <div style={{ color: '#b91c1c', fontSize: '14px', marginBottom: '16px' }}>{createError}</div>
                    )}
                  </>
                ) : (
                  <a href="#" className="button lite w-inline-block" onClick={(e) => { e.preventDefault(); setCreating(true) }} style={{ marginBottom: '20px', textDecoration: 'none' }}>
                    <div>Create a Workspace</div>
                  </a>
                )}
                <div className="workspacerow">
                  {workspaces.map((ws, index) => {
                    // If there's exactly one Glance, navigate directly to it
                    const glances = ws.glances ?? []
                    const workspaceHref = ws.glance_count === 1 && glances[0]
                      ? `/w/${ws.id}/glances/${glances[0].id}`
                      : `/w/${ws.id}/glances`
                    
                    return (
                    <div key={ws.id}>
                      {index > 0 && <div className="divider"></div>}
                      <div className="workspaceitem">
                        <div className="workspacecard">
                          <div className="workspacerows">
                            <Link href={workspaceHref} className="workspacelogo-row w-inline-block" style={{ textDecoration: 'none', color: 'inherit' }}>
                              <div className="workspaceicon">
                                {(ws.logo_url || (ws.glance_count > 0 && glances[0]?.logo_url)) ? (
                                  <img src={ws.logo_url || glances[0]?.logo_url} loading="lazy" alt="" className="fullimage" />
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '24px', fontWeight: 600, color: '#7C3AED', background: '#f3f0ff' }}>
                                    {ws.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="workspacetitle">{ws.name}</div>
                                <div className="workspacesubtitle">{ws.glance_count} {ws.glance_count === 1 ? 'Glance' : 'Glances'}</div>
                              </div>
                            </Link>
                            <Link href={workspaceHref} className="button lite w-inline-block" style={{ textDecoration: 'none' }}>
                              <div>Go to Workspace</div>
                            </Link>
                          </div>
                          {glances.length > 0 && (
                            <div>
                              <div className="labelrow navlabel">
                                <div className="labeltext small">Glances</div>
                                <div className="labeldivider darker"></div>
                              </div>
                              <div className="glancesrow">
                                {glances.map((glance) => (
                                  <Link key={glance.id} href={`/w/${ws.id}/glances/${glance.id}`} className="glancerow w-inline-block" style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className="glanceicon">
                                      {glance.logo_url ? (
                                        <img src={glance.logo_url} loading="lazy" alt="" className="fullimage" />
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '16px', fontWeight: 600, color: '#7C3AED', background: '#f3f0ff' }}>
                                          {glance.name.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="glancetitle">{glance.name}</div>
                                      <div className="glancesubtitle">{glance.tab_count} {glance.tab_count === 1 ? 'Tab' : 'Tabs'}</div>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
