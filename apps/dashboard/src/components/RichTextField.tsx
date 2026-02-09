'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'

interface RichTextFieldProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  height?: number | string
  themeColor?: string
}

function ToolbarButton({
  editor,
  command,
  icon,
  isHeading,
  themeColor,
}: {
  editor: ReturnType<typeof useEditor>
  command: string
  icon: string
  isHeading?: boolean
  themeColor?: string
}) {
  if (!editor) return null

  const isActive = (() => {
    switch (command) {
      case 'bold': return editor.isActive('bold')
      case 'italic': return editor.isActive('italic')
      case 'underline': return editor.isActive('underline')
      case 'h1': return editor.isActive('heading', { level: 1 })
      case 'h2': return editor.isActive('heading', { level: 2 })
      case 'h3': return editor.isActive('heading', { level: 3 })
      case 'bulletList': return editor.isActive('bulletList')
      case 'orderedList': return editor.isActive('orderedList')
      default: return false
    }
  })()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    switch (command) {
      case 'bold': editor.chain().focus().toggleBold().run(); break
      case 'italic': editor.chain().focus().toggleItalic().run(); break
      case 'underline': editor.chain().focus().toggleUnderline().run(); break
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break
      case 'bulletList': editor.chain().focus().toggleBulletList().run(); break
      case 'orderedList': editor.chain().focus().toggleOrderedList().run(); break
    }
  }

  const activeStyle: React.CSSProperties = isActive && themeColor ? {
    borderColor: themeColor,
    backgroundColor: `${themeColor}20`,
  } : {}

  return (
    <a
      href="#"
      className={`textstyle-block${isActive ? ' active' : ''}`}
      style={activeStyle}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (themeColor) e.currentTarget.style.borderColor = themeColor
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.borderColor = ''
        else if (themeColor) e.currentTarget.style.borderColor = themeColor
      }}
    >
      <img
        src={`/images/${icon}.svg`}
        loading="lazy"
        alt={command}
        className={`textsyle-icon${isHeading ? ' h' : ''}`}
      />
    </a>
  )
}

export function RichTextField({ value, onChange, placeholder = '', height = 300, themeColor }: RichTextFieldProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Underline,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
  })

  // Sync external value changes (e.g., switching between sources)
  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [editor, value])

  return (
    <div className="tiptap-wrapper">
      {/* Toolbar */}
      <div className="textstyles-row">
        <ToolbarButton editor={editor} command="bold" icon="bold" themeColor={themeColor} />
        <ToolbarButton editor={editor} command="italic" icon="italic" themeColor={themeColor} />
        <ToolbarButton editor={editor} command="underline" icon="underline" themeColor={themeColor} />
        <div className="textstyle-divider"></div>
        <ToolbarButton editor={editor} command="h1" icon="h1" isHeading themeColor={themeColor} />
        <ToolbarButton editor={editor} command="h2" icon="h2" isHeading themeColor={themeColor} />
        <ToolbarButton editor={editor} command="h3" icon="h3" isHeading themeColor={themeColor} />
        <div className="textstyle-divider"></div>
        <ToolbarButton editor={editor} command="bulletList" icon="list" themeColor={themeColor} />
        <ToolbarButton editor={editor} command="orderedList" icon="numberslist" themeColor={themeColor} />
      </div>

      {/* Editor */}
      <div className="textdoc-content" style={{ height, overflowY: 'auto' }}>
        <EditorContent editor={editor} />
      </div>

      {/* ProseMirror content styles */}
      <style>{`
        .textdoc-content .tiptap {
          outline: none;
          min-height: 100%;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.6;
        }
        .textdoc-content .tiptap p {
          margin: 0 0 0.75em 0;
          font-size: 14px;
          line-height: 1.5em;
        }
        .textdoc-content .tiptap h1 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 0 0 0.5em 0;
          line-height: 1.3;
        }
        .textdoc-content .tiptap h2 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0 0 0.5em 0;
          line-height: 1.3;
        }
        .textdoc-content .tiptap h3 {
          font-size: 1.1em;
          font-weight: 600;
          margin: 0 0 0.5em 0;
          line-height: 1.3;
        }
        .textdoc-content .tiptap ul,
        .textdoc-content .tiptap ol {
          margin: 0 0 0.75em 0;
          padding-left: 1.5em;
        }
        .textdoc-content .tiptap li {
          margin-bottom: 0.25em;
        }
        .textdoc-content .tiptap li p {
          margin: 0;
        }
        .textdoc-content .tiptap strong {
          font-weight: 600;
        }
        .textdoc-content .tiptap em {
          font-style: italic;
        }
        .textdoc-content .tiptap u {
          text-decoration: underline;
        }
        .textdoc-content .tiptap blockquote {
          border-left: 3px solid var(--admin-border);
          margin: 0 0 0.75em 0;
          padding-left: 1em;
          opacity: 0.7;
        }
        .textdoc-content .tiptap code {
          background-color: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          padding: 0.15em 0.3em;
          font-family: monospace;
          font-size: 0.9em;
        }
        .textdoc-content .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  )
}
