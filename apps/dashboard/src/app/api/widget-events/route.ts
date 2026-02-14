import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// CORS — widget fires from external sites; reflect Origin when provided
// When browser sends credentials, we must reflect Origin and set Allow-Credentials
function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin')
  const hasOrigin = origin && /^https?:\/\//.test(origin)
  const allowOrigin = hasOrigin ? origin : '*'
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
  if (hasOrigin) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  return headers
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

interface WidgetEvent {
  event_type: string
  event_data?: Record<string, unknown>
  timestamp?: string
}

const VALID_EVENT_TYPES = new Set([
  'widget_opened',
  'tab_viewed',
  'page_view',
  'form_submitted',
  'link_clicked',
  'chat_started',
])

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const body = await request.json()

    const {
      widget_id,
      session_id,
      widget_user_id,
      page_url,
      events,
    } = body as {
      widget_id: string
      session_id: string
      widget_user_id?: string | null
      page_url?: string
      events: WidgetEvent[]
    }

    if (!widget_id || !session_id || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Missing widget_id, session_id, or events array' },
        { status: 400, headers: corsHeaders(request) }
      )
    }

    // Validate and build rows
    const rows = []
    for (const event of events) {
      if (!event.event_type || !VALID_EVENT_TYPES.has(event.event_type)) {
        continue // skip invalid event types
      }
      rows.push({
        widget_id,
        session_id,
        widget_user_id: widget_user_id || null,
        event_type: event.event_type,
        event_data: event.event_data || {},
        page_url: page_url || null,
        created_at: event.timestamp || new Date().toISOString(),
      })
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid events to insert' },
        { status: 400, headers: corsHeaders(request) }
      )
    }

    const { error: insertError } = await supabase
      .from('widget_events')
      .insert(rows)

    if (insertError) {
      console.error('[Glance] Widget events insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save events' },
        { status: 500, headers: corsHeaders(request) }
      )
    }

    return NextResponse.json(
      { success: true, count: rows.length },
      { headers: corsHeaders(request) }
    )
  } catch (err) {
    console.error('[Glance] Widget events error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders(request) }
    )
  }
}
