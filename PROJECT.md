# Glance - Project Specification

> **Domain:** glancethis.com
> **Last Updated:** February 5, 2026

---

## 0. Development Workflow

**Read this section first. It defines how we build — not what we build.**

### Step 1: Understand the Product

Read this entire PROJECT.md thoroughly before writing any code. The purpose of this document is to give you full context on what Glance is, how the pieces fit together, and what the final product looks like. Do not begin implementation based on this document alone — it is a reference, not a build order.

### Step 2: Build from HTML, One Page at a Time

I will provide HTML files one at a time. Each HTML file represents a single page or component of the application. Your job is to:

1. **Reproduce the HTML structure exactly as provided.** Match the markup, class names, attributes, and layout precisely. This is the source of truth for the UI.
2. **Keep everything static.** No API calls, no state management, no dynamic behavior, no data fetching. Render the HTML as a static page using the project's framework (Next.js + Tailwind for the dashboard, vanilla JS for the widget).
3. **Do not think ahead.** Do not implement functionality that hasn't been explicitly discussed. Do not wire up buttons, forms, or navigation unless I've told you to. Do not create API routes, database queries, or backend logic preemptively.
4. **Do not infer behavior from the spec.** The spec describes the finished product. We are not building the finished product in one pass. We are building it piece by piece, and I will tell you when and how to add behavior.

### Step 3: Add Behavior Together

After the static pages are in place, we will go through them together. I will point out specific elements and explain how they should work — what happens on click, what data flows where, what API calls are needed. Only then do you implement that behavior.

### Rules

- **Never assume.** If something is ambiguous, ask.
- **Never add functionality I haven't requested.** Even if you can see from the spec that a button should call an API, do not wire it up until I say so.
- **Never refactor ahead of time.** Don't extract components, create shared utilities, or reorganize code in anticipation of future needs. We'll refactor when it makes sense, together.
- **Match the HTML.** If the HTML uses a specific class name, attribute, or structure, preserve it. Don't rename classes to match a convention unless I ask you to.
- **One page at a time.** Focus entirely on the current HTML file. Don't touch other files unless the current task requires it.

---

## 1. Product Overview

Glance is an embeddable website widget that customers install via a single `<script>` tag. It lives directly on the customer's own domain as a floating overlay — a button row triggers it open, and inside visitors find a tabbed interface built from configurable templates.

Customers build their widget by selecting tab templates (AI Chat, TLDR/About, Forms, Gallery, Dynamic Content, 3rd Party Embeds, Spotify) and customizing each one through the Glance dashboard. Tabs can be marked as "premium," requiring the visitor to authenticate (Google OAuth or magic code) before accessing that content. This gives customers a built-in email capture mechanism in exchange for gated experiences.

The widget tracks visitor behavior (page views, widget interactions, session data) and surfaces analytics in the dashboard. Form submissions are stored and can be forwarded via webhook to Zapier, Make, or any endpoint.

**Key differentiator:** All traffic stays on the customer's domain. Deep linking via URL hashes (e.g., `website.com#glance-about`) means customers can share direct links to specific widget tabs without sending visitors to a third-party page.

### Account Model

- A **user** creates a Glance **account** via Google Auth (Supabase) or Magic Code
- An **account** can contain multiple **widgets**, each with its own embed code, tabs, and configuration
- An account can have multiple **team members**
- A team member can belong to multiple **accounts** (many-to-many)
- **Visitor data** (people who interact with embedded widgets) belongs to the account that owns the widget — Glance operates as a data processor, not a data controller. Visitor data is scoped per account and is never accessible across accounts or by Glance internally

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Widget (client)** | Vanilla JS + Shadow DOM | No React — keeps bundle tiny (<15-20KB gzipped), prevents style/JS conflicts on host sites |
| **Dashboard (admin)** | Next.js + Tailwind | Customer-facing config UI at app.glancethis.com |
| **Database** | Supabase (Postgres) | Auth, widget configs, form submissions, analytics, user data |
| **Vector Storage** | Supabase pgvector | Knowledge source embeddings for AI Chat RAG |
| **AI Chat** | Anthropic Claude API | Sonnet for chat responses, embeddings for semantic search |
| **Auth (visitors)** | Google OAuth + Magic Code | JWT with refresh tokens, 30-90 day session persistence |
| **Auth (customers)** | Supabase Auth (Google OAuth + Magic Code) | Dashboard login for account owners and team members |
| **Deployment** | Vercel (dashboard) + CDN (widget script) | Widget served from cdn.glancethis.com |
| **Cron/Background** | Vercel Cron or Fly.io | Knowledge source sync jobs |

### Key Architectural Decisions

- **Shadow DOM for widget encapsulation.** The widget creates a custom element (`<glance-widget>`) with an attached shadow root. All styles are scoped inside. This prevents any CSS leakage in either direction between the widget and the host site.
- **No React in the widget.** State is managed via class properties on the custom element. For a chat widget's complexity (messages array, input state, loading flag, active tab), this is sufficient and eliminates a 40-50KB framework dependency.
- **Single script tag embed.** Customers add one line: `<script src="https://cdn.glancethis.com/widget.js" data-widget-id="xxx"></script>`. The script fetches the widget config from the API and renders everything.

---

## 3. File & Folder Structure

```
glance/
├── PROJECT.md                    # This file
├── .cursorrules                  # Cursor conventions (see section 16)
│
├── apps/
│   ├── widget/                   # Embeddable widget (vanilla JS)
│   │   ├── src/
│   │   │   ├── index.js          # Entry point, custom element registration
│   │   │   ├── widget.js         # Main GlanceWidget class (Shadow DOM)
│   │   │   ├── tabs/
│   │   │   │   ├── tldr.js       # TLDR/About tab
│   │   │   │   ├── chat.js       # AI Chat tab
│   │   │   │   ├── form.js       # Form builder tab
│   │   │   │   ├── gallery.js    # Gallery tab
│   │   │   │   ├── dynamic.js    # Dynamic content tab
│   │   │   │   ├── embed.js      # 3rd party embed tab (Calendly, Tally, Typeform)
│   │   │   │   └── spotify.js    # Spotify embed tab
│   │   │   ├── components/
│   │   │   │   ├── button-row.js # Bottom button row (launcher)
│   │   │   │   ├── tab-nav.js    # Tab navigation bar
│   │   │   │   ├── prompts.js    # Floating suggested prompts
│   │   │   │   ├── account-tab.js # Auth gate for premium tabs (3 flow states)
│   │   │   │   └── content-row.js # Reusable content row component
│   │   │   ├── auth/
│   │   │   │   ├── google.js     # Google OAuth flow
│   │   │   │   ├── magic-code.js # Magic code email + verification flow
│   │   │   │   └── session.js    # JWT management, token refresh
│   │   │   ├── tracking/
│   │   │   │   ├── events.js     # Event queue and batching
│   │   │   │   ├── session.js    # Session management (30-min windows)
│   │   │   │   └── page.js       # Background page tracking
│   │   │   ├── utils/
│   │   │   │   ├── deep-link.js  # Hash-based navigation (#glance-xxx)
│   │   │   │   ├── embed-url.js  # 3rd party URL transformation
│   │   │   │   └── styles.js     # Dynamic style injection (theme color)
│   │   │   └── styles/
│   │   │       └── widget.css    # All widget styles (injected into Shadow DOM)
│   │   ├── build/                # Bundled output → CDN
│   │   └── package.json
│   │
│   └── dashboard/                # Next.js admin dashboard
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx              # Landing/login
│       │   │   ├── onboarding/
│       │   │   │   └── page.tsx          # New account setup flow
│       │   │   ├── dashboard/
│       │   │   │   ├── page.tsx          # Account overview (widgets list)
│       │   │   │   ├── account/
│       │   │   │   │   ├── page.tsx      # Account settings
│       │   │   │   │   └── team/
│       │   │   │   │       └── page.tsx  # Team members (invite, remove, roles)
│       │   │   │   └── [widgetId]/
│       │   │   │       ├── page.tsx      # Widget overview + analytics
│       │   │   │       ├── tabs/
│       │   │   │       │   ├── page.tsx  # Tab management (add/remove/reorder)
│       │   │   │       │   └── [tabId]/
│       │   │   │       │       └── page.tsx  # Individual tab config
│       │   │   │       ├── design/
│       │   │   │       │   └── page.tsx  # Theme color, button style, placement
│       │   │   │       ├── knowledge/
│       │   │   │       │   ├── page.tsx  # Knowledge sources list
│       │   │   │       │   └── [sourceId]/
│       │   │   │       │       └── page.tsx  # Source config + sync status
│       │   │   │       ├── forms/
│       │   │   │       │   └── page.tsx  # Form submissions + webhook config
│       │   │   │       ├── users/
│       │   │   │       │   ├── page.tsx  # Visitor list with sessions
│       │   │   │       │   └── [userId]/
│       │   │   │       │       └── page.tsx  # Individual visitor timeline
│       │   │   │       ├── analytics/
│       │   │   │       │   └── page.tsx  # Usage analytics
│       │   │   │       └── settings/
│       │   │   │           └── page.tsx  # Embed code, integrations, API keys
│       │   │   └── api/
│       │   │       ├── widget/
│       │   │       │   ├── [widgetId]/
│       │   │       │   │   └── config/route.ts   # GET widget config (public, called by widget.js)
│       │   │       │   └── route.ts               # CRUD widgets
│       │   │       ├── chat/
│       │   │       │   └── route.ts               # POST chat message → RAG → Claude response
│       │   │       ├── auth/
│       │   │       │   ├── google/route.ts        # Google OAuth callback
│       │   │       │   ├── magic-code/send/route.ts   # Send 6-digit code email
│       │   │       │   ├── magic-code/verify/route.ts # Verify 6-digit code
│       │   │       │   └── refresh/route.ts       # Refresh JWT
│       │   │       ├── forms/
│       │   │       │   └── submit/route.ts        # Form submission + webhook forward
│       │   │       ├── events/
│       │   │       │   └── route.ts               # Batched event ingestion
│       │   │       ├── knowledge/
│       │   │       │   ├── route.ts               # CRUD knowledge sources
│       │   │       │   └── sync/route.ts          # Trigger manual sync
│       │   │       └── webhooks/
│       │   │           └── test/route.ts          # Test webhook endpoint
│       │   └── components/                        # Shared React components
│       ├── package.json
│       └── next.config.js
│
├── packages/
│   └── shared/                   # Shared types, constants, utils
│       ├── types.ts
│       └── constants.ts
│
└── supabase/
    ├── migrations/               # Database migrations
    └── seed.sql                  # Dev seed data
```

---

## 4. Database Schema

### Core Tables

```sql
-- ============================================
-- ACCOUNT & TEAM MANAGEMENT
-- ============================================

-- Accounts (the top-level entity — billing, ownership, contains widgets)
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  airtable_api_key text,          -- encrypted, for Airtable knowledge sources
  google_oauth_token jsonb,       -- encrypted, for Google Docs/Sheets sources
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Users (people who log into the Glance dashboard)
-- Auth handled by Supabase Auth (Google OAuth or Magic Code)
-- A user can belong to multiple accounts, an account can have multiple users
create table users (
  id uuid primary key references auth.users(id),
  email text not null unique,
  name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Account memberships (many-to-many: users ↔ accounts)
create table account_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique(account_id, user_id)
);

-- ============================================
-- WIDGETS & TABS
-- ============================================

-- Widgets (each account can have multiple widgets, each with its own embed code)
create table widgets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  name text not null,
  domain text,                     -- authorized domain for embedding
  theme_color text default '#7C3AED', -- single accent color (hex)
  button_style jsonb default '{}', -- button row config (position, shape, label)
  hash_prefix text default 'glance', -- deep link prefix (#glance-xxx)
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabs (ordered list of tabs per widget)
create table tabs (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid references widgets(id) on delete cascade,
  type text not null check (type in ('tldr', 'chat', 'form', 'gallery', 'dynamic', 'embed', 'spotify')),
  label text not null,             -- display name in tab nav
  icon text,                       -- icon identifier
  sort_order integer not null,
  is_premium boolean default false, -- requires auth to view
  deep_link_hash text,             -- custom hash slug (e.g., 'about' → #glance-about)
  config jsonb not null default '{}', -- tab-specific config (see Tab Configs below)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(widget_id, sort_order),
  unique(widget_id, deep_link_hash)
);

-- ============================================
-- VISITOR DATA (scoped per account — customer-owned data)
-- Glance is the data processor, not controller.
-- All visitor data is strictly scoped to the account that owns the widget.
-- RLS policies must enforce: account A can never access account B's visitor data.
-- Glance admin tooling should not expose raw visitor data across accounts.
-- ============================================

-- Widget visitors (people who interact with embedded widgets)
create table visitors (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade, -- data ownership scope
  widget_id uuid references widgets(id) on delete cascade,
  client_id text,                  -- anonymous localStorage ID
  email text,
  name text,
  avatar_url text,
  auth_provider text check (auth_provider in ('google', 'magic_code')),
  is_authenticated boolean default false,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  metadata jsonb default '{}'
);

-- Sessions (30-minute activity windows)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references visitors(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade, -- data ownership scope
  widget_id uuid references widgets(id) on delete cascade,
  started_at timestamptz default now(),
  last_event_at timestamptz default now(),
  page_count integer default 0,
  widget_opened boolean default false,
  entry_source text,               -- referrer
  entry_page text,
  intent_score text check (intent_score in ('high', 'medium', 'low'))
);

-- Events (batched from widget, stored per session)
create table events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  visitor_id uuid references visitors(id),
  account_id uuid references accounts(id) on delete cascade, -- data ownership scope
  type text not null,              -- widget_open, widget_close, tab_view, page_view, etc.
  data jsonb default '{}',
  timestamp timestamptz default now()
);

-- Form submissions
create table form_submissions (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid references tabs(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade, -- data ownership scope
  widget_id uuid references widgets(id) on delete cascade,
  visitor_id uuid references visitors(id),
  data jsonb not null,             -- flat key-value of form fields
  submitted_at timestamptz default now()
);

-- ============================================
-- INTEGRATIONS & WEBHOOKS
-- ============================================

-- Webhook configs
create table webhooks (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid references widgets(id) on delete cascade,
  url text not null,               -- must be HTTPS
  events text[] default '{"form_submission"}', -- which events trigger it
  is_active boolean default true,
  last_triggered_at timestamptz,
  last_status integer,             -- HTTP status of last attempt
  created_at timestamptz default now()
);

-- ============================================
-- KNOWLEDGE SOURCES (for AI Chat)
-- ============================================

-- Knowledge sources (owned by account, reusable across widgets)
create table knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  name text not null,
  type text not null check (type in ('google_doc', 'google_sheet', 'airtable_base', 'airtable_table', 'text', 'url')),
  config jsonb not null default '{}', -- source-specific config (doc ID, sheet ID, base ID, URL, etc.)
  sync_status text default 'pending' check (sync_status in ('pending', 'syncing', 'synced', 'error')),
  last_synced_at timestamptz,
  chunk_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Knowledge chunks (embedded content for RAG)
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references knowledge_sources(id) on delete cascade,
  content text not null,            -- the text chunk (500-800 tokens)
  metadata jsonb default '{}',     -- source doc, chunk index, author, tags
  embedding vector(1536),          -- OpenAI ada-002 or equivalent
  created_at timestamptz default now()
);

-- ============================================
-- CHAT
-- ============================================

-- Chat sessions
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid references tabs(id) on delete cascade,
  visitor_id uuid references visitors(id),
  account_id uuid references accounts(id) on delete cascade, -- data ownership scope
  widget_id uuid references widgets(id) on delete cascade,
  created_at timestamptz default now()
);

-- Chat messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  referenced_chunks uuid[],        -- knowledge chunks used in response
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_memberships_account on account_memberships(account_id);
create index idx_memberships_user on account_memberships(user_id);
create index idx_widgets_account on widgets(account_id);
create index idx_tabs_widget on tabs(widget_id, sort_order);
create index idx_visitors_account on visitors(account_id);
create index idx_visitors_widget on visitors(widget_id);
create index idx_visitors_email on visitors(email);
create index idx_sessions_visitor on sessions(visitor_id);
create index idx_sessions_account on sessions(account_id);
create index idx_events_session on events(session_id);
create index idx_events_account on events(account_id);
create index idx_chunks_source on knowledge_chunks(source_id);
create index idx_chunks_embedding on knowledge_chunks using ivfflat (embedding vector_cosine_ops);
create index idx_form_subs_account on form_submissions(account_id);
create index idx_form_subs_widget on form_submissions(widget_id);
create index idx_chat_sessions_account on chat_sessions(account_id);

-- ============================================
-- ROW LEVEL SECURITY (enforce data scoping)
-- All visitor-related tables use account_id for RLS.
-- Policies ensure users can only access data for accounts they belong to.
-- ============================================

alter table visitors enable row level security;
alter table sessions enable row level security;
alter table events enable row level security;
alter table form_submissions enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- Example RLS policy (apply similar pattern to all visitor data tables):
-- create policy "Users can only access their account's visitors"
--   on visitors for all
--   using (account_id in (
--     select account_id from account_memberships where user_id = auth.uid()
--   ));
```

### Tab Config Schemas (stored in tabs.config JSONB)

```typescript
// TLDR / About tab
interface TldrConfig {
  bannerImage?: string;
  logo?: string;
  title: string;
  subtitle?: string;
  socialLinks?: { platform: string; url: string }[];
  contentRows: {
    id: string;
    thumbnail?: string;
    title: string;
    subtitle?: string;
    linkUrl?: string;        // external URL or...
    linkTabId?: string;      // internal tab reference (smart linking)
  }[];  // max 10
}

// Form tab
interface FormConfig {
  bannerImage?: string;
  title: string;
  subtitle?: string;
  fields: {
    id: string;
    type: 'text' | 'email' | 'phone' | 'url' | 'file';
    label: string;
    required: boolean;
  }[];
  submitButtonText?: string;
  successMessage?: string;
}

// Gallery tab
interface GalleryConfig {
  items: {
    id: string;
    imageUrl: string;
    videoUrl?: string;       // if present, show play icon overlay
    caption?: string;
  }[];
}

// Dynamic Content tab
interface DynamicConfig {
  bannerImage?: string;
  title: string;
  subtitle?: string;
  source: 'manual' | 'airtable' | 'webflow_cms';
  sourceConfig?: {
    baseId?: string;         // Airtable
    tableId?: string;
    collectionId?: string;   // Webflow CMS
  };
  items: {                   // populated manually or via sync
    id: string;
    thumbnail?: string;
    title: string;
    subtitle?: string;
    linkUrl?: string;
  }[];  // max 50, with pagination
  pagination: boolean;
  itemsPerPage: number;      // default 10
}

// AI Chat tab
interface ChatConfig {
  knowledgeSourceIds: string[];   // references knowledge_sources table
  systemDirective: string;        // customer-written system prompt addition
  suggestedPrompts: string[];     // up to 4 prompt pills
  welcomeMessage: string;
  chatLabel: string;              // e.g., "Acme Co" shown next to bot messages
  maxResultsPerQuery: number;     // RAG top-N, default 10
}

// 3rd Party Embed tab
interface EmbedConfig {
  service: 'calendly' | 'tally' | 'typeform';
  originalUrl: string;       // what the user pastes
  embedUrl: string;          // transformed URL (computed on save)
}

// Spotify tab
interface SpotifyConfig {
  playlistUrl: string;       // user pastes playlist URL
  embedUrl: string;          // transformed to embed URL
}
```

---

## 5. Widget Architecture (Embeddable Client)

### Embed Code

```html
<script src="https://cdn.glancethis.com/widget.js" data-widget-id="xxx"></script>
```

### Initialization Flow

1. Script loads, reads `data-widget-id` from its own script tag
2. Fetches widget config from `GET /api/widget/{widgetId}/config`
3. Creates `<glance-widget>` custom element with Shadow DOM
4. Injects scoped styles (including dynamic theme color as CSS variable)
5. Renders button row (launcher) at bottom of page
6. Checks URL hash for deep link → auto-opens if match found
7. Initializes tracking (anonymous client ID in localStorage)
8. Listens for hash changes

### Custom Element Structure

```javascript
class GlanceWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // State
    this.config = null;
    this.activeTab = null;
    this.isOpen = false;
    this.visitor = null;       // null if anonymous, populated after auth
    this.sessionId = null;
  }

  async connectedCallback() {
    const widgetId = this.getAttribute('data-widget-id');
    this.config = await fetchWidgetConfig(widgetId);
    this.render();
    this.initTracking();
    this.checkDeepLink();
  }
}

customElements.define('glance-widget', GlanceWidget);
```

### Visual Layers (bottom to top)

1. **Button Row** — always visible at bottom of page. Contains:
   - Wide button with customizable label (e.g., "Find the right investor") — opens widget to a specific tab
   - Square button with logo — opens widget to default tab
2. **Floating Suggested Prompts** — appear on scroll, above button row. Clicking opens widget to AI Chat with that prompt pre-filled
3. **Widget Panel** — slides up/in when triggered. Contains:
   - Active tab content area (top, scrollable)
   - Tab navigation bar (bottom, fixed)

### Theme System

Single accent color (stored as `theme_color` hex on widget). Injected as CSS custom property:

```css
:host {
  --glance-accent: #7C3AED;
  --glance-accent-light: #7C3AED1A;  /* 10% opacity */
  --glance-bg: #FFFFFF;
  --glance-text: #111111;
  --glance-text-secondary: #666666;
  --glance-border: #E5E5E5;
}
```

Design is primarily black and white with the accent color used subtly: active tab indicator, button backgrounds, link hover states, chat bubble accents, send button, prompt pills.

---

## 6. Widget Tab Templates

### 6.1 TLDR (About/Links)

The primary "about" tab — a customizable landing page within the widget. Components:
- **Banner image** — full-width at top, with slight pull (negative margin for bleed effect)
- **Logo block** — logo image + title + subtitle + social icons row
- **Content rows** — repeatable list (max 10), each with: thumbnail image, title, subtitle, click action (external link or internal tab switch via smart linking)

Social icons supported: Facebook, Instagram, YouTube, TikTok (SVG icons, linking to customer's profiles).

### 6.2 AI Chat

The most complex tab. Components:
- **Chat message area** — scrollable, showing bot and user messages with timestamps and labels
- **Suggested prompt pills** — horizontal scrollable row above input, up to 4 pills
- **Chat input** — text field with send button (send icon + wave animation on send)
- **Welcome message** — configurable first bot message

**Chat flow:**
1. User types message or clicks prompt pill
2. Message sent to `/api/chat` with chat session ID, tab ID, message content
3. Server embeds user query → vector search across configured knowledge sources → retrieves top-N chunks
4. Chunks + system directive + conversation history sent to Claude API
5. Response streamed back (token-by-token for perceived speed)
6. Referenced knowledge chunks stored for analytics

**Knowledge source selection:** Each chat tab references specific knowledge source IDs. The customer configures which sources power which chat tab. A single chat can pull from multiple sources simultaneously.

### 6.3 Form

Mini form builder within the widget. Components:
- **Optional banner image** (no pull, flush with content)
- **Title + subtitle**
- **Form fields** — ordered list of fields, each with label and type:
  - Text field (single line input)
  - Email field (with validation)
  - Phone number field (with formatting)
  - URL/Link field (with validation)
  - File upload (with upload icon, drag zone, thumbnail preview after upload, file name + size display, delete action). Max 50MB.
- **Submit button** — customizable text, full width
- **Success/error states** — shown after submission

**On submit:** Data sent to `/api/forms/submit`, stored in `form_submissions` table, forwarded to webhook if configured.

### 6.4 Gallery

Image and video grid. Components:
- **Photo grid** — responsive grid of thumbnails (2-3 columns)
- **Play icon overlay** — shown on items with video URLs
- **Lightbox** — clicking a thumbnail opens full-size view with:
  - Large image/video display
  - Caption/tagline below
  - Swipe/arrow navigation between items
  - Close button
- **Gradient fade** — bottom gradient overlay on grid if scrollable

### 6.5 Dynamic Content

Content list powered by manual entries or external data sources. Components:
- **Optional banner image** (with pull/bleed)
- **Title + subtitle**
- **Content rows** — same visual component as TLDR content rows (thumbnail, title, subtitle, link). Difference: these can be populated from Airtable or Webflow CMS via sync.
- **Pagination** — "Load more" or page numbers when items exceed `itemsPerPage`

**Data source sync:** When connected to Airtable or Webflow CMS, a background job syncs items on the configured schedule (manual trigger always available). Max 50 items stored per tab.

### 6.6 3rd Party Embed

Full-height iframe for supported services. Components:
- Single iframe filling the tab content area
- Supported services and URL transformations:

```javascript
function getEmbedUrl(url) {
  // Tally: tally.so/r/{id} → tally.so/embed/{id}?hideTitle=1&transparentBackground=1
  if (url.includes('tally.so/r/')) {
    const formId = url.split('/r/')[1].split('?')[0];
    return `https://tally.so/embed/${formId}?hideTitle=1&transparentBackground=1`;
  }
  // Calendly: URL stays the same
  if (url.includes('calendly.com/')) return url;
  // Typeform: URL stays the same
  if (url.includes('typeform.com/to/')) return url;
  return null;
}
```

### 6.7 Spotify

Simple Spotify playlist embed. Components:
- Full-height iframe with Spotify embed player
- URL transformation: `open.spotify.com/playlist/{id}` → `open.spotify.com/embed/playlist/{id}`

---

## 7. Shared UI Components

These components are reused across multiple tab templates:

### Content Row
Used in: TLDR, Dynamic Content
- Horizontal layout: thumbnail image (square, left) + text block (title + subtitle, right)
- Entire row is clickable
- Consistent padding, typography, hover state

### Tab Hero Banner
Used in: TLDR, Form, Dynamic Content
- Full-width image at top of tab content
- Two variants: "pull" (negative margin for bleed past content area) and "no-pull" (flush)
- Responsive srcset for performance

### Tab Heading Block
Used in: Form, Dynamic Content
- Title (larger, bold) + subtitle (smaller, secondary color)
- Consistent spacing below banner

### Social Icons Row
Used in: TLDR
- Horizontal row of SVG social icons (Facebook, Instagram, YouTube, TikTok)
- Each links to customer-configured URL
- Icons use `currentColor` for easy theme coloring

---

## 8. Authentication System

### Customer Auth (Dashboard Login)

Customers create Glance accounts and log into the dashboard using Supabase Auth with two methods:
- **Google OAuth** — "Continue with Google" on login/signup page
- **Magic Code** — Enter email, receive 6-digit code via email, enter code to verify

On first login, a new user record is created. If they don't belong to any account yet, they're prompted to create one (or accept a pending team invitation). A user can switch between accounts they belong to via an account selector in the dashboard.

### Visitor Auth (Premium Tab Gating)

When a visitor taps a premium tab (one marked `is_premium: true`), the widget replaces the tab content with the **Account tab** — a single authentication card that handles all auth states. The card uses a `account-flow` attribute to track which state is active, showing only one form at a time.

#### Account Tab Layout

The account tab is a widget tab template (type `account`) that renders inside the same content area as any other tab. It contains:
- **Banner image** (no-pull, flush)
- **Heading:** "Premium Content"
- **Subheading:** "Login or create your FREE account to access this content."
- **Auth forms** — only one visible at a time, controlled by `account-flow` state

#### Flow States

**State 1: Default** (`account-flow="default"`)
The initial view. Two paths:
- **"Continue with Google" button** — Triggers Google OAuth popup. On callback, server checks if email exists in visitors table for this widget. If yes → log in. If no → create visitor record. Either way, issue JWT, dismiss account tab, reveal the premium content they originally tapped.
- **Magic Code path** — Divider text: "Or Use Magic Code". Email field + "Send Magic Code" button. On submit, server checks if email exists:
  - **Email exists** → Send 6-digit code, transition to **State 3 (Magic Login)**
  - **Email does not exist** → Send 6-digit code, transition to **State 2 (Magic Create)**

**State 2: Magic Create** (`account-flow="magic-create"`)
For new visitors who don't have an existing account. Shows:
- Heading: "A 6-digit code has been sent to your email"
- Subheading with "Resend now" link
- **Secret Code** field (6-digit input)
- Divider: "Additional Details Needed"
- **First Name** field (required)
- **Last Name** field (required)
- "Create Account" submit button

On submit: verify code, create visitor record with name + email, issue JWT, dismiss account tab, reveal premium content.

**State 3: Magic Login** (`account-flow="magic-login"`)
For returning visitors whose email already exists. Shows:
- Heading: "A 6-digit code has been sent to your email"
- Subheading with "Resend now" link
- **Secret Code** field (6-digit input)
- "Login" submit button

No name fields — we already have their details. On submit: verify code, log in, issue JWT, dismiss account tab, reveal premium content.

#### Flow Diagram

```
Visitor taps premium tab
        ↓
  [Account Tab: Default State]
        ↓                    ↓
  Google OAuth          Enter email + "Send Magic Code"
        ↓                    ↓
  Popup → callback      Server checks email
        ↓                    ↓                ↓
  Email exists?       Email exists         Email NOT found
    Yes → login       → Magic Login        → Magic Create
    No → create         (code only)          (code + name)
        ↓                    ↓                ↓
    Issue JWT           Verify code        Verify code + save name
        ↓                    ↓                ↓
  Dismiss account tab, reveal premium content
```

#### Implementation Notes

- The account tab is **not a tab the customer adds** — it's a system tab that the widget injects when auth is required. It doesn't appear in the tab navigation bar.
- When dismissed after successful auth, the widget switches back to the premium tab the visitor originally tapped.
- The "Resend now" link re-triggers the code send endpoint (rate limited).
- All three form states exist in the DOM but only one is visible at a time (controlled via display/visibility toggle on the `account-flow` attribute).
- 6-digit codes should expire after 10 minutes.
- Rate limit: max 3 code sends per email per 15-minute window.

### Session Persistence
- **Access token:** JWT, short-lived (15 min), stored in memory
- **Refresh token:** longer-lived (30-90 days), stored as httpOnly cookie
- Refresh tokens hashed in database
- On widget load, check for valid refresh token → silent token refresh
- All premium tabs check auth state before rendering content
- If a visitor is already authenticated (valid session), premium tabs render immediately without showing the account tab

### Anonymous Tracking
Before auth, visitors get a random `client_id` stored in localStorage. When they authenticate, the anonymous profile merges into their authenticated visitor record — all prior events and sessions are preserved.

---

## 9. Deep Linking

URL hashes allow direct links to specific widget tabs.

**Format:** `#glance-{custom-hash}` (prefix configurable per widget, default "glance")

**Examples:**
```
website.com#glance-about     → Opens widget to About tab
website.com#glance-chat      → Opens widget to AI Chat tab
website.com#glance-contact   → Opens widget to Contact form tab
```

**Behavior:**
- On page load: check `window.location.hash`, if matches prefix → open widget to that tab
- On hash change: listen for `hashchange` event → switch tab
- On tab switch (user clicks): update hash to reflect current tab
- On widget close: remove hash from URL
- Auth-required tabs: show auth gate if visitor not authenticated, then reveal content after auth

**Customer configuration:** Each tab has an editable `deep_link_hash` field. The `#glance-` prefix is locked; customer edits only the slug portion. Auto-generated from tab name, editable, validated for uniqueness and allowed characters (alphanumeric + dashes).

---

## 10. Knowledge Source System (AI Chat Backend)

### Source Types (V1)

| Type | Input | Ingestion |
|------|-------|-----------|
| Google Doc | OAuth + Doc ID | Fetch content, chunk, embed |
| Google Sheet | OAuth + Sheet ID | Convert rows to text, chunk, embed |
| Airtable Base | API key + Base ID | Fetch all tables, convert to text, chunk, embed |
| Airtable Table | API key + Base ID + Table ID | Fetch table, convert rows to text, chunk, embed |
| Text | Rich text editor in dashboard | Store text, chunk, embed |
| URL | URL to crawl | Fetch, extract readable content (Readability), chunk, embed |

### Ingestion Pipeline

1. Fetch raw content from source
2. Clean and normalize text
3. Chunk into 500-800 token segments with overlap
4. Generate embeddings (OpenAI ada-002 or equivalent)
5. Store chunks + embeddings in `knowledge_chunks` table
6. Update source `sync_status` and `last_synced_at`

### Sync Strategy

- **Manual trigger:** Always available via dashboard button or API
- **Scheduled:** Weekly cron job (configurable per source)
- **Smart sync:** Only re-embed changed records/content when possible (Airtable has modification timestamps)

### RAG Query Flow

```
User message
  → Embed query
  → Vector search across all configured sources (parallel)
  → Retrieve top-N chunks (configurable, default 10)
  → Merge + rank by similarity score
  → Pass to Claude with:
      - System directive (customer-written)
      - Retrieved context chunks
      - Conversation history
  → Stream response back to widget
```

### Knowledge Source Interface

```typescript
interface KnowledgeSource {
  id: string;
  name: string;
  type: SourceType;
  query(embedding: number[], topN: number): Promise<KnowledgeResult[]>;
}

interface KnowledgeResult {
  content: string;
  metadata: Record<string, any>;
  score: number;
  sourceUrl?: string;
}
```

---

## 11. Tracking & Analytics

### Event Types

**Widget events:**
- `widget_open`, `widget_close`
- `tab_view` (+ tab ID, duration)
- `prompt_click` (suggested prompt pill)
- `chat_message_sent`
- `form_submitted`
- `content_row_click`
- `gallery_item_view`

**Page events (background, even when widget minimized):**
- `page_view` (URL, title, referrer)
- `page_exit` (+ time on page)
- `scroll_depth` (optional, percentage)

### Batching

Events are queued in memory and flushed every 30 seconds or on `beforeunload` via `navigator.sendBeacon`:

```javascript
const eventQueue = [];

function trackEvent(type, data) {
  eventQueue.push({ type, data, timestamp: Date.now() });
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 30000);
  }
}

function flushEvents() {
  navigator.sendBeacon('/api/events', JSON.stringify({
    visitor_id: currentVisitorId,
    session_id: sessionId,
    events: eventQueue
  }));
  eventQueue.length = 0;
}

window.addEventListener('beforeunload', flushEvents);
```

### Session Definition

A session is a continuous block of activity. New session created when:
- More than 30 minutes since last event, OR
- New calendar day

### Intent Scoring

- **High 🔥:** Widget opened + viewed contact/pricing tab + >5 min + >3 pages
- **Medium ⚡:** Widget opened + 2-5 min + 2-3 pages
- **Low 👀:** No widget interaction + <2 min + 1 page (bounce)

### Dashboard Display

Sessions are the primary unit in the analytics UI — shown as collapsed cards with timestamp, duration, page count, widget activity (yes/no), entry source, and intent score. Expandable to show chronological event timeline.

---

## 12. Webhook System

### Configuration

Single webhook URL per widget (V1). Customer pastes a Zapier, Make, or custom endpoint URL.

### Payload Format

Flat JSON, sent as POST:

```json
{
  "event": "form_submission",
  "widget_id": "xxx",
  "tab_id": "xxx",
  "submitted_at": "2026-02-05T12:00:00Z",
  "visitor": {
    "email": "founder@startup.com",
    "name": "Jane Doe"
  },
  "data": {
    "full_name": "Jane Doe",
    "email": "founder@startup.com",
    "pitch_deck_url": "https://..."
  }
}
```

### Features

- HTTPS-only URLs (validated on save)
- Test button in dashboard (sends sample payload)
- Status tracking (last triggered, last HTTP status)
- Retry with exponential backoff (V2)
- Activity logs (V2)

---

## 13. Performance & UX Polish

### Loading Strategy

- Widget script: async load, non-blocking
- Config fetch: single GET request, cacheable
- Lazy tab rendering: only render active tab content, not all tabs at once
- Images: lazy loading with placeholder/blur-up

### Bundle Target

Widget JS + CSS: **under 15-20KB gzipped.** No framework dependencies. Tree-shake ruthlessly.

### Animations

All animations CSS-based for GPU acceleration:
- Widget open/close: `transform: translateY()`, 280ms ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`)
- Tab switch: `opacity` crossfade, 180ms ease
- Button hover: `transform: scale(1.02)`, 150ms ease
- Chat messages: `opacity + translateY(8px)`, 200ms ease-out, staggered
- Suggested prompts: fade in on scroll, 300ms ease

### Chat Polish

- Token streaming for perceived speed (response appears word-by-word)
- Typing indicator (animated dots) while waiting for first token
- Smooth auto-scroll as new content streams in
- Input auto-focus when chat tab opens

### Micro-interactions

- Send button: brief pulse animation on click
- Tab nav: active indicator slides (not jumps) between tabs
- Content rows: subtle hover lift with shadow
- Form fields: focus ring using accent color
- Success states: checkmark animation after form submit

---

## 14. Security

- httpOnly cookies for refresh tokens (prevents XSS)
- Refresh tokens hashed in database
- Rate limiting on magic code sends (prevent abuse)
- HTTPS-only webhook URLs
- Validate and sanitize all hash inputs
- Widget config endpoint is public but read-only
- Chat API rate limited per visitor session
- File upload: validate type and size server-side (max 50MB)
- CORS: widget API endpoints allow requests from configured widget domains only

---

## 15. Privacy

- Cookie consent for EU users (widget respects host site's consent)
- Anonymous tracking uses random client IDs (no fingerprinting)
- Merge anonymous → authenticated data on sign-in
- Data export functionality (GDPR)
- Data deletion requests supported
- Tracking disclosure in privacy policy
- Do Not Track header respected (optional)

---

## 16. Cursor Rules (.cursorrules)

```
# Glance Project Conventions

## Code Style
- TypeScript for all dashboard code
- Vanilla JS for widget (no TypeScript in widget bundle to avoid build complexity)
- Functional components with hooks for React (dashboard)
- No default exports except Next.js pages
- Use named exports everywhere else

## Naming
- Files: kebab-case (e.g., knowledge-source.ts)
- Components: PascalCase (e.g., TabConfig.tsx)
- Functions/variables: camelCase
- Database columns: snake_case
- API routes: kebab-case

## File Organization
- One component per file
- Co-locate component-specific styles and types
- Shared types in packages/shared/types.ts

## Widget Specific
- All widget code must work without any npm dependencies at runtime
- Shadow DOM: never use document.querySelector from inside widget — use this.shadowRoot
- All styles injected via <style> tag inside shadow root
- Theme color always referenced as CSS custom property, never hardcoded

## Dashboard Specific
- Use Tailwind utility classes, no custom CSS unless necessary
- Server components by default, client components only when needed
- API routes handle all business logic — no business logic in components

## Database
- All queries through Supabase client library
- Use Row Level Security (RLS) for multi-tenant isolation
- Migrations in supabase/migrations/ with descriptive names

## Testing
- Test widget in isolation on a blank HTML page before testing on real sites
- Test Shadow DOM style isolation explicitly

## Git
- Conventional commits (feat:, fix:, chore:, docs:)
- Feature branches off main
```

---

## 17. Build Sequence (Recommended Order)

### Phase 1: Widget Shell
1. Scaffold monorepo structure
2. Build basic `<glance-widget>` custom element with Shadow DOM
3. Implement button row (launcher) — click opens/closes widget
4. Add tab navigation with tab switching
5. Build one static tab (TLDR) with hardcoded content
6. Theme color system (CSS custom properties)
7. Test on a blank HTML page

### Phase 2: Dashboard Foundation
1. Next.js project setup with Supabase auth (Google OAuth + Magic Code for customers)
2. Database migrations (all tables above)
3. Account creation flow + account selector (for multi-account users)
4. Team member invitations (invite by email, accept flow, role assignment)
5. Widget CRUD (create, list, edit, delete — scoped to active account)
6. Tab CRUD (add tabs, configure, reorder, remove)
7. Widget config API endpoint (public GET for widget.js to fetch)
8. Connect widget to live config (fetches from API instead of hardcoded)

### Phase 3: All Tab Templates
1. TLDR tab (content rows, social links, smart linking)
2. Form tab (field builder, submission storage, success/error states)
3. Gallery tab (grid, lightbox, swipe navigation)
4. Dynamic Content tab (manual items first, pagination)
5. 3rd Party Embed tab (URL transformation, iframe rendering)
6. Spotify tab (URL transformation, iframe)

### Phase 4: Authentication
1. Google OAuth flow (visitor-facing, in widget)
2. Magic code flow (email send, 6-digit verify, create vs login detection)
3. JWT session management (access + refresh tokens)
4. Premium tab gating (auth gate component, hide/show content)
5. Anonymous → authenticated visitor merge

### Phase 5: AI Chat
1. Knowledge source CRUD in dashboard
2. Text-based knowledge source (rich text editor, chunking, embedding)
3. URL crawl knowledge source
4. Google Docs/Sheets knowledge source (OAuth, fetch, chunk, embed)
5. Airtable knowledge source (API key, fetch, chunk, embed)
6. Chat API endpoint (RAG query flow)
7. Chat tab in widget (messages, input, streaming, suggested prompts)
8. System directive configuration

### Phase 6: Tracking & Analytics
1. Event batching in widget
2. Event ingestion API
3. Session creation/management
4. Analytics dashboard (sessions list, visitor profiles, intent scoring)
5. Deep link tracking

### Phase 7: Integrations & Polish
1. Webhook configuration + test button
2. Form submission → webhook forwarding
3. Deep link hash system (full implementation)
4. Dynamic content source sync (Airtable, Webflow CMS)
5. Performance optimization (bundle audit, lazy loading, caching)
6. Animation polish (all micro-interactions from section 13)
