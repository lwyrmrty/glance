import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/widget-auth/users?workspace_id=X&search=...&status=...&limit=...&offset=...
 * 
 * Returns paginated list of widget users for the workspace.
 * Requires dashboard authentication.
 */
export async function GET(request: NextRequest) {
  // Use server client for auth (reads user cookies)
  const authClient = await createClient()
  const { data: authData, error: authError } = await authClient.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client for data queries (bypasses RLS)
  const supabase = createAdminClient()

  const workspaceId = request.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })
  }

  const search = request.nextUrl.searchParams.get('search') || ''
  const status = request.nextUrl.searchParams.get('status') || ''
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10)
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10)

  try {
    // Build query
    let query = supabase
      .from('widget_users')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('last_active_at', { ascending: false, nullsFirst: false })

    if (search) {
      // Search by name or email
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    if (status && (status === 'active' || status === 'inactive')) {
      query = query.eq('status', status)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: users, count, error } = await query

    if (error) {
      console.error('[Glance] Failed to fetch widget users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({
      users: users ?? [],
      total: count ?? 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[Glance] widget-auth/users GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/widget-auth/users
 * 
 * Deletes widget users by IDs.
 * Requires dashboard authentication.
 */
export async function DELETE(request: NextRequest) {
  // Use server client for auth (reads user cookies)
  const authClient = await createClient()
  const { data: authData, error: authError } = await authClient.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client for data queries (bypasses RLS)
  const supabase = createAdminClient()

  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing or empty ids array' }, { status: 400 })
    }

    const { error } = await supabase
      .from('widget_users')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('[Glance] Failed to delete widget users:', error)
      return NextResponse.json({ error: 'Failed to delete users' }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (err) {
    console.error('[Glance] widget-auth/users DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
