# Glance: Chat & Knowledge Base — Implementation Guide

How Glance imports and stores knowledge, then passes it to the AI chat widget. A full **RAG (Retrieval-Augmented Generation)** implementation reference for replicating this in another project.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Knowledge Source Types & Ingestion](#3-knowledge-source-types--ingestion)
4. [The Write Path — Importing & Storing Knowledge](#4-the-write-path--importing--storing-knowledge)
5. [Chunking Strategies](#5-chunking-strategies)
6. [Embedding Generation](#6-embedding-generation)
7. [Vector Search (pgvector)](#7-vector-search-pgvector)
8. [Linking Knowledge to Chat Tabs](#8-linking-knowledge-to-chat-tabs)
9. [The Read Path — Chat RAG Flow](#9-the-read-path--chat-rag-flow)
10. [Context Formatting for the LLM](#10-context-formatting-for-the-llm)
11. [System Prompt Design](#11-system-prompt-design)
12. [Streaming Responses (SSE)](#12-streaming-responses-sse)
13. [Widget Frontend — Sending & Receiving](#13-widget-frontend--sending--receiving)
14. [Key Files Reference](#14-key-files-reference)
15. [Replication Checklist](#15-replication-checklist)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WRITE PATH (Admin adds knowledge via dashboard)                            │
│                                                                             │
│  Knowledge Page UI ──► POST /api/knowledge ──► Create knowledge_sources row  │
│       │                         │                        │                  │
│       │                         │                        ▼                  │
│       │                         │              Fetch content (Google Doc,     │
│       │                         │              Airtable, website crawl,     │
│       │                         │              or use pasted markdown)       │
│       │                         │                        │                  │
│       │                         │                        ▼                  │
│       │                         │              chunkText() / chunkWebsite   │
│       │                         │              / chunkTabularText           │
│       │                         │                        │                  │
│       │                         │                        ▼                  │
│       │                         │              generateEmbeddings()          │
│       │                         │              → OpenAI text-embedding-3     │
│       │                         │              -small                        │
│       │                         │                        │                  │
│       │                         │                        ▼                  │
│       │                         │              knowledge_chunks rows         │
│       │                         │              (content + embedding vector)   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  LINKING (Admin configures chat tab)                                         │
│                                                                             │
│  Tab Editor (Chat Settings) ──► Select knowledge sources ──► Save            │
│       │                                                                     │
│       ▼                                                                     │
│  widgets.button_style.tabs[tabIndex].knowledge_sources = [uuid, uuid, ...]  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  READ PATH (Visitor chats in widget)                                         │
│                                                                             │
│  Widget ──► POST /api/chat { widgetId, tabIndex, message, history }         │
│                    │                                                        │
│                    ▼                                                        │
│            Load widget + tab config from DB                                  │
│            knowledgeSourceIds = tab.knowledge_sources                        │
│                    │                                                        │
│                    ▼                                                        │
│            Embed user message (OpenAI text-embedding-3-small)                │
│                    │                                                        │
│                    ▼                                                        │
│            match_knowledge_chunks(query_embedding, source_ids)               │
│            → pgvector cosine similarity search                              │
│                    │                                                        │
│                    ▼                                                        │
│            Hybrid re-ranking (70% semantic + 30% keyword)                    │
│                    │                                                        │
│                    ▼                                                        │
│            buildContextFromChunks() → inject into system prompt              │
│                    │                                                        │
│                    ▼                                                        │
│            [system prompt] + [knowledge context] + [history] + [message]    │
│                    │                                                        │
│                    ▼                                                        │
│            OpenAI gpt-4.1-mini (stream: true)                                │
│                    │                                                        │
│                    ▼                                                        │
│            SSE stream ──► Widget renders tokens progressively               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Core principle:** The AI never relies on its training data for domain-specific facts. Every chat query first searches the knowledge base, injects retrieved chunks into the prompt, and the model answers only from that context.

---

## 2. Database Schema

### Tables

#### `knowledge_sources`

Parent record for each knowledge resource. Scoped by `workspace_id` (multi-tenant).

| Column          | Type         | Description |
|-----------------|--------------|-------------|
| id              | uuid         | Primary key |
| workspace_id    | uuid         | FK → workspaces (multi-tenant) |
| name            | text         | Display name (often derived from content) |
| type            | text         | `google_doc`, `google_sheet`, `airtable_table`, `markdown`, `website`, `text` |
| config          | jsonb        | Source-specific: shareLink, baseId, tableId, url, etc. |
| content         | text         | Raw fetched content (for markdown re-sync) |
| comments        | text         | Admin notes / routing hints for the AI |
| sync_status     | text         | `pending`, `syncing`, `synced`, `error` |
| last_synced_at  | timestamptz  | Last successful sync |
| chunk_count     | integer      | Number of chunks |
| created_at      | timestamptz  | |
| updated_at      | timestamptz  | |

**Note:** `website` is used for URL crawling; the DB constraint may list `url` — add a migration if needed:  
`check (type in (..., 'url', 'website'))` or map `website` → `url` in the API.

#### `knowledge_chunks`

Chunked + embedded pieces. This is what vector search queries against.

| Column    | Type          | Description |
|-----------|---------------|-------------|
| id        | uuid          | Primary key |
| source_id | uuid          | FK → knowledge_sources (CASCADE delete) |
| content   | text          | Chunk text (~500–2000 chars) |
| metadata  | jsonb         | chunkIndex, sourceName, sourceType, rowRange, fields, etc. |
| embedding | vector(1536)  | OpenAI text-embedding-3-small |
| created_at| timestamptz   | |

#### Indexes

```sql
create index idx_chunks_source on knowledge_chunks(source_id);
create index idx_chunks_embedding on knowledge_chunks 
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

### Vector Search Function

```sql
create or replace function match_knowledge_chunks(
  query_embedding vector(1536),
  source_ids uuid[],
  match_count int default 10,
  match_threshold float default 0.7
)
returns table (
  id uuid,
  source_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.source_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where kc.source_id = any(source_ids)
    and 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

The `<=>` operator is pgvector’s cosine distance. `1 - (a <=> b)` gives cosine similarity in [0, 1].

### RLS

- `knowledge_sources`: workspace members can SELECT/INSERT; owners/admins can UPDATE/DELETE.
- `knowledge_chunks`: access follows parent `knowledge_sources` via subquery.

---

## 3. Knowledge Source Types & Ingestion

| Type              | Input                   | How Content Is Fetched |
|-------------------|-------------------------|--------------------------|
| **google_doc**    | Share link              | `https://docs.google.com/document/d/{id}/export?format=txt` |
| **google_sheet**  | Share link              | CSV export → convert to readable "Header: Value" rows |
| **airtable_table**| Base ID, Table ID, API key, optional view/fields | Airtable REST API, paginate, format as `[Schema: ...]` + `Record: Name` blocks |
| **markdown**      | Pasted/file content     | Stored directly |
| **website**       | URL                     | Fetch root page, discover same-domain links, crawl up to ~20 pages, extract text with cheerio |

### Google Doc

- Extract doc ID from URL: `/document/d/([a-zA-Z0-9_-]+)/`
- Doc must be shared as "Anyone with the link"
- Export as plain text

### Google Sheet

- Extract sheet ID from URL: `/spreadsheets/d/([a-zA-Z0-9_-]+)/`
- Export as CSV
- Convert to row-per-entry text: `Row N\nHeader: Value\nHeader: Value`

### Airtable Table

- Uses `workspace_airtable_keys` for API keys (one workspace can have multiple keys)
- Paginate with `offset` until no more
- Optional `viewId` and `selectedFields` to limit data
- Format: `[Schema: field1 | field2 | ...]` then `Record: PrimaryValue\nfield: value`
- Handles arrays (e.g. attachments) via `formatAirtableValue()`

### Website Crawl

- Fetch root page with `User-Agent: GlanceBot/1.0`
- Parse links with cheerio; keep same-origin, same-domain only
- Fetch child pages in batches of 5 with 200ms delay
- Remove `script`, `style`, `nav`, `footer`, `iframe`, etc.
- Preserve links as markdown `[text](url)` before text extraction
- Output format: `Page: {title}\nURL: {url}\n\n{content}\n\n---\n\n` per page

### Markdown / Text

- Content stored in `knowledge_sources.content`
- Re-sync re-chunks from stored content (no re-fetch)

---

## 4. The Write Path — Importing & Storing Knowledge

### POST /api/knowledge — Create & Sync

1. **Validate** workspace access (Supabase auth + `workspace_members`).
2. **Validate** request body by type (shareLink, baseId/tableId, content, url, etc.).
3. **Insert** `knowledge_sources` with `sync_status: 'syncing'`.
4. **Fetch** content depending on type (see above).
5. **Chunk** content (prose, tabular, or website-specific).
6. **Generate embeddings** via OpenAI API (batched).
7. **Insert** `knowledge_chunks` (batch of 50, fallback to single-row insert on error).
8. **Update** `knowledge_sources`: `sync_status: 'synced'`, `chunk_count`, `last_synced_at`, `name` (derived from content).

On failure: set `sync_status: 'error'` and return 500.

### PUT /api/knowledge — Re-sync

- Load existing source by id
- Re-fetch content (or use stored `content` for markdown)
- Delete existing chunks for that source
- Re-chunk and re-embed
- Update source record

### DELETE /api/knowledge?id={sourceId}

- Delete chunks (or rely on CASCADE)
- Delete source

### PATCH /api/knowledge — Update metadata

- Update `name` and/or `comments` only (no re-sync)

---

## 5. Chunking Strategies

### Prose (Google Doc, markdown)

- **Target:** ~500 tokens (~2000 chars)
- **Overlap:** ~50 tokens (~200 chars)
- Split on paragraphs (`\n\n`), then sentences (`.!?`).
- Overlap: carry last N chars from previous chunk into next.

```typescript
function chunkProseText(text: string, targetTokens = 500, overlapTokens = 50): string[]
```

### Tabular (Google Sheet, Airtable)

- Split on row/record boundaries (`\n\n`).
- Never split a row/record across chunks.
- Pack full records until target size (~500 tokens, max ~4000 chars per chunk).
- Prepend `[Schema: field1 | field2 | ...]` to each chunk so it’s self-describing.

```typescript
function chunkTabularText(text: string, targetTokens = 500): 
  { text: string; startRow: number; endRow: number }[]
```

### Website

- Content is already page-separated: `Page: ...\nURL: ...\n\n{content}\n\n---\n\n`.
- Chunk each page’s content with `chunkProseText`.
- Prefix each chunk with the page header (`Page: ...\nURL: ...`) so embeddings retain page context.

```typescript
function chunkWebsiteContent(content: string, targetTokens = 500, overlapTokens = 50): string[]
```

### Safety

- Truncate any chunk > 4000 chars before embedding (OpenAI limit 8192 tokens).
- Sanitize text for PostgreSQL: strip null bytes, control chars, lone surrogates.

---

## 6. Embedding Generation

**Model:** `text-embedding-3-small` (1536 dimensions)

### API Call

```typescript
const response = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'text-embedding-3-small',
    input: batch, // string[] — can send multiple texts per request
  }),
})
const embeddings = data.data.map(item => item.embedding)
```

### Batching

- Batch by total chars (~1M per batch) to stay under token limits.
- Rate limit 429: retry with backoff (5s, 10s, …).
- Pause ~3s between batches to avoid TPM limits.

### Storage

- Store as JSON string or pgvector-compatible format.
- Glance uses `JSON.stringify(embedding)` when passing to Supabase RPC; pgvector accepts arrays.

---

## 7. Vector Search (pgvector)

### Calling `match_knowledge_chunks`

```typescript
const { data: chunks } = await supabase.rpc('match_knowledge_chunks', {
  query_embedding: JSON.stringify(queryEmbedding), // number[] → string
  source_ids: knowledgeSourceIds,                   // uuid[]
  match_count: 30,                                  // fetch 3x for re-ranking
  match_threshold: 0.12,                            // low to get more candidates
})
```

### Hybrid Re-ranking

Semantic search returns candidates. Then:

1. **Extract keywords** from the user message (drop stop words, words ≤ 2 chars).
2. **Keyword score** per chunk: match count + occurrence weighting (capped at 3 per term).
3. **Hybrid score:** `0.7 * semantic_similarity + 0.3 * keyword_score`.
4. Sort by hybrid score, take top 20.

This improves results for very specific terms (names, IDs) that may not embed strongly.

---

## 8. Linking Knowledge to Chat Tabs

### Tab configuration

Tabs live inside `widgets.button_style.tabs` (JSONB array). Each tab can include:

```typescript
{
  name: string,
  type: 'AI Chat' | 'TLDR' | ...,
  icon: string,
  hash_trigger: string,
  is_premium: boolean,
  // Chat-specific:
  knowledge_sources: string[],  // UUIDs of knowledge_sources
  directive: string,            // Rich text (TipTap HTML)
  failure_message: string,
  welcome_message: string,
  suggested_prompts: string[],
}
```

### Dashboard flow

1. **Chat tab editor** (`ChatTabEditor.tsx`): lists workspace knowledge sources, user can select which ones this tab uses.
2. **Save** calls `onSave({ knowledge_sources: selectedIds })`.
3. **TabEditor** merges into `tabs[tabIndex]` and updates `widgets.button_style`.
4. `knowledge_sources` are stored as UUID strings in the tab config.

### Chat API resolution

- Chat API loads the widget by `widgetId`, reads `widget.button_style.tabs[tabIndex]`.
- `tab.knowledge_sources` = array of UUIDs.
- If none are valid UUIDs but the array is non-empty, fallback: use all synced sources in the widget’s workspace.

---

## 9. The Read Path — Chat RAG Flow

### POST /api/chat

**Body:** `{ widgetId, tabIndex, message, history = [] }`

**Steps:**

1. Load widget from DB; get `tabs = widget.button_style.tabs`, `tab = tabs[tabIndex]`.
2. Resolve `knowledgeSourceIds` from `tab.knowledge_sources` (with UUID + fallback logic).
3. Build search query: for short messages (< 60 chars) with history, concatenate recent user + assistant messages to improve context.
4. Embed the search query with OpenAI.
5. Call `match_knowledge_chunks` with `source_ids`, `match_count: 30`, `match_threshold: 0.12`.
6. Hybrid re-rank (70% semantic, 30% keyword); keep top 20 chunks.
7. Load source-level `comments` (routing hints) for `knowledgeSourceIds`.
8. Build system prompt (see below).
9. Invoke OpenAI Chat Completions with `stream: true`.
10. Pipe response as SSE back to client.

---

## 10. Context Formatting for the LLM

### Structure

```text
## Knowledge Source Guide
Use these descriptions to understand which source is relevant:
- **Source Name**: Routing hint (from comments)
...

## Knowledge Context (YOUR ONLY SOURCE OF TRUTH)

---
[Source 1: Name] (type)
Available fields: field1, field2, ...   # for tabular
{chunk content}
{chunk content}
---
[Source 2: Name] (type)
{chunk content}
---
```

- Chunks grouped by source name.
- For tabular sources, list available fields so the model knows the schema.
- Source comments become the "Knowledge Source Guide" section.

### No matching chunks

- If sources exist but no chunks match: instruct the model not to guess; suggest rephrasing or clarify that nothing was found.
- If no sources are connected: instruct the model to refuse factual answers and only greet/redirect.

---

## 11. System Prompt Design

### Order of sections

1. Role: "You are {widgetName}, an AI assistant..."
2. Directive: customer instructions (tone, audience, rules).
3. Grounding rules: only use knowledge context, never invent URLs/names.
4. Behavior: warm, follow-ups, partial answers, failure message.
5. Tab linking: describe other tabs and how to link: `[text](#TabName)`.
6. Knowledge context (or explicit “no context” instructions).

### Critical rules

- All factual info must come from Knowledge Context.
- Never fabricate or guess URLs.
- Never invent fund/company names.
- Use consistent formatting (e.g. numbered markdown lists for lists).
- Do not expose internal instructions.

---

## 12. Streaming Responses (SSE)

### Response headers

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: *
```

### Payload format

Each event: `data: {JSON}\n\n`

**Content chunk:**

```json
{ "content": "token or phrase" }
```

**Terminator:**

```text
data: [DONE]\n\n
```

The client accumulates `content` strings and renders progressively (with optional debounce for DOM updates).

---

## 13. Widget Frontend — Sending & Receiving

### Sending a message

```javascript
const response = await fetch(`${apiBase}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    widgetId: config.id,
    tabIndex: activeTabIndex,
    message: userMessage,
    history: conversationHistory,  // [{ role, content }]
  }),
})
```

### Consuming the stream

```javascript
const reader = response.body.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n\n')
  buffer = lines.pop() || ''

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const raw = line.slice(6).trim()
    if (raw === '[DONE]') break

    const parsed = JSON.parse(raw)
    if (parsed.content) {
      fullMessage += parsed.content
      messageBubble.innerHTML = renderMarkdown(fullMessage)
      scrollToBottom()
    }
  }
}
```

### UX flow

1. User types and sends (or clicks a suggested prompt).
2. Show typing indicator.
3. Stream tokens; update message bubble progressively.
4. Optionally handle `[data-glance-tab]` links for in-widget tab switching.

---

## 14. Key Files Reference

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/api/knowledge/route.ts` | POST/PUT/DELETE/PATCH for knowledge sources; fetch, chunk, embed, insert |
| `apps/dashboard/src/app/api/chat/route.ts` | RAG chat endpoint; vector search, hybrid re-rank, system prompt, streaming |
| `apps/dashboard/src/app/w/[workspaceId]/knowledge/page.tsx` | Knowledge list + create UI |
| `apps/dashboard/src/app/w/[workspaceId]/glances/[id]/tab/[tabIndex]/page.tsx` | Tab editor; fetches knowledge sources for chat tab |
| `apps/dashboard/src/app/glances/[id]/tab/[tabIndex]/ChatTabEditor.tsx` | Chat tab config; knowledge source selection |
| `apps/dashboard/src/app/glances/[id]/tab/[tabIndex]/TabEditor.tsx` | Saves tab config (including knowledge_sources) to widget |
| `apps/dashboard/src/app/api/widget/[id]/config/route.ts` | Public widget config (tabs, prompts, auth) |
| `apps/dashboard/public/widget.js` | Embedded widget; chat UI, fetch /api/chat, SSE handling |
| `supabase/migrations/20260206000001_knowledge_tables.sql` | knowledge_sources, knowledge_chunks, match_knowledge_chunks |

### Dependencies

- **OpenAI API:** `text-embedding-3-small`, `gpt-4.1-mini` (or equivalent)
- **pgvector:** PostgreSQL extension for `vector(1536)`
- **cheerio:** HTML parsing for website crawl
- **Supabase:** DB + Auth + RLS

---

## 15. Replication Checklist

To replicate this in another project:

1. **PostgreSQL + pgvector**  
   - `create extension if not exists vector;`

2. **Tables**  
   - `knowledge_sources` (workspace/account-scoped)  
   - `knowledge_chunks` with `embedding vector(1536)`

3. **Search function**  
   - `match_knowledge_chunks(query_embedding, source_ids, match_count, match_threshold)`

4. **Knowledge API**  
   - Create/update/delete sources  
   - Per-type content fetching  
   - Chunking (prose vs tabular vs website)  
   - OpenAI embeddings  
   - Insert chunks with embeddings  

5. **Chat tab config**  
   - Store `knowledge_sources` (UUID array) on each chat tab in your config (e.g. widget JSON).

6. **Chat API**  
   - Embed query (optionally with conversation context)  
   - Vector search over selected sources  
   - Hybrid re-ranking  
   - Build system prompt with knowledge context  
   - Stream OpenAI response as SSE  

7. **Widget**  
   - POST to chat API with `widgetId`, `tabIndex`, `message`, `history`  
   - Parse SSE; accumulate and render tokens

8. **RLS**  
   - Scope `knowledge_sources` and `knowledge_chunks` to workspace/account for multi-tenancy.
