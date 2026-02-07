# Chat & Knowledge Base Integration

How BirdieBot connects its Knowledge Base to its AI Chat widget — a full RAG (Retrieval-Augmented Generation) implementation reference.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Models](#data-models)
3. [The Write Path — Storing Knowledge](#the-write-path--storing-knowledge)
4. [The Read Path — Chat Uses Knowledge](#the-read-path--chat-uses-knowledge)
5. [Embedding Generation](#embedding-generation)
6. [Chunking Strategy](#chunking-strategy)
7. [Semantic + Hybrid Search](#semantic--hybrid-search)
8. [Context Formatting for the AI](#context-formatting-for-the-ai)
9. [System Prompt Design](#system-prompt-design)
10. [OpenAI API Call](#openai-api-call)
11. [Streaming Responses (SSE)](#streaming-responses-sse)
12. [Widget Frontend — Sending & Receiving](#widget-frontend--sending--receiving)
13. [Session Tracking](#session-tracking)
14. [Key Files Reference](#key-files-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  WRITE PATH (Admin adds knowledge)                              │
│                                                                 │
│  Admin UI ──► POST /api/knowledge ──► KnowledgeItem (DB)        │
│                                         │                       │
│                        ┌────────────────┘                       │
│                        ▼                                        │
│                   chunkText()                                   │
│                        │                                        │
│                        ▼                                        │
│              generateEmbeddings()  ──► OpenAI text-embedding    │
│                        │               -3-small                 │
│                        ▼                                        │
│               KnowledgeChunk (DB)  ──► pgvector column          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  READ PATH (User chats)                                         │
│                                                                 │
│  Widget ──► POST /api/widget/chat/stream                        │
│                    │                                            │
│                    ▼                                            │
│            searchKnowledgeBase()                                │
│                    │                                            │
│          ┌─────────┴──────────┐                                 │
│          ▼                    ▼                                  │
│   generateEmbedding()   extractKeywords()                       │
│   (query → vector)      (query → terms)                         │
│          │                    │                                  │
│          └────────┬───────────┘                                  │
│                   ▼                                             │
│        pgvector cosine search  ──►  Hybrid re-ranking           │
│        (0.7 semantic + 0.3 keyword)                             │
│                   │                                             │
│                   ▼                                             │
│        buildContextFromChunks()                                 │
│                   │                                             │
│                   ▼                                             │
│        [system prompt] + [knowledge context] + [history]        │
│                   │                                             │
│                   ▼                                             │
│          OpenAI gpt-4o-mini  (stream: true)                     │
│                   │                                             │
│                   ▼                                             │
│          SSE chunks ──► Widget renders progressively            │
└─────────────────────────────────────────────────────────────────┘
```

The pattern is **RAG** — Retrieval-Augmented Generation. The AI never relies on its own training data for course-specific facts. Instead, every chat query first searches the knowledge base for relevant content, injects that content into the prompt, and the AI answers from it.

---

## Data Models

### KnowledgeItem (`models/KnowledgeItem.js`)

The parent record for each knowledge resource (a document, a URL, or a PDF).

```javascript
{
  id:                INTEGER, PRIMARY KEY,
  userId:            INTEGER, FK → users,
  courseId:          INTEGER, FK → courses,
  name:             STRING,           // "Hours & Rates", "Course Map"
  content:          TEXT,             // Full text content
  usageInstructions: TEXT,            // Tells the AI when to use this resource
  sourceType:       ENUM('manual', 'url', 'pdf'),
  sourceUrl:        STRING,           // Original URL (for re-crawling)
  sourceFileName:   STRING,           // Original PDF filename
  crawlEntireSite:  BOOLEAN,          // Crawl all pages or just one
  lastSyncedAt:     DATE,
  category:         STRING,
  tags:             STRING,           // Comma-separated
  isActive:         BOOLEAN           // Toggle on/off without deleting
}
```

### KnowledgeChunk (`models/KnowledgeChunk.js`)

Chunked + embedded pieces of a KnowledgeItem. This is what semantic search queries against.

```javascript
{
  id:               INTEGER, PRIMARY KEY,
  knowledgeItemId:  INTEGER, FK → knowledge_items (CASCADE delete),
  userId:           INTEGER, FK → users,
  courseId:         INTEGER, FK → courses,
  content:          TEXT,             // ~1200 char chunk of text
  sourceUrl:        STRING,           // Which page this came from (for multi-page crawls)
  chunkIndex:       INTEGER,          // Order within the parent item
  embedding:        vector(1536),     // pgvector column — OpenAI embedding
  tokenCount:       INTEGER           // Estimated token count
}
```

The `embedding` column uses PostgreSQL's **pgvector** extension. The model has custom getter/setter to convert between JS arrays and Postgres vector strings:

```javascript
embedding: {
  type: 'vector(1536)',
  get() {
    const value = this.getDataValue('embedding');
    if (typeof value === 'string') {
      return JSON.parse(value);  // '[0.1,0.2,...]' → [0.1, 0.2, ...]
    }
    return value;
  },
  set(value) {
    if (Array.isArray(value)) {
      this.setDataValue('embedding', `[${value.join(',')}]`);
    }
  }
}
```

### ChatSession (`models/ChatSession.js`)

Tracks a conversation between a visitor and the bot.

```javascript
{
  id:              INTEGER, PRIMARY KEY,
  sessionUuid:     STRING,   // Short format: "02-A3F8K2"
  playerId:        INTEGER,  // FK → waitlist_users (if known)
  courseId:        INTEGER,  // FK → courses
  messageCount:    INTEGER,
  status:          ENUM('active', 'closed'),
  lastActivityAt:  DATE
}
```

### ChatMessage (`models/ChatMessage.js`)

Individual messages within a session.

```javascript
{
  id:             INTEGER, PRIMARY KEY,
  message:        TEXT,
  isFromBot:      BOOLEAN,
  chatSessionId:  INTEGER,  // FK → chat_sessions
  userId:         INTEGER   // Course owner's user ID
}
```

### Relationships

```javascript
KnowledgeItem.hasMany(KnowledgeChunk, {
  foreignKey: 'knowledgeItemId', as: 'chunks', onDelete: 'CASCADE'
});

ChatSession.hasMany(ChatMessage, {
  foreignKey: 'chatSessionId', as: 'messages'
});
```

---

## The Write Path — Storing Knowledge

When an admin creates or updates a knowledge resource, here's what happens:

### 1. Admin saves a resource → `POST /api/knowledge`

```javascript
// routes/knowledge.js
const item = await KnowledgeItem.create({
  userId, courseId, name, content,
  usageInstructions, sourceType, sourceUrl,
  crawlEntireSite, category, tags,
  lastSyncedAt: new Date()
});
```

### 2. URL resources get crawled automatically

```javascript
if (sourceType === 'url' && sourceUrl) {
  // Async — doesn't block the API response
  crawlWebsite(item.id, sourceUrl, crawlEntireSite).catch(err => { ... });
}
```

The crawler fetches up to 20 pages (same-domain only), extracts text from HTML, and tags each page's content with `[Page: URL]` markers:

```
[Page: https://example.com/hours]
Monday-Friday: 6am-8pm...

[Page: https://example.com/rates]
Green fees start at $85...
```

### 3. Content gets chunked and embedded

```javascript
if (sourceType === 'manual' && content) {
  processAndStoreChunks(item.id, content, userId, courseId, 'manual');
}
// For URL items, processAndStoreChunks is called inside crawlWebsite after fetching
```

`processAndStoreChunks()` in `services/embeddings.js`:

```javascript
async function processAndStoreChunks(knowledgeItemId, content, userId, courseId, sourceType) {
  // 1. Delete old chunks
  await KnowledgeChunk.destroy({ where: { knowledgeItemId } });

  // 2. Chunk the content
  let chunks;
  if (sourceType === 'url' && content.includes('[Page:')) {
    chunks = parseAndChunkCrawledContent(content);  // Preserves per-page sourceUrls
  } else {
    chunks = chunkText(content, null);
  }

  // 3. Generate embeddings in batch
  const embeddings = await generateEmbeddings(chunks.map(c => c.content));

  // 4. Insert with raw SQL for pgvector compatibility
  for (let i = 0; i < chunks.length; i++) {
    await sequelize.query(`
      INSERT INTO knowledge_chunks 
      ("knowledgeItemId", "userId", "courseId", content, "sourceUrl",
       "chunkIndex", embedding, "tokenCount", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9, $10)
    `, { bind: [knowledgeItemId, userId, courseId, chunks[i].content,
                chunks[i].sourceUrl, i, vectorString, tokenCount, now, now] });
  }
}
```

---

## The Read Path — Chat Uses Knowledge

When a visitor sends a message in the widget, here's the full sequence:

### 1. Widget sends message → `POST /api/widget/chat/stream`

```javascript
// widget/birdiebot-widget.js
const response = await fetch(`${apiBaseUrl}/api/widget/chat/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    courseId: waitlistState.courseId,
    conversationHistory: [],
    sessionUuid: BirdieBotWidget.state.chatSessionUuid || null
  })
});
```

### 2. Route validates & creates session

```javascript
// routes/widget.js — POST /chat/stream
const { message, courseId, conversationHistory, playerData, sessionUuid } = req.body;

// Validation: message max 2,000 chars, history max 10 messages
// Find or create ChatSession
// Store user's ChatMessage
```

### 3. AI service searches knowledge base

```javascript
// services/aiChat.js — generateStreamingResponse()
const searchResult = await searchKnowledgeBase(userId, course.id, userMessage);
const context = searchResult.context;
```

### 4. Builds the message array for OpenAI

```javascript
const messages = [
  { role: 'system', content: systemPrompt },         // Who you are, rules
  { role: 'system', content: playerContext },          // "User is John Smith" (if known)
  { role: 'system', content: context },               // Knowledge base results
  ...conversationHistory.slice(-5),                    // Last 5 messages
  { role: 'user',   content: userMessage }             // Current question
];
```

### 5. Streams the response back

```javascript
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages,
  temperature: 0.3,
  max_tokens: 500,
  stream: true
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) yield { type: 'chunk', data: content };
}
```

### 6. Stores the bot response

```javascript
await ChatMessage.create({
  message: fullResponse,
  isFromBot: true,
  chatSessionId: chatSession.id
});
```

---

## Embedding Generation

**Model:** `text-embedding-3-small` (1536 dimensions, ~$0.02 per 1M tokens)

### Single embedding

```javascript
// services/embeddings.js
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.trim(),
  });
  return response.data[0].embedding;  // number[] of 1536 floats
}
```

### Batch embeddings (for storing chunks)

```javascript
async function generateEmbeddings(texts) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts.map(t => t.trim()),
  });
  return response.data.map(d => d.embedding);
}
```

### Vector format for PostgreSQL

```javascript
function embeddingToVectorString(embedding) {
  return `[${embedding.join(',')}]`;  // → '[0.0123,0.0456,...]'
}
```

Inserted with `$7::vector` cast so pgvector recognizes the type.

---

## Chunking Strategy

**Configuration:**
- Target chunk size: **1,200 characters**
- Overlap: **150 characters** (for context continuity across chunk boundaries)
- Breaks at **sentence boundaries** (splits on `.!?` followed by whitespace)

### Manual/document content

```javascript
function chunkText(text, sourceUrl = null) {
  let cleanText = text.replace(/\s+/g, ' ').trim();

  if (cleanText.length <= CHUNK_SIZE) {
    return [{ content: cleanText, sourceUrl }];
  }

  const sentences = cleanText.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({ content: currentChunk.trim(), sourceUrl });
      // Overlap: carry last ~150 chars of context into next chunk
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.ceil(CHUNK_OVERLAP / 5));
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
}
```

### URL content with page markers

URL resources that crawl multiple pages produce content like:

```
[Page: https://example.com/hours]
Open 7 days a week...

[Page: https://example.com/rates]
Green fees start at...
```

`parseAndChunkCrawledContent()` splits on `[Page: URL]` markers and chunks each page independently, preserving the `sourceUrl` per chunk for traceability.

---

## Semantic + Hybrid Search

The search uses a two-stage approach: **semantic retrieval** followed by **hybrid re-ranking**.

### Stage 1: Semantic Search (pgvector)

Generates an embedding for the user's query, then uses PostgreSQL's cosine distance operator (`<=>`) to find similar chunks:

```sql
SELECT 
  kc.id, kc."knowledgeItemId", kc.content, kc."sourceUrl",
  ki.name, ki."usageInstructions",
  1 - (kc.embedding <=> $1::vector) as semantic_similarity
FROM knowledge_chunks kc
INNER JOIN knowledge_items ki ON kc."knowledgeItemId" = ki.id
WHERE kc."userId" = $2 
  AND kc."courseId" = $3
  AND ki."isActive" = true
  AND kc.embedding IS NOT NULL
  AND 1 - (kc.embedding <=> $1::vector) > 0.2   -- Minimum similarity threshold
ORDER BY kc.embedding <=> $1::vector
LIMIT $4                                          -- 3x topK for re-ranking pool
```

### Stage 2: Keyword Extraction

Removes stop words from the query, keeps terms > 2 characters:

```javascript
function extractKeywords(query) {
  const stopWords = new Set(['what', 'when', 'where', 'how', ...]);
  return query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}
```

### Stage 3: Hybrid Scoring

Each candidate chunk gets a combined score:

```javascript
const SEMANTIC_WEIGHT = 0.7;
const KEYWORD_WEIGHT = 0.3;

const hybridScore = (SEMANTIC_WEIGHT * semanticScore) + (KEYWORD_WEIGHT * keywordScore);
```

Keyword scoring counts term matches with diminishing returns:

```javascript
function calculateKeywordScore(content, keywords) {
  for (const keyword of keywords) {
    const matches = contentLower.match(new RegExp(`\\b${keyword}\\b`, 'gi'));
    if (matches) {
      matchCount++;
      weightedScore += Math.min(matches.length, 3) / 3;  // Cap at 3 occurrences
    }
  }
  return (keywordRatio * 0.6) + (occurrenceScore * 0.4);
}
```

### Stage 4: Filter & Return

- Sort by hybrid score descending
- Take top K (default 8 chunks)
- Drop results with `hybridScore < 0.20`

---

## Context Formatting for the AI

Search results are grouped by KnowledgeItem and formatted into a labeled text block that gets injected as a system message:

```javascript
function buildContextFromChunks(results) {
  let context = 'KNOWLEDGE BASE INFORMATION:\n\n';

  // Group chunks by parent KnowledgeItem
  const byItem = new Map();
  for (const { chunk, similarity } of results) {
    // Group by knowledgeItemId...
  }

  // Format each source
  for (const [itemId, item] of byItem) {
    context += `[Source 1: ${item.name}]\n`;
    if (item.usageInstructions) {
      context += `USAGE INSTRUCTIONS: ${item.usageInstructions}\n`;
    }
    context += 'CONTENT:\n';
    for (const chunk of item.chunks) {
      if (chunk.sourceUrl) context += `(From: ${chunk.sourceUrl})\n`;
      context += `${chunk.content}\n\n`;
    }
  }
  return context;
}
```

**Example output the AI sees:**

```
KNOWLEDGE BASE INFORMATION:

[Source 1: Hours and Rates]
USAGE INSTRUCTIONS: Use this for questions about pricing, hours, and seasonal rates
CONTENT:
(From: https://example.com/rates)
Nov 3 - Mar 12 (Winter) Mon-Thu: up to $85, Fri-Sun: up to $95
Mar 13 - May 7 (Early) Mon-Thu: $100, Fri-Sun: $130
May 8 - Oct 18 (Peak Season) Mon-Thu: $140, Fri-Sun: $175

[Source 2: Course Layout]
CONTENT:
18-hole championship course, par 72, 6,800 yards from the tips...
```

### Legacy Fallback

If no chunks exist (pre-embeddings data), falls back to keyword search against `KnowledgeItem.content`:

```javascript
const items = await KnowledgeItem.findAll({
  where: { userId, courseId, isActive: true, [Op.or]: searchConditions },
  limit: 10
});
const context = buildContextLegacy(items);  // Truncates to 2,000 chars per item
```

---

## System Prompt Design

The system prompt (`buildSystemPrompt()` in `services/aiChat.js`) establishes strict rules:

**Core rules:**
1. Course-specific info → ONLY from knowledge base (never hallucinate)
2. General golf knowledge → Allowed from training data (rules, terminology, tips)
3. Unknown answers → Direct to pro shop with contact info
4. All responses → Must be HTML formatted (`<p>`, `<strong>`, `<ul>`, `<li>`)

**Dynamic sections:**
- Course name injected: *"You are a helpful assistant for {courseName}"*
- Pro shop phone/email injected for fallback
- Booking URL conditionally included with CTA links
- Waitlist suggestion links (`<a href="#" data-trigger-waitlist="true">`)

**Player personalization:**
If the visitor is a known player (matched by email/phone from waitlist), a separate system message is added:

```javascript
if (playerData?.firstName) {
  playerContext = `KNOWN USER: The user you are chatting with is ${playerData.firstName}...
  Greet them by name naturally when appropriate.`;
}
```

---

## OpenAI API Call

**Model:** `gpt-4o-mini` — fast and cost-effective
**Temperature:** `0.3` — low for consistent, factual responses
**Max tokens:** `500` — keeps responses concise

```javascript
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: messages,
  temperature: 0.3,
  max_tokens: 500,
  stream: true
});
```

**Full message array order:**

| # | Role | Content |
|---|------|---------|
| 1 | system | System prompt (role, rules, formatting) |
| 2 | system | Player context (if known user) |
| 3 | system | Knowledge base context (search results) |
| 4-8 | user/assistant | Last 5 conversation messages |
| 9 | user | Current message |

---

## Streaming Responses (SSE)

The backend uses **Server-Sent Events** to stream the response token-by-token:

### Backend (route)

```javascript
// Set SSE headers
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

// Send session info immediately
res.write(`data: ${JSON.stringify({ type: 'course', data: { name: course.name, sessionUuid } })}\n\n`);

// Stream AI response chunks
for await (const chunk of responseStream) {
  if (chunk.type === 'chunk') {
    fullResponse += chunk.data;
    res.write(`data: ${JSON.stringify({ type: 'chunk', data: chunk.data })}\n\n`);
  } else if (chunk.type === 'metadata') {
    res.write(`data: ${JSON.stringify({ type: 'metadata', data: chunk.data })}\n\n`);
  }
}

// Signal completion
res.write('data: [DONE]\n\n');
res.end();
```

### SSE message types

| Type | When | Payload |
|------|------|---------|
| `course` | Immediately | `{ name, sessionUuid }` |
| `chunk` | Per token | The text fragment |
| `metadata` | After last token | `{ success, sourcesUsed, tokensUsed }` |
| `error` | On failure | `{ message }` |
| `[DONE]` | Connection close | n/a |

---

## Widget Frontend — Sending & Receiving

### Sending a message

```javascript
// widget/birdiebot-widget.js
async function getAIResponse(userMessage) {
  const response = await fetch(`${apiBaseUrl}/api/widget/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      courseId: waitlistState.courseId,
      conversationHistory: [],
      sessionUuid: BirdieBotWidget.state.chatSessionUuid || null
    })
  });

  // Process SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullMessage = '';
  let messageBubble = null;
  // ...
}
```

### Parsing SSE chunks

```javascript
while (true) {
  const { value, done } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.replace('data: ', '').trim();
    if (data === '[DONE]') break;

    const parsed = JSON.parse(data);

    // Capture session UUID for subsequent messages
    if (parsed.type === 'course' && parsed.data?.sessionUuid) {
      BirdieBotWidget.state.chatSessionUuid = parsed.data.sessionUuid;
    }

    // Render text tokens progressively
    if (parsed.type === 'chunk') {
      if (!messageBubble) {
        // Create the response bubble in the DOM
      }
      fullMessage += parsed.data?.content || parsed.data || '';
      messageBubble.querySelector('div').innerHTML = fullMessage;
      scrollChatToBottom();
    }
  }
}
```

### UX flow

1. User types message → send button triggers `getAIResponse()`
2. Typing indicator appears (animated dots)
3. SSE connection opens → typing indicator removed
4. First `course` event → session UUID captured
5. `chunk` events arrive → message bubble created, HTML updated progressively
6. `[DONE]` → connection closes, chat auto-scrolls

---

## Session Tracking

Sessions use short IDs in the format `{courseId}-{6chars}` (e.g., `02-A3F8K2`):

```javascript
function generateSessionId(courseId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${String(courseId).padStart(2, '0')}-${result}`;
}
```

- Session UUID is sent to the widget with the first SSE event
- Widget stores it in `BirdieBotWidget.state.chatSessionUuid`
- Subsequent messages include it so they're linked to the same session
- If a known player (matched by email/phone from waitlist), `playerId` is attached to the session

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `models/KnowledgeItem.js` | Knowledge resource model (parent) |
| `models/KnowledgeChunk.js` | Chunked + embedded pieces (pgvector) |
| `models/ChatSession.js` | Conversation session tracking |
| `models/ChatMessage.js` | Individual chat messages |
| `models/index.js` | Model relationships |
| `services/embeddings.js` | Chunking, embedding generation, semantic search |
| `services/aiChat.js` | Knowledge search, prompt building, OpenAI calls |
| `routes/knowledge.js` | CRUD API for knowledge items + web crawling |
| `routes/widget.js` | Chat endpoints (streaming + non-streaming) |
| `widget/birdiebot-widget.js` | Frontend widget — sends messages, renders SSE |
| `package.json` | OpenAI dependency (`openai: ^6.8.1`) |

### Dependencies

```json
"openai": "^6.8.1"
```

PostgreSQL with the **pgvector** extension enabled:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Replication Checklist

To build this in another app:

1. **PostgreSQL + pgvector** — Enable the vector extension
2. **Models** — Create KnowledgeItem (parent) and KnowledgeChunk (with `vector(1536)` column)
3. **Embeddings service** — Chunk text, generate embeddings via OpenAI, store with raw SQL `$1::vector`
4. **Search service** — Semantic search with `<=>` operator + keyword re-ranking
5. **AI chat service** — System prompt + knowledge context + history → OpenAI chat completion
6. **SSE streaming** — `text/event-stream` headers, `data: JSON\n\n` format, `[DONE]` terminator
7. **Frontend** — `fetch()` with `ReadableStream` reader, parse SSE, render progressively
8. **Session tracking** — Short session IDs, store messages for history
