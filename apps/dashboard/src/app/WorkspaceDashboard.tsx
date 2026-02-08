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
  const [loading, setLoading] = useState<string | null>(null)

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

  const handleCreate = async () => {
    if (!newName.trim()) return

    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })

    if (res.ok) {
      const data = await res.json()
      setWorkspaces(prev => [...prev, data.workspace])
      setNewName('')
      setCreating(false)
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
                  <div className="alignrow" style={{ gap: '8px', marginBottom: '20px' }}>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate()
                        if (e.key === 'Escape') { setCreating(false); setNewName('') }
                      }}
                      placeholder="Workspace name..."
                      autoFocus
                      style={{ border: '1px solid #e2e2e2', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', flex: 1, outline: 'none' }}
                    />
                    <button className="button lite w-inline-block" onClick={handleCreate}>
                      <div>Create</div>
                    </button>
                    <button
                      className="button outline w-inline-block"
                      onClick={() => { setCreating(false); setNewName('') }}
                      style={{ opacity: 0.6 }}
                    >
                      <div>Cancel</div>
                    </button>
                  </div>
                ) : (
                  <a href="#" className="button lite w-inline-block" onClick={(e) => { e.preventDefault(); setCreating(true) }} style={{ marginBottom: '20px', textDecoration: 'none' }}>
                    <div>Create a Workspace</div>
                  </a>
                )}
                <div className="workspacerow">
                  {workspaces.map((ws, index) => {
                    // If there's exactly one Glance, navigate directly to it
                    const workspaceHref = ws.glance_count === 1 && ws.glances[0] 
                      ? `/w/${ws.id}/glances/${ws.glances[0].id}`
                      : `/w/${ws.id}/glances`
                    
                    return (
                    <div key={ws.id}>
                      {index > 0 && <div className="divider"></div>}
                      <div className="workspaceitem">
                        <div className="workspacecard">
                          <div className="workspacerows">
                            <Link href={workspaceHref} className="workspacelogo-row w-inline-block" style={{ textDecoration: 'none', color: 'inherit' }}>
                              <div className="workspaceicon">
                                {ws.glance_count > 0 && ws.glances[0]?.logo_url ? (
                                  <img src={ws.glances[0].logo_url} loading="lazy" alt="" className="fullimage" />
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
                          {ws.glances.length > 0 && (
                            <div>
                              <div className="labelrow navlabel">
                                <div className="labeltext small">Glances</div>
                                <div className="labeldivider darker"></div>
                              </div>
                              <div className="glancesrow">
                                {ws.glances.map((glance) => (
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
