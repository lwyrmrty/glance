'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import Sidebar from '@/components/Sidebar'

interface AnalyticsPageProps {
  workspaceName?: string
  workspaceId?: string
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
}

interface Stats {
  visitors: number
  widgetOpens: number
  bounceRate: number
  conversionRate: number
  changes: {
    visitors: number
    widgetOpens: number
    bounceRate: number
    conversionRate: number
  }
}

interface TimeSeriesPoint {
  date: string
  visitors: number
  opens: number
}

interface GlanceRow {
  id: string
  name: string
  visitors: number
  bounceRate: number
  avgSessionSeconds: number
}

interface AnalyticsData {
  stats: Stats
  timeSeries: TimeSeriesPoint[]
  peakHours: number[][]
  glances: GlanceRow[]
}

const PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12am'
  if (i < 12) return `${i}am`
  if (i === 12) return '12pm'
  return `${i - 12}pm`
})

// Show a subset of hours for the heatmap (9am - 9pm)
const HEATMAP_HOURS = Array.from({ length: 13 }, (_, i) => i + 9) // 9..21

export function AnalyticsPage({ workspaceName, workspaceId, glances }: AnalyticsPageProps) {
  const [period, setPeriod] = useState('7d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?workspace_id=${workspaceId}&period=${period}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, period])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const prefix = workspaceId ? `/w/${workspaceId}` : ''

  // Format helpers
  const formatNumber = (n: number) => n.toLocaleString()
  const formatPct = (n: number) => `${n}%`
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  const formatChartDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const ChangeIndicator = ({ value, invertColors }: { value: number; invertColors?: boolean }) => {
    if (value === 0) return <span style={{ color: '#999', fontSize: 13 }}>No change</span>
    const isPositive = value > 0
    const isGood = invertColors ? !isPositive : isPositive
    const color = isGood ? '#22c55e' : '#ef4444'
    const arrow = isPositive ? '\u2191' : '\u2193'
    return (
      <span style={{ color, fontSize: 13, fontWeight: 500 }}>
        {arrow} {Math.abs(value)}% <span style={{ color: '#999', fontWeight: 400 }}>from last period</span>
      </span>
    )
  }

  // Peak hours max for heatmap color scaling
  const peakMax = data ? Math.max(1, ...data.peakHours.flat()) : 1

  // Glance max visitors for bar width scaling
  const glanceMaxVisitors = data ? Math.max(1, ...data.glances.map(g => g.visitors)) : 1

  return (
    <div className="pagewrapper">
      <div className="pagecontent">
        <Sidebar workspaceName={workspaceName} workspaceId={workspaceId} glances={glances} />
        <div className="mainwrapper">
          <div className="maincontent" style={{ overflow: 'auto' }}>
            {/* Hero */}
            <div className="innerhero">
              <div className="herorow">
                <div className="pageicon-block large">
                  <img src="/images/stats.svg" loading="lazy" alt="" className="heroicon" />
                </div>
                <div className="alignrow alignbottom">
                  <h1 className="pageheading">Analytics</h1>
                </div>
              </div>
              <div className="pagesubheading">Track widget engagement across all your Glances.</div>
            </div>

            {loading && !data ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#999' }}>Loading analytics...</div>
            ) : !data ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#999' }}>Failed to load analytics.</div>
            ) : (
              <>
                {/* ===== STAT CARDS ===== */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: 'Total Visitors', value: formatNumber(data.stats.visitors), change: data.stats.changes.visitors, icon: '/images/playerslite.svg' },
                    { label: 'Widget Opens', value: formatNumber(data.stats.widgetOpens), change: data.stats.changes.widgetOpens, icon: '/images/glance-icon.svg' },
                    { label: 'Bounce Rate', value: formatPct(data.stats.bounceRate), change: data.stats.changes.bounceRate, invert: true, icon: '/images/bounce.svg' },
                    { label: 'Conversion Rate', value: formatPct(data.stats.conversionRate), change: data.stats.changes.conversionRate, icon: '/images/conversion.svg' },
                  ].map((card, i) => (
                    <div key={i} className="contentblock" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div className="pageicon-block" style={{ width: 32, height: 32 }}>
                          <img src={card.icon} loading="lazy" alt="" className="heroicon" style={{ width: 18, height: 18 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                        <div className="labeltext">{card.label}</div>
                      </div>
                      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1, marginBottom: 6 }}>{card.value}</div>
                      <ChangeIndicator value={card.change} invertColors={card.invert} />
                    </div>
                  ))}
                </div>

                {/* ===== MIDDLE ROW: Traffic + Peak Hours ===== */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 24 }}>
                  {/* Traffic Overview */}
                  <div className="contentblock" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>Traffic overview</div>
                      <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="formfields w-input"
                        style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                      >
                        {PERIODS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{formatNumber(data.stats.visitors)}</div>
                    <ChangeIndicator value={data.stats.changes.visitors} />
                    <div style={{ height: 220, marginTop: 20 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.timeSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#000000" stopOpacity={0.1} />
                              <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatChartDate}
                            tick={{ fontSize: 11, fill: '#999' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#999' }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }}
                            labelFormatter={formatChartDate}
                            formatter={(value: number, name: string) => [formatNumber(value), name === 'visitors' ? 'Visitors' : 'Opens']}
                          />
                          <Area
                            type="monotone"
                            dataKey="visitors"
                            stroke="#000000"
                            strokeWidth={2}
                            fill="url(#colorVisitors)"
                            dot={false}
                            activeDot={{ r: 5, fill: '#000000', stroke: '#fff', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Peak Hours Heatmap */}
                  <div className="contentblock" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>Peak hours</div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                      {formatNumber(Math.max(...data.peakHours.flat()))}
                    </div>
                    <div style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>visitors in peak hour</div>

                    {/* Heatmap Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${DAY_LABELS.length}, 1fr)`, gap: 3, fontSize: 11 }}>
                      {/* Header row */}
                      <div></div>
                      {DAY_LABELS.map(d => (
                        <div key={d} style={{ textAlign: 'center', color: '#999', paddingBottom: 4 }}>{d}</div>
                      ))}

                      {/* Hour rows */}
                      {HEATMAP_HOURS.map(hour => (
                        <div key={hour} style={{ display: 'contents' }}>
                          <div style={{ color: '#999', textAlign: 'right', paddingRight: 6, lineHeight: '22px' }}>
                            {HOUR_LABELS[hour]}
                          </div>
                          {DAY_LABELS.map((_, dow) => {
                            const count = data.peakHours[dow]?.[hour] ?? 0
                            const intensity = count / peakMax
                            return (
                              <div
                                key={dow}
                                title={`${DAY_LABELS[dow]} ${HOUR_LABELS[hour]}: ${count} opens`}
                                style={{
                                  borderRadius: 4,
                                  height: 22,
                                  backgroundColor: count === 0
                                    ? '#f5f5f5'
                                    : `rgba(124, 58, 237, ${0.12 + intensity * 0.88})`,
                                  transition: 'background-color 0.2s',
                                }}
                              />
                            )
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 11, color: '#999' }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: 'rgba(124,58,237,0.15)' }} />
                      <span>Low</span>
                      <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: 'rgba(124,58,237,0.5)' }} />
                      <span>Medium</span>
                      <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: 'rgba(124,58,237,1)' }} />
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* ===== PER-GLANCE TABLE ===== */}
                <div className="contentblock">
                  <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>Per Glance</div>
                  </div>

                  <div>
                    {/* Table header */}
                    <div className="tablerow header" style={{ paddingLeft: 20, paddingRight: 20 }}>
                      <div className="tablerow-left" style={{ flex: 1 }}>
                        <div className="tableblock">
                          <div className="labeltext dim" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Glance</div>
                        </div>
                      </div>
                      <div className="tablerow-right" style={{ display: 'flex', gap: 0 }}>
                        <div style={{ width: 200, textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#999', padding: '12px 16px' }}>Visitors</div>
                        <div style={{ width: 120, textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#999', padding: '12px 16px' }}>Bounce rate</div>
                        <div style={{ width: 150, textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#999', padding: '12px 16px' }}>Avg. time per session</div>
                      </div>
                    </div>

                    {/* Table body */}
                    <div className="tablewrapper">
                      <div className="tablerows">
                        {data.glances.length === 0 ? (
                          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                            No data yet. Events will appear here once visitors interact with your widgets.
                          </div>
                        ) : data.glances.map((g) => (
                          <div key={g.id} className="tablerow" style={{ paddingLeft: 20, paddingRight: 20 }}>
                            <div className="tablerow-left" style={{ flex: 1 }}>
                              <div className="tableblock">
                                <div>
                                  <div className="tablename">{g.name}</div>
                                </div>
                              </div>
                            </div>
                            <div className="tablerow-right" style={{ display: 'flex', gap: 0 }}>
                              <div style={{ width: 200, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '0 16px' }}>
                                <div style={{
                                  flex: 1,
                                  maxWidth: 100,
                                  height: 6,
                                  backgroundColor: '#f0f0f0',
                                  borderRadius: 3,
                                  overflow: 'hidden',
                                }}>
                                  <div style={{
                                    width: `${(g.visitors / glanceMaxVisitors) * 100}%`,
                                    height: '100%',
                                    backgroundColor: '#7C3AED',
                                    borderRadius: 3,
                                  }} />
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 500, minWidth: 40, textAlign: 'right' }}>{formatNumber(g.visitors)}</div>
                              </div>
                              <div style={{ width: 120, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 16px', fontSize: 13 }}>
                                {formatPct(g.bounceRate)}
                              </div>
                              <div style={{ width: 150, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 16px', fontSize: 13 }}>
                                {formatDuration(g.avgSessionSeconds)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
