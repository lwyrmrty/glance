import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// ============================================
// HELPERS
// ============================================

/** Extract Google Doc ID from a share link */
function extractGoogleDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/** Fetch plain text content from a publicly shared Google Doc */
async function fetchGoogleDocContent(docId: string): Promise<string> {
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`
  const response = await fetch(exportUrl)

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Google Doc (${response.status}). Make sure the doc is shared with "Anyone with the link".`
    )
  }

  return response.text()
}

/** Extract Google Sheet ID from a share link */
function extractGoogleSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/** Fetch CSV content from a publicly shared Google Sheet and convert to readable text */
async function fetchGoogleSheetContent(sheetId: string): Promise<string> {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
  const response = await fetch(exportUrl)

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Google Sheet (${response.status}). Make sure the sheet is shared with "Anyone with the link".`
    )
  }

  const csv = await response.text()
  return csvToReadableText(csv)
}

/** Convert CSV text into a readable row-per-entry format for better chunking/embedding */
function csvToReadableText(csv: string): string {
  const lines = csv.split('\n').filter(line => line.trim().length > 0)
  if (lines.length === 0) return ''

  // Parse CSV rows (handles quoted fields with commas)
  function parseCSVRow(row: string): string[] {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < row.length; i++) {
      const char = row[i]
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    fields.push(current.trim())
    return fields
  }

  const headers = parseCSVRow(lines[0])
  const rows = lines.slice(1).map(line => parseCSVRow(line))

  // Convert each row into "Header: Value" format for better semantic meaning
  return rows.map((row, i) => {
    const pairs = headers
      .map((header, j) => {
        const value = row[j] || ''
        return value ? `${header}: ${value}` : null
      })
      .filter(Boolean)
    return `Row ${i + 1}\n${pairs.join('\n')}`
  }).join('\n\n')
}

/** Fetch all records from an Airtable table and convert to readable text */
async function fetchAirtableContent(baseId: string, tableId: string, apiKey: string): Promise<string> {
  const allRecords: Record<string, unknown>[] = []
  let offset: string | undefined

  // Paginate through all records
  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`)
    if (offset) url.searchParams.set('offset', offset)

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Airtable records (${response.status}). Check that your API key has access to this base/table.`
      )
    }

    const data = await response.json()
    allRecords.push(...(data.records || []))
    offset = data.offset
  } while (offset)

  if (allRecords.length === 0) {
    throw new Error('Airtable table appears to be empty')
  }

  // Convert records into a readable text format similar to Google Sheets
  // Collect all field names across records
  const fieldNames = new Set<string>()
  for (const record of allRecords) {
    const fields = (record as { fields: Record<string, unknown> }).fields || {}
    for (const key of Object.keys(fields)) {
      fieldNames.add(key)
    }
  }
  const headers = Array.from(fieldNames)

  return allRecords.map((record, i) => {
    const fields = (record as { fields: Record<string, unknown> }).fields || {}
    const pairs = headers
      .map(header => {
        const value = fields[header]
        if (value === null || value === undefined || value === '') return null
        // Handle arrays (linked records, attachments, etc.)
        const displayValue = Array.isArray(value) ? value.join(', ') : String(value)
        return `${header}: ${displayValue}`
      })
      .filter(Boolean)
    return `Row ${i + 1}\n${pairs.join('\n')}`
  }).join('\n\n')
}

/**
 * Crawl a website: fetch root page, discover child links, fetch each child,
 * extract clean text content, return combined content string.
 */
async function fetchWebsiteContent(rootUrl: string): Promise<string> {
  const parsedRoot = new URL(rootUrl)
  const origin = parsedRoot.origin

  console.log(`[Glance] Crawling website: ${rootUrl}`)

  // Step 1: Fetch the root page
  const rootRes = await fetch(rootUrl, {
    headers: { 'User-Agent': 'GlanceBot/1.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!rootRes.ok) {
    throw new Error(`Failed to fetch root URL (${rootRes.status}): ${rootUrl}`)
  }
  const rootHtml = await rootRes.text()

  // Step 2: Discover child page links on the same domain
  const $root = cheerio.load(rootHtml)
  const discoveredUrls = new Set<string>()

  $root('a[href]').each((_, el) => {
    const href = $root(el).attr('href')
    if (!href) return
    try {
      const resolved = new URL(href, origin)
      // Same origin, not the root page itself, not anchors/hashes
      if (
        resolved.origin === origin &&
        resolved.pathname !== parsedRoot.pathname &&
        !resolved.hash &&
        !href.startsWith('#') &&
        !href.startsWith('mailto:') &&
        !href.startsWith('javascript:')
      ) {
        // Strip trailing slash for dedup
        const clean = resolved.origin + resolved.pathname.replace(/\/$/, '')
        discoveredUrls.add(clean)
      }
    } catch {
      // Invalid URL — skip
    }
  })

  const childUrls = Array.from(discoveredUrls)
  console.log(`[Glance] Discovered ${childUrls.length} child pages from ${rootUrl}`)

  // Step 3: Fetch each child page and extract text
  const pages: { title: string; url: string; content: string }[] = []
  const CONCURRENCY = 5
  const DELAY_MS = 200

  for (let i = 0; i < childUrls.length; i += CONCURRENCY) {
    const batch = childUrls.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'GlanceBot/1.0' },
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) return null
        const html = await res.text()
        return { url, html }
      })
    )

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) continue
      const { url, html } = result.value

      const $ = cheerio.load(html)

      // Remove non-content elements
      $('script, style, nav, footer, header, noscript, iframe, svg, img').remove()
      // Also remove common Webflow/marketing elements
      $('[class*="navbar"], [class*="footer"], [class*="cookie"], [class*="popup"], [class*="modal"], [class*="banner"]').remove()

      // Extract title
      const title = $('h1').first().text().trim() ||
                    $('title').first().text().trim().split(' — ')[0].split(' | ')[0] ||
                    url.split('/').pop() || 'Untitled'

      // Insert separators between block-level and table elements so text
      // extraction doesn't mash everything together (e.g., table cells)
      $('tr').each((_, el) => { $(el).append('\n') })
      $('td, th').each((_, el) => { $(el).append(' | ') })
      $('div, p, h1, h2, h3, h4, h5, h6, li, br, section, article').each((_, el) => { $(el).append('\n') })

      // Extract main content text
      const bodyText = $('body').text()
        .replace(/[ \t]+/g, ' ')       // collapse horizontal whitespace (keep newlines)
        .replace(/ *\n */g, '\n')      // clean up spaces around newlines
        .replace(/\n{3,}/g, '\n\n')    // max 2 consecutive newlines
        .trim()

      if (bodyText.length < 50) continue // Skip nearly empty pages

      pages.push({ title, url, content: bodyText })
    }

    // Brief pause between batches
    if (i + CONCURRENCY < childUrls.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
    console.log(`[Glance] Fetched ${Math.min(i + CONCURRENCY, childUrls.length)}/${childUrls.length} pages`)
  }

  console.log(`[Glance] Extracted content from ${pages.length} pages`)

  // Step 4: Combine all pages into a single content string
  // Each page is separated and prefixed with title + URL for RAG context
  const combined = pages.map(p =>
    `Page: ${p.title}\nURL: ${p.url}\n\n${p.content}`
  ).join('\n\n---\n\n')

  return combined
}

/**
 * Chunk website content per-page, preserving page context in every chunk.
 * Each chunk is prefixed with the page title so the embedding knows
 * what topic the chunk belongs to (e.g., "Robotic funds").
 */
function chunkWebsiteContent(content: string, targetTokens = 500, overlapTokens = 50): string[] {
  // Split back into individual pages by our separator
  const pageBlocks = content.split('\n\n---\n\n')
  const allChunks: string[] = []

  for (const block of pageBlocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    // Extract the page header (title + URL)
    const lines = trimmed.split('\n')
    let pageHeader = ''
    let pageContent = trimmed

    if (lines[0]?.startsWith('Page: ')) {
      const titleLine = lines[0]
      const urlLine = lines[1]?.startsWith('URL: ') ? lines[1] : ''
      pageHeader = [titleLine, urlLine].filter(Boolean).join('\n')
      // Content starts after the header + blank line
      const headerEnd = trimmed.indexOf('\n\n')
      pageContent = headerEnd > 0 ? trimmed.slice(headerEnd + 2) : trimmed
    }

    // Chunk this page's content
    const pageChunks = chunkProseText(pageContent, targetTokens, overlapTokens)

    // Prefix each chunk with the page header so embeddings retain context
    for (const chunk of pageChunks) {
      if (pageHeader) {
        allChunks.push(`${pageHeader}\n\n${chunk}`)
      } else {
        allChunks.push(chunk)
      }
    }
  }

  return allChunks
}

/** 
 * Chunk prose text into segments of approximately targetTokens size.
 * Uses ~4 chars per token as a rough estimate.
 * Splits on paragraph boundaries (double or single newlines), then
 * falls back to sentence boundaries for large blocks.
 */
function chunkProseText(text: string, targetTokens = 500, overlapTokens = 50): string[] {
  const targetChars = targetTokens * 4
  const overlapChars = overlapTokens * 4

  // Split into paragraphs — try double newlines first, fall back to single newlines
  let paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)

  // If we got very few paragraphs, the doc probably uses single newlines
  if (paragraphs.length <= 2 && text.length > targetChars) {
    paragraphs = text.split(/\n/).filter(p => p.trim().length > 0)
  }

  // If paragraphs are still too large, split them on sentence boundaries
  const segments: string[] = []
  for (const para of paragraphs) {
    if (para.length <= targetChars) {
      segments.push(para)
    } else {
      // Split on sentence endings (.!?) followed by a space or newline
      const sentences = para.match(/[^.!?]*[.!?]+[\s]*/g) || [para]
      for (const sentence of sentences) {
        segments.push(sentence.trim())
      }
    }
  }

  const chunks: string[] = []
  let currentChunk = ''

  for (const segment of segments) {
    if (currentChunk.length > 0 && currentChunk.length + segment.length > targetChars) {
      chunks.push(currentChunk.trim())
      // Start new chunk with overlap from end of previous
      const overlapText = currentChunk.slice(-overlapChars)
      currentChunk = overlapText + '\n\n' + segment
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + segment : segment
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * Chunk tabular text (Google Sheets / Airtable) on row boundaries.
 * Each "row" block starts with "Row N\n" and is separated by \n\n.
 * Rows are never split across chunks — we pack as many full rows
 * as will fit within the target token budget.
 * Returns { text, startRow, endRow }[] for rich metadata.
 */
function chunkTabularText(text: string, targetTokens = 500): { text: string; startRow: number; endRow: number }[] {
  const targetChars = targetTokens * 4
  // Hard cap per chunk: stay safely under the embedding model's 8192 token limit
  // Using very conservative ratio for data with URLs, numbers, special chars
  const maxCharsPerChunk = 8000 // ~4000-6000 tokens depending on content

  // Split into individual row blocks (each starts with "Row N\n...")
  const rowBlocks = text.split(/\n\n/).filter(b => b.trim().length > 0)

  const chunks: { text: string; startRow: number; endRow: number }[] = []
  let currentChunk = ''
  let chunkStartRow = 1
  let currentRow = 0

  for (let block of rowBlocks) {
    // Extract row number from block
    const rowMatch = block.match(/^Row (\d+)/)
    const rowNum = rowMatch ? parseInt(rowMatch[1], 10) : currentRow + 1
    currentRow = rowNum

    // Truncate oversized individual row blocks to stay under embedding limit
    if (block.length > maxCharsPerChunk) {
      block = block.slice(0, maxCharsPerChunk) + '\n[truncated]'
    }

    if (currentChunk.length === 0) {
      chunkStartRow = rowNum
      currentChunk = block
    } else if (currentChunk.length + block.length + 2 > targetChars) {
      // Current chunk is full — push it and start a new one
      chunks.push({
        text: currentChunk.trim(),
        startRow: chunkStartRow,
        endRow: rowNum - 1,
      })
      chunkStartRow = rowNum
      currentChunk = block
    } else {
      currentChunk = currentChunk + '\n\n' + block
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      startRow: chunkStartRow,
      endRow: currentRow,
    })
  }

  return chunks
}

/** Determine if a source type uses tabular data */
function isTabularType(type: string): boolean {
  return type === 'google_sheet' || type === 'airtable_table'
}

/** Generate embeddings for an array of text chunks using OpenAI (batched) */
async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  // Batch chunks to stay under the 300k token limit per request.
  // Rough estimate: 1 token ≈ 4 chars. Use 250k token budget (~1M chars) per batch for safety.
  const MAX_CHARS_PER_BATCH = 1_000_000
  const batches: string[][] = []
  let currentBatch: string[] = []
  let currentBatchChars = 0

  for (const chunk of chunks) {
    if (currentBatch.length > 0 && currentBatchChars + chunk.length > MAX_CHARS_PER_BATCH) {
      batches.push(currentBatch)
      currentBatch = []
      currentBatchChars = 0
    }
    currentBatch.push(chunk)
    currentBatchChars += chunk.length
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch)
  }

  console.log(`[Glance] Embedding ${chunks.length} chunks in ${batches.length} batch(es)`)

  const allEmbeddings: number[][] = []

  // Safety: truncate any individual chunk that exceeds the model's 8192 token context
  const MAX_CHARS_PER_CHUNK = 8000 // conservative for dense-token content

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i].map(chunk =>
      chunk.length > MAX_CHARS_PER_CHUNK ? chunk.slice(0, MAX_CHARS_PER_CHUNK) : chunk
    )
    console.log(`[Glance] Embedding batch ${i + 1}/${batches.length} (${batch.length} chunks)`)

    // Retry with backoff for rate limits
    let attempts = 0
    const maxAttempts = 5
    let response: Response | null = null

    while (attempts < maxAttempts) {
      response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: batch,
        }),
      })

      if (response.status === 429) {
        attempts++
        const waitSec = Math.min(attempts * 5, 30) // 5s, 10s, 15s, 20s, 25s
        console.log(`[Glance] Rate limited, waiting ${waitSec}s before retry ${attempts}/${maxAttempts}`)
        await new Promise(resolve => setTimeout(resolve, waitSec * 1000))
        continue
      }
      break
    }

    if (!response || !response.ok) {
      const error = response ? await response.text() : 'No response'
      throw new Error(`OpenAI embeddings API error (${response?.status}): ${error}`)
    }

    const data = await response.json()
    const embeddings = data.data.map((item: { embedding: number[] }) => item.embedding)
    allEmbeddings.push(...embeddings)

    // Brief pause between batches to avoid hitting TPM rate limit
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  return allEmbeddings
}

/** Derive a name from the first line of content */
function deriveNameFromContent(content: string, type: string, meta?: { baseName?: string; tableName?: string; url?: string }): string {
  if (type === 'website') {
    // Use the domain name as the source name
    try {
      const hostname = new URL(meta?.url || '').hostname.replace(/^www\./, '')
      return hostname.slice(0, 100)
    } catch {
      return 'Website Crawl'
    }
  }

  if (type === 'airtable_table') {
    // Use base name + table name if available
    if (meta?.baseName && meta?.tableName) {
      return `${meta.baseName} — ${meta.tableName}`.slice(0, 100)
    }
    if (meta?.tableName) return meta.tableName.slice(0, 100)
  }

  if (type === 'google_sheet' || type === 'airtable_table') {
    // For tabular data, skip "Row N" lines and look for column headers
    const lines = content.split('\n').filter(line => line.trim().length > 0 && !line.match(/^Row \d+$/))
    const headerNames: string[] = []
    for (const line of lines) {
      const match = line.match(/^(.+?):\s/)
      if (match && !headerNames.includes(match[1])) {
        headerNames.push(match[1])
      }
      if (headerNames.length >= 3) break
    }
    if (headerNames.length > 0) {
      return headerNames.join(', ').slice(0, 100)
    }
    return type === 'airtable_table' ? 'Untitled Table' : 'Untitled Sheet'
  }

  const firstLine = content.split('\n').find(line => line.trim().length > 0)
  if (!firstLine) return 'Untitled Document'
  // Strip leading markdown heading markers (# ## ### etc.)
  const name = firstLine.trim().replace(/^#+\s*/, '').slice(0, 100)
  return name || 'Untitled Document'
}

// ============================================
// POST /api/knowledge — Create & sync a knowledge source
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's account
    const { data: membership } = await supabase
      .from('account_memberships')
      .select('account_id')
      .eq('user_id', authData.claims.sub)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No account found' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { type, shareLink, baseId, baseName, tableId, tableName, content: mdContent, fileName: mdFileName, url: websiteUrl } = body

    // Validate based on type
    if (type === 'google_doc' || type === 'google_sheet') {
      if (!shareLink) {
        return NextResponse.json(
          { error: 'Missing required field: shareLink' },
          { status: 400 }
        )
      }
    } else if (type === 'airtable_table') {
      if (!baseId || !tableId) {
        return NextResponse.json(
          { error: 'Missing required fields: baseId, tableId' },
          { status: 400 }
        )
      }
    } else if (type === 'markdown') {
      if (!mdContent || typeof mdContent !== 'string' || !mdContent.trim()) {
        return NextResponse.json(
          { error: 'Missing required field: content (file content must be a non-empty string)' },
          { status: 400 }
        )
      }
    } else if (type === 'website') {
      if (!websiteUrl || typeof websiteUrl !== 'string' || !websiteUrl.trim()) {
        return NextResponse.json(
          { error: 'Missing required field: url' },
          { status: 400 }
        )
      }
    } else if (!type) {
      return NextResponse.json(
        { error: 'Missing required field: type' },
        { status: 400 }
      )
    }

    // Validate and extract ID based on type
    let resourceId: string | null = null
    let config: Record<string, unknown> = {}

    if (type === 'google_doc') {
      resourceId = extractGoogleDocId(shareLink)
      if (!resourceId) {
        return NextResponse.json(
          { error: 'Invalid Google Doc URL. Expected format: https://docs.google.com/document/d/...' },
          { status: 400 }
        )
      }
      config = { shareLink, resourceId }
    } else if (type === 'google_sheet') {
      resourceId = extractGoogleSheetId(shareLink)
      if (!resourceId) {
        return NextResponse.json(
          { error: 'Invalid Google Sheet URL. Expected format: https://docs.google.com/spreadsheets/d/...' },
          { status: 400 }
        )
      }
      config = { shareLink, resourceId }
    } else if (type === 'airtable_table') {
      config = { baseId, baseName, tableId, tableName }
    } else if (type === 'markdown') {
      config = { fileName: mdFileName || 'document.md' }
    } else if (type === 'website') {
      config = { url: websiteUrl.trim() }
    } else {
      return NextResponse.json(
        { error: `Source type "${type}" is not yet supported` },
        { status: 400 }
      )
    }

    // Create the knowledge source record (syncing state)
    const { data: source, error: insertError } = await supabase
      .from('knowledge_sources')
      .insert({
        account_id: membership.account_id,
        name: 'Syncing...',
        type,
        config,
        sync_status: 'syncing',
      })
      .select()
      .single()

    if (insertError || !source) {
      console.error('Error creating knowledge source:', insertError)
      return NextResponse.json(
        { error: 'Failed to create knowledge source' },
        { status: 500 }
      )
    }

    // Synchronous sync flow
    try {
      // Fetch content based on type
      let content: string

      if (type === 'google_doc') {
        content = await fetchGoogleDocContent(resourceId!)
      } else if (type === 'google_sheet') {
        content = await fetchGoogleSheetContent(resourceId!)
      } else if (type === 'airtable_table') {
        // Fetch the Airtable API key from the account
        const { data: account } = await supabase
          .from('accounts')
          .select('airtable_api_key')
          .eq('id', membership.account_id)
          .single()

        if (!account?.airtable_api_key) {
          throw new Error('Airtable is not connected. Add your API key in Integrations.')
        }

        content = await fetchAirtableContent(baseId, tableId, account.airtable_api_key)
      } else if (type === 'markdown') {
        content = mdContent
      } else if (type === 'website') {
        content = await fetchWebsiteContent(websiteUrl.trim())
      } else {
        throw new Error(`Source type "${type}" is not supported`)
      }

      if (!content || content.trim().length === 0) {
        throw new Error('Document appears to be empty')
      }

      // Derive name from content
      const name = deriveNameFromContent(content, type, { baseName, tableName, url: websiteUrl })

      // Chunk the content — use row-aware chunking for tabular data
      let chunkRows: { source_id: string; content: string; metadata: Record<string, unknown>; embedding: string }[]
      let chunkCount: number

      if (isTabularType(type)) {
        const tabularChunks = chunkTabularText(content)
        const embeddings = await generateEmbeddings(tabularChunks.map(c => c.text))
        chunkCount = tabularChunks.length

        chunkRows = tabularChunks.map((chunk, index) => ({
          source_id: source.id,
          content: chunk.text,
          metadata: {
            chunkIndex: index,
            totalChunks: tabularChunks.length,
            sourceName: name,
            sourceType: type,
            rowRange: `rows ${chunk.startRow}–${chunk.endRow}`,
            startRow: chunk.startRow,
            endRow: chunk.endRow,
          },
          embedding: JSON.stringify(embeddings[index]),
        }))
      } else {
        const proseChunks = type === 'website' ? chunkWebsiteContent(content) : chunkProseText(content)
        const embeddings = await generateEmbeddings(proseChunks)
        chunkCount = proseChunks.length

        chunkRows = proseChunks.map((chunkContent, index) => ({
          source_id: source.id,
          content: chunkContent,
          metadata: {
            chunkIndex: index,
            totalChunks: proseChunks.length,
            sourceName: name,
            sourceType: type,
          },
          embedding: JSON.stringify(embeddings[index]),
        }))
      }

      const { error: chunksError } = await supabase
        .from('knowledge_chunks')
        .insert(chunkRows)

      if (chunksError) {
        throw new Error(`Failed to insert chunks: ${chunksError.message}`)
      }

      // Update source with synced status
      const { data: updatedSource, error: updateError } = await supabase
        .from('knowledge_sources')
        .update({
          name,
          content: content.slice(0, 500000),
          sync_status: 'synced',
          chunk_count: chunkCount,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', source.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update source status: ${updateError.message}`)
      }

      return NextResponse.json({
        source: updatedSource,
        chunkCount,
      })
    } catch (syncError) {
      // If sync fails, update source to error state
      console.error('Sync error:', syncError)
      await supabase
        .from('knowledge_sources')
        .update({
          sync_status: 'error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', source.id)

      return NextResponse.json(
        { error: syncError instanceof Error ? syncError.message : 'Sync failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Knowledge API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/knowledge — Delete a knowledge source and its chunks
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('id')

    if (!sourceId) {
      return NextResponse.json({ error: 'Missing source id' }, { status: 400 })
    }

    // Delete chunks first (cascade should handle this, but being explicit)
    await supabase
      .from('knowledge_chunks')
      .delete()
      .eq('source_id', sourceId)

    // Delete the source (RLS ensures user can only delete their own)
    const { error: deleteError } = await supabase
      .from('knowledge_sources')
      .delete()
      .eq('id', sourceId)

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Knowledge DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT /api/knowledge — Re-sync an existing knowledge source
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing source id' }, { status: 400 })
    }

    // Fetch the existing source (RLS ensures ownership)
    const { data: source, error: fetchError } = await supabase
      .from('knowledge_sources')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    const { type, config } = source
    const typedConfig = config as Record<string, string>
    const resourceId = typedConfig?.resourceId || typedConfig?.docId

    // For Google types, need resourceId. For Airtable, need baseId + tableId. For URL, need url.
    if ((type === 'google_doc' || type === 'google_sheet') && !resourceId) {
      return NextResponse.json({ error: 'Source has no linked resource ID' }, { status: 400 })
    }
    if (type === 'airtable_table' && (!typedConfig?.baseId || !typedConfig?.tableId)) {
      return NextResponse.json({ error: 'Source has no linked Airtable base/table' }, { status: 400 })
    }

    // Mark as syncing
    await supabase
      .from('knowledge_sources')
      .update({ sync_status: 'syncing', updated_at: new Date().toISOString() })
      .eq('id', id)

    try {
      // Fetch fresh content
      let content: string

      if (type === 'google_doc') {
        content = await fetchGoogleDocContent(resourceId!)
      } else if (type === 'google_sheet') {
        content = await fetchGoogleSheetContent(resourceId!)
      } else if (type === 'airtable_table') {
        // Get the API key from the account
        const { data: membership } = await supabase
          .from('account_memberships')
          .select('account_id')
          .eq('user_id', (await supabase.auth.getClaims()).data?.claims?.sub)
          .single()

        const { data: account } = await supabase
          .from('accounts')
          .select('airtable_api_key')
          .eq('id', membership?.account_id)
          .single()

        if (!account?.airtable_api_key) {
          throw new Error('Airtable is not connected. Add your API key in Integrations.')
        }

        content = await fetchAirtableContent(typedConfig.baseId, typedConfig.tableId, account.airtable_api_key)
      } else if (type === 'markdown') {
        // Markdown content is stored directly — re-chunk from stored content
        content = source.content
        if (!content) {
          throw new Error('No stored content found for this markdown source')
        }
      } else if (type === 'website') {
        if (!typedConfig?.url) {
          throw new Error('Source has no stored URL')
        }
        content = await fetchWebsiteContent(typedConfig.url)
      } else {
        throw new Error(`Re-sync not supported for type: ${type}`)
      }

      if (!content || content.trim().length === 0) {
        throw new Error('Document appears to be empty')
      }

      const name = deriveNameFromContent(content, type, {
        baseName: typedConfig?.baseName,
        tableName: typedConfig?.tableName,
        url: typedConfig?.url,
      })

      // Delete old chunks
      await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('source_id', id)

      // Re-chunk and re-embed — use row-aware chunking for tabular data
      let chunkRows: { source_id: string; content: string; metadata: Record<string, unknown>; embedding: string }[]
      let chunkCount: number

      if (isTabularType(type)) {
        const tabularChunks = chunkTabularText(content)
        const embeddings = await generateEmbeddings(tabularChunks.map(c => c.text))
        chunkCount = tabularChunks.length

        chunkRows = tabularChunks.map((chunk, index) => ({
          source_id: id,
          content: chunk.text,
          metadata: {
            chunkIndex: index,
            totalChunks: tabularChunks.length,
            sourceName: name,
            sourceType: type,
            rowRange: `rows ${chunk.startRow}–${chunk.endRow}`,
            startRow: chunk.startRow,
            endRow: chunk.endRow,
          },
          embedding: JSON.stringify(embeddings[index]),
        }))
      } else {
        const proseChunks = type === 'website' ? chunkWebsiteContent(content) : chunkProseText(content)
        const embeddings = await generateEmbeddings(proseChunks)
        chunkCount = proseChunks.length

        chunkRows = proseChunks.map((chunkContent, index) => ({
          source_id: id,
          content: chunkContent,
          metadata: {
            chunkIndex: index,
            totalChunks: proseChunks.length,
            sourceName: name,
            sourceType: type,
          },
          embedding: JSON.stringify(embeddings[index]),
        }))
      }

      const { error: chunksError } = await supabase
        .from('knowledge_chunks')
        .insert(chunkRows)

      if (chunksError) {
        throw new Error(`Failed to insert chunks: ${chunksError.message}`)
      }

      // Update source
      const resyncPayload: Record<string, unknown> = {
        name,
        content: content.slice(0, 500000),
        sync_status: 'synced',
        chunk_count: chunkCount,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const { data: updatedSource, error: updateError } = await supabase
        .from('knowledge_sources')
        .update(resyncPayload)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update source: ${updateError.message}`)
      }

      return NextResponse.json({
        source: updatedSource,
        chunkCount,
      })
    } catch (syncError) {
      console.error('Re-sync error:', syncError)
      await supabase
        .from('knowledge_sources')
        .update({ sync_status: 'error', updated_at: new Date().toISOString() })
        .eq('id', id)

      return NextResponse.json(
        { error: syncError instanceof Error ? syncError.message : 'Re-sync failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Knowledge PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/knowledge — Update source metadata (e.g. name)
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing source id' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name

    const { data: updatedSource, error: updateError } = await supabase
      .from('knowledge_sources')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ source: updatedSource })
  } catch (error) {
    console.error('Knowledge PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
