import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/webhooks?workspace_id=X
 * Returns all webhooks for the workspace.
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

  const { data: webhooks, error } = await supabase
    .from('workspace_webhooks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Glance] Fetch webhooks error:', error)
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
  }

  return NextResponse.json({ webhooks: webhooks ?? [] })
}

/**
 * POST /api/webhooks
 * Create a new webhook.
 * Body: { workspace_id, name, url, event_types }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { workspace_id, name, url, event_types } = body

    if (!workspace_id || !url || !Array.isArray(event_types) || event_types.length === 0) {
      return NextResponse.json(
        { error: 'Missing workspace_id, url, or event_types' },
        { status: 400 }
      )
    }

    const { data: webhook, error } = await supabase
      .from('workspace_webhooks')
      .insert({
        workspace_id,
        name: name || '',
        url,
        event_types,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[Glance] Create webhook error:', error)
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }

    return NextResponse.json({ webhook })
  } catch (err) {
    console.error('[Glance] Webhooks POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/webhooks
 * Update an existing webhook.
 * Body: { id, name?, url?, event_types?, is_active? }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing webhook id' }, { status: 400 })
    }

    // Only allow specific fields
    const allowed: Record<string, unknown> = {}
    if (updates.name !== undefined) allowed.name = updates.name
    if (updates.url !== undefined) allowed.url = updates.url
    if (updates.event_types !== undefined) allowed.event_types = updates.event_types
    if (updates.is_active !== undefined) allowed.is_active = updates.is_active
    allowed.updated_at = new Date().toISOString()

    const { data: webhook, error } = await supabase
      .from('workspace_webhooks')
      .update(allowed)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Glance] Update webhook error:', error)
      return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 })
    }

    return NextResponse.json({ webhook })
  } catch (err) {
    console.error('[Glance] Webhooks PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/webhooks
 * Delete a webhook.
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
      return NextResponse.json({ error: 'Missing webhook id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('workspace_webhooks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Glance] Delete webhook error:', error)
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Glance] Webhooks DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
