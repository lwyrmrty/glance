import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

  // Split into individual row blocks (each starts with "Row N\n...")
  const rowBlocks = text.split(/\n\n/).filter(b => b.trim().length > 0)

  const chunks: { text: string; startRow: number; endRow: number }[] = []
  let currentChunk = ''
  let chunkStartRow = 1
  let currentRow = 0

  for (const block of rowBlocks) {
    // Extract row number from block
    const rowMatch = block.match(/^Row (\d+)/)
    const rowNum = rowMatch ? parseInt(rowMatch[1], 10) : currentRow + 1
    currentRow = rowNum

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

/** Generate embeddings for an array of text chunks using OpenAI */
async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: chunks,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI embeddings API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  return data.data.map((item: { embedding: number[] }) => item.embedding)
}

/** Derive a name from the first line of content */
function deriveNameFromContent(content: string, type: string, meta?: { baseName?: string; tableName?: string }): string {
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
    const { type, shareLink, baseId, baseName, tableId, tableName, content: mdContent, fileName: mdFileName } = body

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
      } else {
        throw new Error(`Source type "${type}" is not supported`)
      }

      if (!content || content.trim().length === 0) {
        throw new Error('Document appears to be empty')
      }

      // Derive name from content
      const name = deriveNameFromContent(content, type, { baseName, tableName })

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
        const proseChunks = chunkProseText(content)
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
      } else {
        throw new Error(`Re-sync not supported for type: ${type}`)
      }

      if (!content || content.trim().length === 0) {
        throw new Error('Document appears to be empty')
      }

      const name = deriveNameFromContent(content, type, {
        baseName: typedConfig?.baseName,
        tableName: typedConfig?.tableName,
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
        const proseChunks = chunkProseText(content)
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
