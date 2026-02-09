import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/analytics?workspace_id=...&period=7d|30d|90d
 *
 * Returns aggregated analytics for a workspace:
 *   stats      — visitor count, opens, bounce rate, conversion rate + change vs previous period
 *   timeSeries — daily visitors + opens
 *   peakHours  — 7x24 grid of open counts (dow x hour)
 *   glances    — per-widget breakdown
 */
export async function GET(request: NextRequest) {
  // Auth check (dashboard user)
  const authClient = await createClient()
  const { data: authData, error: authError } = await authClient.auth.getClaims()
  if (authError || !authData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const period = searchParams.get('period') || '7d'

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })
  }

  const days = period === '90d' ? 90 : period === '30d' ? 30 : 7
  const now = new Date()
  const periodStart = new Date(now.getTime() - days * 86400000)
  const prevStart = new Date(periodStart.getTime() - days * 86400000)

  const supabase = createAdminClient()

  try {
    // Get all widget IDs for this workspace
    const { data: widgets } = await supabase
      .from('widgets')
      .select('id, name')
      .eq('workspace_id', workspaceId)

    if (!widgets || widgets.length === 0) {
      return NextResponse.json({
        stats: { visitors: 0, widgetOpens: 0, bounceRate: 0, conversionRate: 0, changes: { visitors: 0, widgetOpens: 0, bounceRate: 0, conversionRate: 0 } },
        timeSeries: [],
        peakHours: Array.from({ length: 7 }, () => Array(24).fill(0)),
        glances: [],
      })
    }

    const widgetIds = widgets.map(w => w.id)
    const widgetNameMap = Object.fromEntries(widgets.map(w => [w.id, w.name]))

    // Fetch current period events
    const { data: currentEvents } = await supabase
      .from('widget_events')
      .select('session_id, event_type, widget_id, created_at')
      .in('widget_id', widgetIds)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', now.toISOString())

    // Fetch previous period events (for change calculation)
    const { data: prevEvents } = await supabase
      .from('widget_events')
      .select('session_id, event_type')
      .in('widget_id', widgetIds)
      .gte('created_at', prevStart.toISOString())
      .lt('created_at', periodStart.toISOString())

    const events = currentEvents ?? []
    const prev = prevEvents ?? []

    // ===== STATS =====
    const calcStats = (evts: typeof events) => {
      const sessions = new Map<string, Set<string>>()
      let opens = 0

      for (const e of evts) {
        if (!sessions.has(e.session_id)) sessions.set(e.session_id, new Set())
        sessions.get(e.session_id)!.add(e.event_type)
        if (e.event_type === 'widget_opened') opens++
      }

      const totalSessions = sessions.size
      let bounceSessions = 0
      let convertedSessions = 0

      for (const [, types] of sessions) {
        if (types.size <= 1) bounceSessions++
        if (types.has('form_submitted') || types.has('chat_started')) convertedSessions++
      }

      return {
        visitors: totalSessions,
        widgetOpens: opens,
        bounceRate: totalSessions > 0 ? Math.round((bounceSessions / totalSessions) * 1000) / 10 : 0,
        conversionRate: totalSessions > 0 ? Math.round((convertedSessions / totalSessions) * 1000) / 10 : 0,
      }
    }

    const currentStats = calcStats(events)
    const prevStats = calcStats(prev)

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0
      return Math.round(((curr - prev) / prev) * 1000) / 10
    }

    const stats = {
      ...currentStats,
      changes: {
        visitors: pctChange(currentStats.visitors, prevStats.visitors),
        widgetOpens: pctChange(currentStats.widgetOpens, prevStats.widgetOpens),
        bounceRate: pctChange(currentStats.bounceRate, prevStats.bounceRate),
        conversionRate: pctChange(currentStats.conversionRate, prevStats.conversionRate),
      },
    }

    // ===== TIME SERIES =====
    const dateMap = new Map<string, { visitors: Set<string>; opens: number }>()

    // Pre-fill all days
    for (let d = 0; d < days; d++) {
      const date = new Date(periodStart.getTime() + d * 86400000)
      const key = date.toISOString().split('T')[0]
      dateMap.set(key, { visitors: new Set(), opens: 0 })
    }

    for (const e of events) {
      const key = e.created_at.split('T')[0]
      if (!dateMap.has(key)) dateMap.set(key, { visitors: new Set(), opens: 0 })
      const entry = dateMap.get(key)!
      entry.visitors.add(e.session_id)
      if (e.event_type === 'widget_opened') entry.opens++
    }

    const timeSeries = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, visitors: v.visitors.size, opens: v.opens }))

    // ===== PEAK HOURS =====
    // 7 (dow: 0=Sun..6=Sat) x 24 (hour)
    const peakHours: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))

    for (const e of events) {
      if (e.event_type === 'widget_opened') {
        const d = new Date(e.created_at)
        peakHours[d.getUTCDay()][d.getUTCHours()]++
      }
    }

    // ===== PER-GLANCE BREAKDOWN =====
    const glanceMap = new Map<string, { sessions: Map<string, { types: Set<string>; first: number; last: number }> }>()

    for (const e of events) {
      if (!glanceMap.has(e.widget_id)) {
        glanceMap.set(e.widget_id, { sessions: new Map() })
      }
      const g = glanceMap.get(e.widget_id)!
      if (!g.sessions.has(e.session_id)) {
        g.sessions.set(e.session_id, { types: new Set(), first: Infinity, last: 0 })
      }
      const s = g.sessions.get(e.session_id)!
      s.types.add(e.event_type)
      const ts = new Date(e.created_at).getTime()
      if (ts < s.first) s.first = ts
      if (ts > s.last) s.last = ts
    }

    const glances = Array.from(glanceMap.entries()).map(([widgetId, data]) => {
      const totalSessions = data.sessions.size
      let bounced = 0
      let totalDuration = 0
      let durationCount = 0

      for (const [, s] of data.sessions) {
        if (s.types.size <= 1) bounced++
        const duration = (s.last - s.first) / 1000
        if (duration > 0) {
          totalDuration += duration
          durationCount++
        }
      }

      return {
        id: widgetId,
        name: widgetNameMap[widgetId] || 'Unknown',
        visitors: totalSessions,
        bounceRate: totalSessions > 0 ? Math.round((bounced / totalSessions) * 1000) / 10 : 0,
        avgSessionSeconds: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      }
    }).sort((a, b) => b.visitors - a.visitors)

    return NextResponse.json({ stats, timeSeries, peakHours, glances })
  } catch (err) {
    console.error('[Glance] Analytics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
