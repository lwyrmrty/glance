'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useToast } from '@/components/Toast'

interface SettingsPageProps {
  workspaceName?: string
  workspaceLogoUrl?: string | null
  workspaceId?: string
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
}

export function SettingsPage({
  workspaceName = '',
  workspaceLogoUrl = null,
  workspaceId,
  glances = [],
}: SettingsPageProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [name, setName] = useState(workspaceName)
  const [logoPreview, setLogoPreview] = useState<string | null>(workspaceLogoUrl)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const [saving, setSaving] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Logo must be under 5MB', 'error')
      return
    }
    setLogoFile(file)
    setLogoRemoved(false)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleLogoDelete = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setLogoRemoved(!!workspaceLogoUrl)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleSave = async () => {
    if (!workspaceId) return

    const hasNameChange = name.trim() !== workspaceName
    const hasLogoChange = logoFile !== null || logoRemoved
    if (!hasNameChange && !hasLogoChange) return

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('id', workspaceId)
      if (hasNameChange) formData.append('name', name.trim())
      if (logoFile) formData.append('logo', logoFile)
      if (logoRemoved) formData.append('clear_logo', 'true')

      const res = await fetch('/api/workspaces', {
        method: 'PATCH',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        showToast('Settings saved')
        setLogoFile(null)
        setLogoRemoved(false)
        setLogoPreview(data.workspace?.logo_url ?? null)
        router.refresh()
      } else {
        showToast(data?.error ?? 'Failed to save', 'error')
      }
    } catch {
      showToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges =
    name.trim() !== workspaceName || logoFile !== null || logoRemoved

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
                    <img src="/images/settings.svg" loading="lazy" alt="" className="heroicon" />
                  </div>
                  <div className="alignrow alignbottom">
                    <h1 className="pageheading">Settings</h1>
                  </div>
                </div>
                <div className="pagesubheading">Manage your workspace name and icon.</div>
              </div>

              <div className="contentblock">
                <div className="contenthead-row">
                  <h2 className="contenthead">Workspace</h2>
                  <div className="labeldivider"></div>
                </div>
                <div className="formblock w-form">
                  <form onSubmit={(e) => { e.preventDefault(); handleSave() }}>
                    <div className="formcontent">
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Workspace Name</div>
                          <div className="labeldivider"></div>
                        </div>
                        <input
                          className="formfields w-input"
                          maxLength={256}
                          placeholder="My Workspace"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div className="fieldblocks">
                        <div className="labelrow">
                          <div className="labeltext">Workspace Icon</div>
                          <div className="labeldivider"></div>
                        </div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleLogoUpload}
                        />
                        {logoPreview ? (
                          <div className="stylefield-block">
                            <div className="thumbnailpreview square">
                              <img src={logoPreview} alt="" className="fullimage" />
                            </div>
                            <div>
                              <div className="uploadtitle">{logoFile?.name ?? 'Current icon'}</div>
                              <div className="uploadsubtitle">
                                {logoFile ? `${Math.round(logoFile.size / 1024)}kb` : ''}
                              </div>
                              <div className="uploadactions">
                                <a
                                  href="#"
                                  className="deletelink"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleLogoDelete()
                                  }}
                                >
                                  Remove
                                </a>
                                <a
                                  href="#"
                                  className="deletelink"
                                  style={{ marginLeft: '12px' }}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    logoInputRef.current?.click()
                                  }}
                                >
                                  Change
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="uploadcard"
                            style={{ cursor: 'pointer' }}
                            onClick={() => logoInputRef.current?.click()}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="64"
                              height="64"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="uploadicons"
                            >
                              <path
                                d="M8 16L12 12M12 12L16 16M12 12V22"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M6.3414 6.15897C7.16507 3.73597 9.38755 2 12 2C15.3137 2 18 4.79305 18 8.23846C20.2091 8.23846 22 10.1005 22 12.3974C22 13.9368 21.1956 15.2809 20 16M6.32069 6.20644C3.8806 6.55106 2 8.72597 2 11.3576C2 13.0582 2.7854 14.5682 3.99965 15.5167"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <div>Upload Image</div>
                          </div>
                        )}
                      </div>
                      <div className="alignrow alignbottom" style={{ gap: '12px', marginTop: '20px' }}>
                        <button
                          type="submit"
                          className="button lite w-inline-block"
                          disabled={!hasChanges || saving}
                        >
                          <div>{saving ? 'Saving...' : 'Save Changes'}</div>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
