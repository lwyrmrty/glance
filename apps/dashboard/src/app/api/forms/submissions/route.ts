import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/forms/submissions
 *
 * Supports two query modes:
 *   1. workspace_id           — all submissions for a workspace (dashboard page)
 *   2. widget_id + tab_name   — submissions for a specific form tab (editor preview)
 *
 * Optional: search, limit, offset
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const widgetId = searchParams.get('widget_id')
  const tabName = searchParams.get('tab_name')
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  // Must provide either workspace_id or (widget_id + tab_name)
  if (!workspaceId && (!widgetId || !tabName)) {
    return NextResponse.json(
      { error: 'Provide workspace_id, or widget_id + tab_name' },
      { status: 400 }
    )
  }

  try {
    // Build count query
    let countQuery = supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })

    // Build data query
    let dataQuery = supabase
      .from('form_submissions')
      .select('*')

    // Apply filter mode
    if (workspaceId) {
      countQuery = countQuery.eq('workspace_id', workspaceId)
      dataQuery = dataQuery.eq('workspace_id', workspaceId)
    } else {
      countQuery = countQuery.eq('widget_id', widgetId!).eq('form_name', tabName!)
      dataQuery = dataQuery.eq('widget_id', widgetId!).eq('form_name', tabName!)
    }

    // Search across form_name and data (cast jsonb to text for ilike)
    if (search) {
      const pattern = `%${search}%`
      countQuery = countQuery.or(`form_name.ilike.${pattern},data::text.ilike.${pattern}`)
      dataQuery = dataQuery.or(`form_name.ilike.${pattern},data::text.ilike.${pattern}`)
    }

    // Execute
    const { count } = await countQuery
    const { data: submissions, error } = await dataQuery
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Glance] Fetch submissions error:', error)
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }

    return NextResponse.json({
      submissions: submissions ?? [],
      total: count ?? 0,
    })
  } catch (err) {
    console.error('[Glance] Submissions GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const ids = body.ids as string[]

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing ids array' }, { status: 400 })
    }

    const { error } = await supabase
      .from('form_submissions')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('[Glance] Delete submissions error:', error)
      return NextResponse.json({ error: 'Failed to delete submissions' }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (err) {
    console.error('[Glance] Delete submissions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
