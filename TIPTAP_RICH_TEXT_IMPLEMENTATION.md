# TipTap Rich Text Editor Implementation

How we implemented rich text editing with TipTap in BirdieBot's knowledge base — a reference for replicating this in other projects.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Dependencies & Build](#dependencies--build)
3. [Bundle Source](#bundle-source)
4. [HTML Structure](#html-structure)
5. [CSS Styling](#css-styling)
6. [JavaScript Initialization](#javascript-initialization)
7. [Toolbar Wiring](#toolbar-wiring)
8. [Toolbar Active State](#toolbar-active-state)
9. [Getting & Setting Content](#getting--setting-content)
10. [Replication Checklist](#replication-checklist)

---

## Architecture Overview

The setup is intentionally simple — no framework, no React, no Vue. It's vanilla JS in a server-rendered HTML page (served by Express). TipTap and its dependencies are bundled into a single IIFE file with **esbuild**, then loaded via a `<script>` tag. A custom toolbar of icon buttons sits above the editor container and toggles formatting via TipTap's chaining API.

```
src/tiptap-bundle.js          ← source (imports from node_modules)
        │  esbuild
        ▼
js/tiptap-bundle.js           ← browser-ready IIFE bundle
        │  <script> tag
        ▼
views/chat/knowledge.html     ← mounts editor into #document-editor
```

---

## Dependencies & Build

### package.json dependencies

```json
"@tiptap/core": "^3.10.7",
"@tiptap/extension-placeholder": "^3.10.7",
"@tiptap/extension-underline": "^3.13.0",
"@tiptap/starter-kit": "^3.10.7"
```

### Dev dependency (bundler)

```json
"esbuild": "^0.27.0"
```

### Build script

```json
"build:tiptap": "esbuild src/tiptap-bundle.js --bundle --outfile=js/tiptap-bundle.js --format=iife --global-name=TipTapBundle"
```

Run with:

```bash
npm run build:tiptap
```

This produces a single `js/tiptap-bundle.js` file that can be included with a `<script>` tag. No module system needed in the browser.

---

## Bundle Source

`src/tiptap-bundle.js` — the only file esbuild needs to see:

```javascript
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';

// Make TipTap available globally
window.TipTap = {
  Editor,
  StarterKit,
  Placeholder,
  Underline
};

console.log('TipTap bundle loaded successfully');
```

This attaches everything to `window.TipTap` so any inline or external script can access `window.TipTap.Editor`, etc.

---

## HTML Structure

The editor lives inside a form. The key nesting is:

```
form#resource-form
  └── div.formcontent
        └── div.fieldblocks#document-fields
              ├── div.labelrow              ← label/title row
              └── div.tiptap-wrapper        ← border container
                    ├── div.textstyles-row#tiptap-toolbar  ← formatting toolbar
                    │     ├── a.textstyle-block[data-command="bold"]
                    │     ├── a.textstyle-block[data-command="italic"]
                    │     ├── a.textstyle-block[data-command="underline"]
                    │     ├── div.textstyle-divider
                    │     ├── a.textstyle-block[data-command="h1"]
                    │     ├── a.textstyle-block[data-command="h2"]
                    │     ├── a.textstyle-block[data-command="h3"]
                    │     ├── div.textstyle-divider
                    │     ├── a.textstyle-block[data-command="bulletList"]
                    │     └── a.textstyle-block[data-command="orderedList"]
                    └── div.textdoc-content#document-editor  ← TipTap mounts here
```

### Full HTML

```html
<!-- Container for document-type fields (hidden for URL resources) -->
<div class="fieldblocks" id="document-fields" style="display:none;">
  <div class="labelrow">
    <div class="labeltext">Resource Content</div>
    <div class="labeldivider"></div>
  </div>
  <div class="tiptap-wrapper">
    <div class="textstyles-row" id="tiptap-toolbar">
      <a href="#" class="textstyle-block" data-command="bold">
        <img src="../../images/bold.svg" loading="lazy" alt="" class="textsyle-icon">
      </a>
      <a href="#" class="textstyle-block" data-command="italic">
        <img src="../../images/italic.svg" loading="lazy" alt="" class="textsyle-icon">
      </a>
      <a href="#" class="textstyle-block" data-command="underline">
        <img src="../../images/underline.svg" loading="lazy" alt="" class="textsyle-icon">
      </a>
      <div class="textstyle-divider"></div>
      <a href="#" class="textstyle-block" data-command="h1">
        <img src="../../images/h1.svg" loading="lazy" alt="" class="textsyle-icon h">
      </a>
      <a href="#" class="textstyle-block" data-command="h2">
        <img src="../../images/h2.svg" loading="lazy" alt="" class="textsyle-icon h">
      </a>
      <a href="#" class="textstyle-block" data-command="h3">
        <img src="../../images/h3.svg" loading="lazy" alt="" class="textsyle-icon h">
      </a>
      <div class="textstyle-divider"></div>
      <a href="#" class="textstyle-block" data-command="bulletList">
        <img src="../../images/list.svg" loading="lazy" alt="" class="textsyle-icon">
      </a>
      <a href="#" class="textstyle-block" data-command="orderedList">
        <img src="../../images/numberslist.svg" loading="lazy" alt="" class="textsyle-icon">
      </a>
    </div>
    <div class="textdoc-content" id="document-editor"></div>
  </div>
</div>
```

### Script include (at bottom of page, before inline JS)

```html
<script src="../../js/tiptap-bundle.js"></script>
```

---

## CSS Styling

All styles needed for the editor wrapper, toolbar, and ProseMirror content.

### Wrapper & Toolbar

```css
/* Outer border around the entire editor (toolbar + content) */
.tiptap-wrapper {
  border: 1.5px solid var(--admin-border);
  border-radius: 10px;
}

/* Toolbar row — sits above the editable area */
.textstyles-row {
  grid-column-gap: 5px;
  grid-row-gap: 5px;
  border-bottom: 1.5px solid var(--admin-border);
  background-color: #eaebe966;
  justify-content: flex-start;
  align-items: center;
  height: 50px;
  padding-left: 10px;
  display: flex;
}

/* Individual toolbar button */
.textstyle-block {
  border: 1.5px solid var(--admin-border);
  background-color: #fff9;
  border-radius: 10px;
  justify-content: center;
  align-items: center;
  width: 33px;
  height: 33px;
  display: flex;
}

.textstyle-block:hover {
  border-color: var(--callout-color);
}

/* Active state — applied via JS when format is active at cursor */
.textstyle-block.active {
  border-color: var(--callout-color);
  background-color: rgba(var(--callout-color-rgb), 0.19);
}

/* Icon sizing inside toolbar buttons */
.textsyle-icon {
  width: 11px;
  height: 11px;
}

.textsyle-icon.h {
  width: 14px;
  height: 14px;
}

/* Vertical divider between button groups */
.textstyle-divider {
  background-color: var(--admin-border);
  width: 1.5px;
  height: 30px;
  margin-left: 5px;
  margin-right: 5px;
}
```

### Editor Content Area

```css
/* The container TipTap renders into */
.textdoc-content {
  height: 480px;
  padding: 15px;
  overflow-y: auto;
}

/* Optional shorter variant */
.textdoc-content.short {
  height: 240px;
}
```

### ProseMirror Content Styles

These style the actual editable content TipTap renders inside `.textdoc-content`:

```css
/* Remove default outline, set base typography */
.textdoc-content .ProseMirror {
  outline: none;
  min-height: 100%;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-color, #333);
}

/* Paragraphs */
.textdoc-content .ProseMirror p {
  margin: 0 0 0.75em 0;
  font-size: 16px;
  line-height: 1.5em;
}

/* Headings */
.textdoc-content .ProseMirror h1 {
  font-size: 1.75em;
  font-weight: 700;
  margin: 0 0 0.5em 0;
  line-height: 1.3;
}

.textdoc-content .ProseMirror h2 {
  font-size: 1.4em;
  font-weight: 600;
  margin: 0 0 0.5em 0;
  line-height: 1.3;
}

.textdoc-content .ProseMirror h3 {
  font-size: 1.15em;
  font-weight: 600;
  margin: 0 0 0.5em 0;
  line-height: 1.3;
}

/* Lists */
.textdoc-content .ProseMirror ul,
.textdoc-content .ProseMirror ol {
  margin: 0 0 0.75em 0;
  padding-left: 1.5em;
}

.textdoc-content .ProseMirror li {
  margin-bottom: 0.25em;
}

.textdoc-content .ProseMirror li p {
  margin: 0;
}

/* Inline formatting */
.textdoc-content .ProseMirror strong {
  font-weight: 600;
}

.textdoc-content .ProseMirror em {
  font-style: italic;
}

.textdoc-content .ProseMirror u {
  text-decoration: underline;
}

/* Blockquote */
.textdoc-content .ProseMirror blockquote {
  border-left: 3px solid var(--admin-border);
  margin: 0 0 0.75em 0;
  padding-left: 1em;
  color: #666;
}

/* Code */
.textdoc-content .ProseMirror code {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  padding: 0.15em 0.3em;
  font-family: monospace;
  font-size: 0.9em;
}

.textdoc-content .ProseMirror pre {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 0.75em 1em;
  margin: 0 0 0.75em 0;
  overflow-x: auto;
}

.textdoc-content .ProseMirror pre code {
  background: none;
  padding: 0;
}
```

### Placeholder

```css
.textdoc-content .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}
```

### CSS Variables Used

You'll need to define these (or replace them with hardcoded values):

```css
:root {
  --admin-border: #e0e0e0;        /* border color */
  --callout-color: #4a90d9;       /* accent/brand color */
  --callout-color-rgb: 74,144,217; /* same as above in RGB for rgba() */
  --text-color: #333;             /* body text color */
}
```

---

## JavaScript Initialization

```javascript
let documentEditor = null;

function initializeTipTapEditor() {
  if (!window.TipTap) {
    console.error('TipTap bundle not loaded');
    return;
  }

  const { Editor, StarterKit, Placeholder, Underline } = window.TipTap;
  const editorElement = document.getElementById('document-editor');

  if (!editorElement) {
    console.error('Document editor element not found');
    return;
  }

  // Destroy existing editor if any (important for re-initialization)
  if (documentEditor) {
    documentEditor.destroy();
  }

  documentEditor = new Editor({
    element: editorElement,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start typing your content here...',
      }),
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
    onUpdate: () => {
      updateToolbarState();
    },
    onSelectionUpdate: () => {
      updateToolbarState();
    },
  });

  // Wire up toolbar buttons after editor is ready
  setupToolbarButtons();
}
```

**Key details:**
- `StarterKit` bundles bold, italic, strike, headings, bullet/ordered lists, blockquotes, code, code blocks, hard breaks, and horizontal rules.
- `Placeholder` renders ghost text when the editor is empty.
- `Underline` adds underline support (not included in StarterKit by default).
- `onUpdate` and `onSelectionUpdate` keep toolbar button active states in sync.

---

## Toolbar Wiring

Each toolbar button has a `data-command` attribute. A single event listener setup maps commands to TipTap chain methods:

```javascript
function setupToolbarButtons() {
  const toolbar = document.getElementById('tiptap-toolbar');
  if (!toolbar || !documentEditor) return;

  const buttons = toolbar.querySelectorAll('.textstyle-block[data-command]');

  buttons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const command = button.dataset.command;

      switch (command) {
        case 'bold':
          documentEditor.chain().focus().toggleBold().run();
          break;
        case 'italic':
          documentEditor.chain().focus().toggleItalic().run();
          break;
        case 'underline':
          documentEditor.chain().focus().toggleUnderline().run();
          break;
        case 'h1':
          documentEditor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case 'h2':
          documentEditor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'h3':
          documentEditor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case 'bulletList':
          documentEditor.chain().focus().toggleBulletList().run();
          break;
        case 'orderedList':
          documentEditor.chain().focus().toggleOrderedList().run();
          break;
      }

      updateToolbarState();
    });
  });
}
```

**Pattern:** `documentEditor.chain().focus().toggleXxx().run()` — chains always start with `.focus()` to return focus to the editor after clicking the toolbar button.

---

## Toolbar Active State

Keeps toolbar buttons highlighted when their format is active at the cursor position:

```javascript
function updateToolbarState() {
  if (!documentEditor) return;

  const toolbar = document.getElementById('tiptap-toolbar');
  if (!toolbar) return;

  const buttons = toolbar.querySelectorAll('.textstyle-block[data-command]');

  buttons.forEach(button => {
    const command = button.dataset.command;
    button.classList.remove('active');

    switch (command) {
      case 'bold':
        if (documentEditor.isActive('bold')) button.classList.add('active');
        break;
      case 'italic':
        if (documentEditor.isActive('italic')) button.classList.add('active');
        break;
      case 'underline':
        if (documentEditor.isActive('underline')) button.classList.add('active');
        break;
      case 'h1':
        if (documentEditor.isActive('heading', { level: 1 })) button.classList.add('active');
        break;
      case 'h2':
        if (documentEditor.isActive('heading', { level: 2 })) button.classList.add('active');
        break;
      case 'h3':
        if (documentEditor.isActive('heading', { level: 3 })) button.classList.add('active');
        break;
      case 'bulletList':
        if (documentEditor.isActive('bulletList')) button.classList.add('active');
        break;
      case 'orderedList':
        if (documentEditor.isActive('orderedList')) button.classList.add('active');
        break;
    }
  });
}
```

---

## Getting & Setting Content

### Read HTML from the editor

```javascript
function getEditorContent() {
  if (documentEditor) {
    return documentEditor.getHTML();
  }
  // Fallback if TipTap isn't available
  const docEditor = document.getElementById('document-editor');
  return docEditor?.innerHTML || '';
}
```

### Write HTML into the editor

```javascript
function setEditorContent(content) {
  if (documentEditor) {
    documentEditor.commands.setContent(content || '');
  } else {
    // Fallback if TipTap isn't available
    const docEditor = document.getElementById('document-editor');
    if (docEditor) docEditor.innerHTML = content || '';
  }
}
```

Both functions include fallbacks so the app degrades gracefully if TipTap fails to load.

---

## Replication Checklist

To add this to a new project:

1. **Install dependencies**

   ```bash
   npm install @tiptap/core @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-underline
   npm install --save-dev esbuild
   ```

2. **Create `src/tiptap-bundle.js`** — copy the bundle source above

3. **Add the build script** to `package.json`:

   ```json
   "build:tiptap": "esbuild src/tiptap-bundle.js --bundle --outfile=js/tiptap-bundle.js --format=iife --global-name=TipTapBundle"
   ```

4. **Run the build**: `npm run build:tiptap`

5. **Add the HTML** — toolbar + `#document-editor` div inside a `.tiptap-wrapper`

6. **Add the CSS** — wrapper, toolbar, ProseMirror content styles, and placeholder

7. **Add `<script src="js/tiptap-bundle.js"></script>`** before your page script

8. **Add the JS** — `initializeTipTapEditor()`, `setupToolbarButtons()`, `updateToolbarState()`, `getEditorContent()`, `setEditorContent()`

9. **Add toolbar icons** — SVGs for bold, italic, underline, h1, h2, h3, list, numbered list

10. **Define CSS variables** — `--admin-border`, `--callout-color`, `--callout-color-rgb`, `--text-color`

11. **Call `initializeTipTapEditor()`** when the page loads or when the editor container becomes visible

---

## Extensions Quick Reference

| Extension | Included In | What It Does |
|-----------|------------|--------------|
| Bold | StarterKit | `**bold**` formatting |
| Italic | StarterKit | `*italic*` formatting |
| Strike | StarterKit | ~~strikethrough~~ |
| Heading | StarterKit | H1, H2, H3 (configured to levels 1-3) |
| BulletList | StarterKit | Unordered lists |
| OrderedList | StarterKit | Numbered lists |
| Blockquote | StarterKit | Block quotes |
| Code | StarterKit | Inline `code` |
| CodeBlock | StarterKit | Fenced code blocks |
| HardBreak | StarterKit | Shift+Enter line breaks |
| HorizontalRule | StarterKit | `---` dividers |
| Placeholder | Separate | Ghost text when editor is empty |
| Underline | Separate | Underline formatting |
