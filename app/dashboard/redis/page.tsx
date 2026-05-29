// ============================================
// Redis Dashboard Page — Visual monitoring UI
// ============================================
'use client'

import { useState, useEffect, useCallback } from 'react'

interface RedisHealth {
  status: 'connected' | 'disconnected' | 'not_configured'
  latencyMs: number | null
  uptimeSeconds: number | null
  connectedAt: string | null
  memoryUsage: string | null
  totalKeys: number | null
  hitRate: string | null
  version: string | null
}

interface CacheKey {
  key: string
  ttl: number
  size: number
}

interface RedisData {
  health: RedisHealth
  cacheCategories?: Record<string, number>
  keys?: CacheKey[]
  totalShown?: number
  timestamp?: string
}

export default function RedisDashboardPage() {
  const [data, setData] = useState<RedisData | null>(null)
  const [keys, setKeys] = useState<CacheKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<string | null>(null)
  const [filterPattern, setFilterPattern] = useState('*')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/redis')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/redis?action=keys&pattern=${encodeURIComponent(filterPattern)}&limit=100`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setKeys(json.keys || [])
    } catch (err) {
      // Surface key fetch errors so the user sees stale data warnings instead
      // of silently failing.
      if (err instanceof Error) setError(err.message)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    fetchKeys()
  }, [fetchHealth, fetchKeys])

  // Auto-refresh every 5s when the tab is visible. We pause on hidden tabs so
  // an idle dashboard doesn't keep hammering /api/admin/redis. The polling
  // interval is also properly cleared on unmount + when autoRefresh toggles.
  useEffect(() => {
    if (!autoRefresh) return

    let interval: ReturnType<typeof setInterval> | null = null

    const start = () => {
      if (interval) return
      interval = setInterval(() => {
        fetchHealth()
        fetchKeys()
      }, 5000)
    }
    const stop = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Catch up on return.
        fetchHealth()
        fetchKeys()
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [autoRefresh, fetchHealth, fetchKeys])

  const handleAction = async (action: string, extra?: Record<string, string>) => {
    try {
      const res = await fetch('/api/admin/redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const json = await res.json()
      setActionResult(JSON.stringify(json, null, 2))
      // Refresh data
      setTimeout(() => { fetchHealth(); fetchKeys() }, 500)
    } catch (err: any) {
      setActionResult(`Error: ${err.message}`)
    }
  }

  const formatUptime = (seconds: number | null) => {
    if (!seconds) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatTTL = (ttl: number) => {
    if (ttl === -1) return '∞ (no expiry)'
    if (ttl === -2) return '❌ expired'
    const m = Math.floor(ttl / 60)
    const s = ttl % 60
    if (m > 60) return `${Math.floor(m / 60)}h ${m % 60}m`
    return `${m}m ${s}s`
  }

  const statusColor = data?.health.status === 'connected' ? '#00e676' : data?.health.status === 'disconnected' ? '#ff5252' : '#ffa726'

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner} />
          <p style={{ color: '#94a3b8' }}>Đang kết nối Redis...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <span style={styles.redisIcon}>⚡</span> Redis Dashboard
          </h1>
          <p style={styles.subtitle}>Giám sát cache & hiệu năng hệ thống TERENCE</p>
        </div>
        <div style={styles.headerActions}>
          <label style={styles.autoRefreshLabel}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={styles.checkbox}
            />
            Auto-refresh (5s)
          </label>
          <button style={styles.refreshBtn} onClick={() => { fetchHealth(); fetchKeys() }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          ⚠️ Error: {error}
        </div>
      )}

      {/* Status Cards */}
      <div style={styles.cardGrid}>
        <div style={{ ...styles.card, borderTop: `3px solid ${statusColor}` }}>
          <div style={styles.cardLabel}>Status</div>
          <div style={styles.cardValue}>
            <span style={{ ...styles.statusDot, backgroundColor: statusColor }} />
            {data?.health.status === 'connected' ? 'Connected' : data?.health.status || '—'}
          </div>
          <div style={styles.cardMeta}>v{data?.health.version || '—'}</div>
        </div>

        <div style={{ ...styles.card, borderTop: '3px solid #42a5f5' }}>
          <div style={styles.cardLabel}>Latency</div>
          <div style={styles.cardValue}>{data?.health.latencyMs?.toFixed(2) || '—'} ms</div>
          <div style={styles.cardMeta}>PING round-trip</div>
        </div>

        <div style={{ ...styles.card, borderTop: '3px solid #ab47bc' }}>
          <div style={styles.cardLabel}>Memory</div>
          <div style={styles.cardValue}>{data?.health.memoryUsage || '—'}</div>
          <div style={styles.cardMeta}>Used memory</div>
        </div>

        <div style={{ ...styles.card, borderTop: '3px solid #26a69a' }}>
          <div style={styles.cardLabel}>Total Keys</div>
          <div style={styles.cardValue}>{data?.health.totalKeys ?? '—'}</div>
          <div style={styles.cardMeta}>Active cache entries</div>
        </div>

        <div style={{ ...styles.card, borderTop: '3px solid #ffa726' }}>
          <div style={styles.cardLabel}>Hit Rate</div>
          <div style={styles.cardValue}>{data?.health.hitRate || '—'}</div>
          <div style={styles.cardMeta}>Cache efficiency</div>
        </div>

        <div style={{ ...styles.card, borderTop: '3px solid #78909c' }}>
          <div style={styles.cardLabel}>Uptime</div>
          <div style={styles.cardValue}>{formatUptime(data?.health.uptimeSeconds ?? null)}</div>
          <div style={styles.cardMeta}>Server uptime</div>
        </div>
      </div>

      {/* Cache Categories */}
      {data?.cacheCategories && Object.keys(data.cacheCategories).length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📊 Cache Categories</h2>
          <div style={styles.categoryGrid}>
            {Object.entries(data.cacheCategories).map(([cat, count]) => (
              <div key={cat} style={styles.categoryChip}>
                <span style={styles.categoryName}>{cat}</span>
                <span style={styles.categoryCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cache Keys Table */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>🗝️ Cache Keys</h2>
          <div style={styles.filterRow}>
            <input
              type="text"
              value={filterPattern}
              onChange={(e) => setFilterPattern(e.target.value)}
              placeholder="Filter pattern (e.g. movies:*)"
              style={styles.filterInput}
              onKeyDown={(e) => e.key === 'Enter' && fetchKeys()}
            />
            <button style={styles.filterBtn} onClick={fetchKeys}>🔍</button>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Key</th>
                <th style={{ ...styles.th, width: '120px', textAlign: 'right' }}>Size</th>
                <th style={{ ...styles.th, width: '140px', textAlign: 'right' }}>TTL</th>
                <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: '#64748b', padding: '32px' }}>
                    No cache keys found
                  </td>
                </tr>
              ) : keys.map((k) => (
                <tr key={k.key} style={styles.tableRow}>
                  <td style={styles.td}>
                    <code style={styles.keyCode}>{k.key}</code>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatBytes(k.size)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <span style={{
                      ...styles.ttlBadge,
                      backgroundColor: k.ttl > 1800 ? '#1b5e20' : k.ttl > 300 ? '#e65100' : '#b71c1c',
                    }}>
                      {formatTTL(k.ttl)}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleAction('invalidate', { key: k.key })}
                      title="Delete this key"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {keys.length > 0 && (
          <div style={styles.tableSummary}>
            {keys.length} keys | Total size: {formatBytes(keys.reduce((sum, k) => sum + k.size, 0))}
          </div>
        )}
      </div>

      {/* Actions Panel */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🛠️ Cache Management</h2>
        <div style={styles.actionsGrid}>
          <button style={styles.actionBtn} onClick={() => handleAction('ping')}>
            📡 Ping Redis
          </button>
          <button style={styles.actionBtn} onClick={() => handleAction('invalidate', { pattern: 'movies:*' })}>
            🎬 Clear Movie Cache
          </button>
          <button style={styles.actionBtn} onClick={() => handleAction('invalidate', { pattern: 'playback:*' })}>
            ▶️ Clear Playback Cache
          </button>
          <button style={{ ...styles.actionBtn, borderColor: '#ef5350', color: '#ef5350' }} onClick={() => {
            if (confirm('Flush ALL Redis keys? This cannot be undone.')) {
              handleAction('flush')
            }
          }}>
            ⚠️ Flush All
          </button>
        </div>
      </div>

      {/* Action Result */}
      {actionResult && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Action Result</h2>
          <pre style={styles.resultPre}>{actionResult}</pre>
          <button style={styles.dismissBtn} onClick={() => setActionResult(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString('vi-VN') : '—'}
      </div>
    </div>
  )
}

// ── Styles ──
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    padding: '32px',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: '#e2e8f0',
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #334155',
    borderTop: '4px solid #38bdf8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    background: 'linear-gradient(90deg, #38bdf8, #818cf8, #c084fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: 0,
  },
  redisIcon: {
    fontSize: '32px',
    WebkitTextFillColor: '#ef4444',
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: '4px',
    fontSize: '14px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  autoRefreshLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
  },
  checkbox: { accentColor: '#38bdf8' },
  refreshBtn: {
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  card: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(12px)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  cardLabel: { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '8px' },
  cardValue: { fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' },
  cardMeta: { fontSize: '11px', color: '#64748b', marginTop: '6px' },
  statusDot: { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px currentColor' },
  section: {
    background: 'rgba(30, 41, 59, 0.6)',
    backdropFilter: 'blur(12px)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  sectionTitle: { fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '12px', marginBottom: '16px' },
  categoryGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: '10px' },
  categoryChip: {
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '20px',
    padding: '6px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  categoryName: { fontSize: '13px', color: '#38bdf8' },
  categoryCount: { fontSize: '13px', fontWeight: 700, color: '#e2e8f0', background: 'rgba(56, 189, 248, 0.2)', borderRadius: '10px', padding: '2px 8px' },
  filterRow: { display: 'flex', gap: '8px' },
  filterInput: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    color: '#e2e8f0',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    width: '240px',
    outline: 'none',
  },
  filterBtn: {
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  tableWrapper: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    textAlign: 'left' as const,
    padding: '10px 14px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
  },
  td: { padding: '10px 14px', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', fontSize: '13px' },
  tableRow: { transition: 'background 0.15s' },
  keyCode: { background: 'rgba(56, 189, 248, 0.08)', color: '#7dd3fc', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" },
  ttlBadge: { color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500 },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px', opacity: 0.6 },
  tableSummary: { textAlign: 'right' as const, color: '#64748b', fontSize: '12px', marginTop: '12px' },
  actionsGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: '12px' },
  actionBtn: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    color: '#e2e8f0',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  resultPre: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '12px',
    fontFamily: "'JetBrains Mono', monospace",
    color: '#38bdf8',
    overflow: 'auto',
    maxHeight: '200px',
  },
  dismissBtn: {
    background: 'none',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    color: '#94a3b8',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    marginTop: '8px',
  },
  footer: { textAlign: 'center' as const, color: '#475569', fontSize: '12px', marginTop: '16px', paddingBottom: '32px' },
}
