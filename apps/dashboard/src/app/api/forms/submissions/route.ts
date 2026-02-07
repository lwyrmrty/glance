import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const widgetId = searchParams.get('widget_id')
  const tabName = searchParams.get('tab_name')
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  if (!widgetId || !tabName) {
    return NextResponse.json({ error: 'Missing widget_id or tab_name' }, { status: 400 })
  }

  // Get total count
  const { count } = await supabase
    .from('form_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('widget_id', widgetId)
    .eq('form_name', tabName)

  // Get paginated submissions
  const { data: submissions, error } = await supabase
    .from('form_submissions')
    .select('*')
    .eq('widget_id', widgetId)
    .eq('form_name', tabName)
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }

  return NextResponse.json({
    submissions: submissions ?? [],
    total: count ?? 0,
  })
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
