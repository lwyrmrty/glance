import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/airtable/keys?workspace_id=X
 * Returns all Airtable keys for the workspace (with masked key hints, no raw keys).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId = request.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })
  }

  const { data: keys, error } = await supabase
    .from('workspace_airtable_keys')
    .select('id, workspace_id, name, key_hint, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Glance] Fetch airtable keys error:', error)
    return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
  }

  return NextResponse.json({ keys: keys ?? [] })
}

/**
 * POST /api/airtable/keys
 * Add a new Airtable key. Validates by calling Airtable API first.
 * Body: { workspace_id, name, api_key }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { workspace_id, name, api_key } = body

    if (!workspace_id || !api_key) {
      return NextResponse.json({ error: 'Missing workspace_id or api_key' }, { status: 400 })
    }

    // Validate the key by calling Airtable
    const testRes = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: { Authorization: `Bearer ${api_key}` },
    })

    if (!testRes.ok) {
      return NextResponse.json(
        { error: 'Invalid Airtable API key. Please check your Personal Access Token.' },
        { status: 400 }
      )
    }

    const keyHint = api_key.slice(0, 6) + '...' + api_key.slice(-4)

    const { data: key, error } = await supabase
      .from('workspace_airtable_keys')
      .insert({
        workspace_id,
        name: name || 'Airtable',
        api_key,
        key_hint: keyHint,
      })
      .select('id, workspace_id, name, key_hint, created_at, updated_at')
      .single()

    if (error) {
      console.error('[Glance] Create airtable key error:', error)
      return NextResponse.json({ error: 'Failed to create key' }, { status: 500 })
    }

    return NextResponse.json({ key })
  } catch (err) {
    console.error('[Glance] Airtable keys POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/airtable/keys
 * Update an existing key's name or replace the key.
 * Body: { id, name?, api_key? }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, name, api_key } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing key id' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (name !== undefined) updates.name = name

    if (api_key) {
      // Validate new key
      const testRes = await fetch('https://api.airtable.com/v0/meta/bases', {
        headers: { Authorization: `Bearer ${api_key}` },
      })
      if (!testRes.ok) {
        return NextResponse.json(
          { error: 'Invalid Airtable API key.' },
          { status: 400 }
        )
      }
      updates.api_key = api_key
      updates.key_hint = api_key.slice(0, 6) + '...' + api_key.slice(-4)
    }

    const { data: key, error } = await supabase
      .from('workspace_airtable_keys')
      .update(updates)
      .eq('id', id)
      .select('id, workspace_id, name, key_hint, created_at, updated_at')
      .single()

    if (error) {
      console.error('[Glance] Update airtable key error:', error)
      return NextResponse.json({ error: 'Failed to update key' }, { status: 500 })
    }

    return NextResponse.json({ key })
  } catch (err) {
    console.error('[Glance] Airtable keys PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/airtable/keys
 * Remove a key.
 * Body: { id }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing key id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('workspace_airtable_keys')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Glance] Delete airtable key error:', error)
      return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Glance] Airtable keys DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
