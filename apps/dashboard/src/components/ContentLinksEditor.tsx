'use client'

import { useState, useRef } from 'react'

export interface ContentLink {
  title: string
  description: string
  link: string
  tabLink: string
  imageUrl?: string
}

interface ContentLinksEditorProps {
  links: ContentLink[]
  tabLinkNames: string[]
  onLinksChange: (links: ContentLink[]) => void
  onImageUpload: (index: number, file: File) => void
}

const dragIconSvg = (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="dragicons">
    <g>
      <path d="M11 18C11 19.1 10.1 20 9 20C7.9 20 7 19.1 7 18C7 16.9 7.9 16 9 16C10.1 16 11 16.9 11 18ZM9 10C7.9 10 7 10.9 7 12C7 13.1 7.9 14 9 14C10.1 14 11 13.1 11 12C11 10.9 10.1 10 9 10ZM9 4C7.9 4 7 4.9 7 6C7 7.1 7.9 8 9 8C10.1 8 11 7.1 11 6C11 4.9 10.1 4 9 4ZM15 8C16.1 8 17 7.1 17 6C17 4.9 16.1 4 15 4C13.9 4 13 4.9 13 6C13 7.1 13.9 8 15 8ZM15 10C13.9 10 13 10.9 13 12C13 13.1 13.9 14 15 14C16.1 14 17 13.1 17 12C17 10.9 16.1 10 15 10ZM15 16C13.9 16 13 16.9 13 18C13 19.1 13.9 20 15 20C16.1 20 17 19.1 17 18C17 16.9 16.1 16 15 16Z" fill="currentColor"></path>
    </g>
  </svg>
)

export function ContentLinksEditor({ links, tabLinkNames, onLinksChange, onImageUpload }: ContentLinksEditorProps) {
  // Drag-and-drop state (internal)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const imageRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleDragStart = (index: number) => setDragIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }
  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const updated = [...links]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(index, 0, moved)
    onLinksChange(updated)
    setDragIndex(null)
    setDragOverIndex(null)
  }
  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const updateLink = (index: number, field: string, value: string) => {
    onLinksChange(links.map((cl, i) => (i === index ? { ...cl, [field]: value } : cl)))
  }

  const addLink = () => {
    onLinksChange([...links, { title: '', description: '', link: '', tabLink: '' }])
  }

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onImageUpload(index, file)
  }

  return (
    <div className="fieldblocks">
      <div className="labelrow">
        <div className="labeltext">Content Links</div>
        <div className="labeldivider"></div>
      </div>
      <div className="rowcards">
        {links.map((cl, i) => (
          <div
            key={i}
            className="rowcard withdrag"
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
            style={{
              opacity: dragIndex === i ? 0.4 : 1,
              borderTop: dragOverIndex === i && dragIndex !== null && dragIndex > i ? '2px solid var(--vcs-purple, #6c5ce7)' : undefined,
              borderBottom: dragOverIndex === i && dragIndex !== null && dragIndex < i ? '2px solid var(--vcs-purple, #6c5ce7)' : undefined,
              transition: 'opacity 0.15s',
            }}
          >
            <div className="alignrow aligncenter stretch">
              <div className="draggingblock moved" style={{ cursor: 'grab' }}>{dragIconSvg}</div>
              <div className="prompt-block">
                <div className="alignrow">
                  <input
                    ref={(el) => { imageRefs.current[i] = el }}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageChange(i, e)}
                  />
                  <div
                    className="thumbnailpicker"
                    style={{ cursor: 'pointer', ...(cl.imageUrl ? {} : { background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 11 }) }}
                    onClick={() => imageRefs.current[i]?.click()}
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
                    onChange={(e) => updateLink(i, 'title', e.target.value)}
                  />
                </div>
                <textarea
                  placeholder="Short Description"
                  maxLength={5000}
                  className="formfields w-input"
                  value={cl.description}
                  onChange={(e) => updateLink(i, 'description', e.target.value)}
                />
                <input
                  className="formfields hash w-input"
                  maxLength={256}
                  placeholder="Content link"
                  type="text"
                  value={cl.link}
                  onChange={(e) => updateLink(i, 'link', e.target.value)}
                />
                <div className="alignrow aligncenter wrap">
                  <div className="labeltext">Tab Links:</div>
                  {tabLinkNames.map((tn: string) => {
                    const hash = `#glance-${tn.toLowerCase().replace(/\s+/g, '-')}`
                    const isSelected = cl.link === hash
                    return (
                      <a
                        key={tn}
                        href="#"
                        className={`calloutpill w-inline-block${isSelected ? ' selected' : ''}`}
                        onClick={(e) => {
                          e.preventDefault()
                          updateLink(i, 'link', isSelected ? '' : hash)
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
        onClick={(e) => { e.preventDefault(); addLink() }}
      >
        <div>Add new link</div>
      </a>
    </div>
  )
}
