'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
  }

  const handleDeleteIcon = (e: React.MouseEvent) => {
    e.preventDefault()
    setIconFile(null)
    setIconPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create workspace')
        setSubmitting(false)
        return
      }

      const data = await res.json()
      const workspaceId = data.workspace?.id

      // TODO: Upload icon to workspace if iconFile exists

      router.push(`/w/${workspaceId}/glances`)
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="adminpage-wrapper nopadding">
      <div className="admin-wrapper tall">
        <div className="logincontent">
          <div className="loginblock">
            <div className="loginform-wrapper">
              <img
                src="/images/glancefulllogo.svg"
                loading="lazy"
                alt=""
                className="loginlogo"
              />
              <div className="loginhead-wrap">
                <div className="loginheader">Create your workspace</div>
              </div>
            </div>
            <div className="formblock w-form">
              <form onSubmit={handleSubmit}>
                <div className="formcontent">
                  <div className="fieldblocks">
                    <div className="labelrow">
                      <div className="labeltext">Workspace Name</div>
                      <div className="labeldivider"></div>
                    </div>
                    <input
                      className="formfields w-input"
                      maxLength={256}
                      name="name"
                      placeholder="My Workspace"
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="fieldblocks">
                    <div className="labelrow">
                      <div className="labeltext">Workspace Icon</div>
                      <div className="labeldivider"></div>
                    </div>
                    {iconPreview ? (
                      <div className="stylefield-block">
                        <div className="thumbnailpreview square">
                          <img
                            src={iconPreview}
                            loading="lazy"
                            alt=""
                            className="fullimage"
                          />
                        </div>
                        <div>
                          <div className="uploadtitle">{iconFile?.name}</div>
                          <div className="uploadsubtitle">
                            {iconFile ? `${Math.round(iconFile.size / 1024)}kb` : ''}
                          </div>
                          <div className="uploadactions">
                            <a href="#" className="deletelink" onClick={handleDeleteIcon}>
                              Delete
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="uploadcard" style={{ cursor: 'pointer' }}>
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
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleIconUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                  {error && (
                    <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="formbutton black w-button"
                    disabled={!name.trim() || submitting}
                    style={{ opacity: !name.trim() || submitting ? 0.5 : 1 }}
                  >
                    {submitting ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="loginimage-side">
          <div className="loginimage">
            <img
              src="/images/litebgoption.webp"
              loading="lazy"
              sizes="(max-width: 5001px) 100vw, 5001px"
              srcSet="/images/litebgoption-p-500.webp 500w, /images/litebgoption-p-800.webp 800w, /images/litebgoption-p-1080.webp 1080w, /images/litebgoption-p-1600.webp 1600w, /images/litebgoption-p-2000.webp 2000w, /images/litebgoption-p-2600.webp 2600w, /images/litebgoption-p-3200.webp 3200w, /images/litebgoption.webp 5001w"
              alt=""
              className="full-image"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
