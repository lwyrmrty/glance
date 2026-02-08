import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/widget-auth/users/activity?user_id=X&events_page=1&chats_page=1
 *
 * Returns paginated events (grouped by session) and chat sessions for a widget user.
 * Requires dashboard authentication.
 */
export async function GET(request: NextRequest) {
  const authClient = await createClient()
  const { data: authData, error: authError } = await authClient.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  const eventsPage = parseInt(request.nextUrl.searchParams.get('events_page') || '1', 10)
  const chatsPage = parseInt(request.nextUrl.searchParams.get('chats_page') || '1', 10)
  const eventsPerPage = 3 // 3 sessions per page
  const chatsPerPage = 5 // 5 chats per page

  try {
    // ---- Fetch events for this user ----
    const { data: events, error: eventsError } = await supabase
      .from('widget_events')
      .select('*')
      .eq('widget_user_id', userId)
      .order('created_at', { ascending: false })

    if (eventsError) {
      console.error('[Glance] Failed to fetch user events:', eventsError)
    }

    // Group events by session_id
    const sessionMap: Record<string, {
      session_id: string
      events: typeof events
      first_event_at: string
      last_event_at: string
    }> = {}

    for (const event of (events || [])) {
      if (!sessionMap[event.session_id]) {
        sessionMap[event.session_id] = {
          session_id: event.session_id,
          events: [],
          first_event_at: event.created_at,
          last_event_at: event.created_at,
        }
      }
      sessionMap[event.session_id].events!.push(event)
      // Track earliest and latest
      if (event.created_at < sessionMap[event.session_id].first_event_at) {
        sessionMap[event.session_id].first_event_at = event.created_at
      }
      if (event.created_at > sessionMap[event.session_id].last_event_at) {
        sessionMap[event.session_id].last_event_at = event.created_at
      }
    }

    // Sort sessions by most recent first
    const sessions = Object.values(sessionMap).sort(
      (a, b) => new Date(b.last_event_at).getTime() - new Date(a.last_event_at).getTime()
    )

    const totalSessions = sessions.length
    const paginatedSessions = sessions.slice(
      (eventsPage - 1) * eventsPerPage,
      eventsPage * eventsPerPage
    )

    // Sort events within each session by created_at ascending
    for (const session of paginatedSessions) {
      session.events!.sort(
        (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }

    // ---- Fetch chat sessions for this user ----
    const chatsOffset = (chatsPage - 1) * chatsPerPage
    const { data: chatSessions, count: totalChats, error: chatsError } = await supabase
      .from('widget_chat_sessions')
      .select('*', { count: 'exact' })
      .eq('widget_user_id', userId)
      .order('created_at', { ascending: false })
      .range(chatsOffset, chatsOffset + chatsPerPage - 1)

    if (chatsError) {
      console.error('[Glance] Failed to fetch user chats:', chatsError)
    }

    return NextResponse.json({
      sessions: paginatedSessions.map((s) => ({
        session_id: s.session_id,
        started_at: s.first_event_at,
        event_count: s.events!.length,
        events: s.events!.map((e: any) => ({
          id: e.id,
          event_type: e.event_type,
          event_data: e.event_data,
          created_at: e.created_at,
        })),
      })),
      total_sessions: totalSessions,
      total_events: events?.length || 0,
      chat_sessions: (chatSessions || []).map((c) => ({
        id: c.id,
        tab_name: c.tab_name,
        message_count: c.message_count,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      total_chats: totalChats || 0,
    })
  } catch (err) {
    console.error('[Glance] user activity error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
