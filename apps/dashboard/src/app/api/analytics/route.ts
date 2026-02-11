import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/analytics?workspace_id=...&period=7d|30d|90d
 *
 * Returns aggregated analytics for a workspace:
 *   stats      — visitor count, widget opens, unique widget opens, conversion rate + change vs previous period
 *   timeSeries — daily visitors, opens, uniqueOpens
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

  const days = period === '90d' ? 90 : period === '30d' ? 30 : period === '24h' ? 1 : 7
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
        stats: { visitors: 0, widgetOpens: 0, uniqueWidgetOpens: 0, usersCreated: 0, formSubmissions: 0, chatsInitiated: 0, conversionRate: 0, changes: { visitors: 0, widgetOpens: 0, uniqueWidgetOpens: 0, usersCreated: 0, formSubmissions: 0, chatsInitiated: 0, conversionRate: 0 } },
        timeSeries: [],
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

    // Accounts created (widget_users) in current and previous period
    const { count: accountsCreated } = await supabase
      .from('widget_users')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', now.toISOString())

    const { count: prevAccountsCreated } = await supabase
      .from('widget_users')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', prevStart.toISOString())
      .lt('created_at', periodStart.toISOString())

    // ===== STATS =====
    const calcStats = (evts: typeof events, addAccounts: number) => {
      const sessions = new Map<string, Set<string>>()
      let totalOpens = 0
      let formSubmits = 0
      let chatsStarted = 0

      for (const e of evts) {
        if (!sessions.has(e.session_id)) sessions.set(e.session_id, new Set())
        sessions.get(e.session_id)!.add(e.event_type)
        if (e.event_type === 'widget_opened') totalOpens++
        if (e.event_type === 'form_submitted') formSubmits++
        if (e.event_type === 'chat_started') chatsStarted++
      }

      const totalSessions = sessions.size
      let uniqueWidgetOpensSessions = 0

      for (const [, types] of sessions) {
        if (types.has('widget_opened')) uniqueWidgetOpensSessions++
      }

      return {
        visitors: totalSessions,
        widgetOpens: totalOpens,
        uniqueWidgetOpens: uniqueWidgetOpensSessions,
        usersCreated: addAccounts,
        formSubmissions: formSubmits,
        chatsInitiated: chatsStarted,
        conversionRate: totalSessions > 0 ? Math.round((uniqueWidgetOpensSessions / totalSessions) * 1000) / 10 : 0,
      }
    }

    const currentStats = calcStats(events, accountsCreated ?? 0)
    const prevStats = calcStats(prev, prevAccountsCreated ?? 0)

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0
      return Math.round(((curr - prev) / prev) * 1000) / 10
    }

    const stats = {
      ...currentStats,
      changes: {
        visitors: pctChange(currentStats.visitors, prevStats.visitors),
        widgetOpens: pctChange(currentStats.widgetOpens, prevStats.widgetOpens),
        uniqueWidgetOpens: pctChange(currentStats.uniqueWidgetOpens, prevStats.uniqueWidgetOpens),
        usersCreated: pctChange(currentStats.usersCreated, prevStats.usersCreated),
        formSubmissions: pctChange(currentStats.formSubmissions, prevStats.formSubmissions),
        chatsInitiated: pctChange(currentStats.chatsInitiated, prevStats.chatsInitiated),
        conversionRate: pctChange(currentStats.conversionRate, prevStats.conversionRate),
      },
    }

    // ===== TIME SERIES =====
    const dateMap = new Map<string, { visitors: Set<string>; opens: number; uniqueOpens: Set<string>; formSubmits: number; chatsStarted: number }>()

    // Pre-fill all days
    for (let d = 0; d < days; d++) {
      const date = new Date(periodStart.getTime() + d * 86400000)
      const key = date.toISOString().split('T')[0]
      dateMap.set(key, { visitors: new Set(), opens: 0, uniqueOpens: new Set(), formSubmits: 0, chatsStarted: 0 })
    }

    for (const e of events) {
      const key = e.created_at.split('T')[0]
      if (!dateMap.has(key)) dateMap.set(key, { visitors: new Set(), opens: 0, uniqueOpens: new Set(), formSubmits: 0, chatsStarted: 0 })
      const entry = dateMap.get(key)!
      entry.visitors.add(e.session_id)
      if (e.event_type === 'widget_opened') {
        entry.opens++
        entry.uniqueOpens.add(e.session_id)
      }
      if (e.event_type === 'form_submitted') entry.formSubmits++
      if (e.event_type === 'chat_started') entry.chatsStarted++
    }

    // Accounts created per day
    const { data: newAccounts } = await supabase
      .from('widget_users')
      .select('created_at')
      .eq('workspace_id', workspaceId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', now.toISOString())

    const accountsByDate = new Map<string, number>()
    for (const a of newAccounts ?? []) {
      const key = a.created_at.split('T')[0]
      accountsByDate.set(key, (accountsByDate.get(key) ?? 0) + 1)
    }

    const timeSeries = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        const accts = accountsByDate.get(date) ?? 0
        const conversionRate = v.visitors.size > 0
          ? Math.round((v.uniqueOpens.size / v.visitors.size) * 1000) / 10
          : 0
        return {
          date,
          visitors: v.visitors.size,
          opens: v.opens,
          uniqueOpens: v.uniqueOpens.size,
          usersCreated: accts,
          formSubmissions: v.formSubmits,
          chatsInitiated: v.chatsStarted,
          conversionRate,
        }
      })

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
      let totalDuration = 0
      let durationCount = 0

      for (const [, s] of data.sessions) {
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
        avgSessionSeconds: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      }
    }).sort((a, b) => b.visitors - a.visitors)

    return NextResponse.json({ stats, timeSeries, glances })
  } catch (err) {
    console.error('[Glance] Analytics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
