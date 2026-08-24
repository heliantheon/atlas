import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Copy, Pause, Play, Search } from 'lucide-react'
import { Button, Input, Spinner } from '@heliannuuthus/ui'
import { chaosLogApi, type LogEntry, type LogQueryParams } from '@/services'
import styles from './index.module.scss'

type WindowMinutes = 15 | 60 | 360 | 1440

const MAX_LIVE_ENTRIES = 500
const severityOptions = ['', 'DEBUG', 'INFO', 'WARN', 'ERROR']

function isoFromMinutes(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function formatTime(value: string) {
  const date = new Date(value)
  const formatted = new Intl.DateTimeFormat('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
  return `${formatted}.${String(date.getMilliseconds()).padStart(3, '0')}`
}

function entryKey(entry: LogEntry) {
  return `${entry.timestamp_ns}:${entry.labels.pod ?? ''}:${entry.body}`
}

export function LogExplorer() {
  const [service, setService] = useState('')
  const [severity, setSeverity] = useState('')
  const [search, setSearch] = useState('')
  const [traceID, setTraceID] = useState('')
  const [windowMinutes, setWindowMinutes] = useState<WindowMinutes>(60)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [copiedTrace, setCopiedTrace] = useState<string | null>(null)
  const streamController = useRef<AbortController | null>(null)

  const baseParams = useMemo<LogQueryParams>(
    () => ({
      service: service.trim() || undefined,
      severity: severity || undefined,
      search: search.trim() || undefined,
      trace_id: traceID.trim().toLowerCase() || undefined,
      limit: 500,
    }),
    [search, service, severity, traceID]
  )

  const stopLive = useCallback(() => {
    streamController.current?.abort()
    streamController.current = null
    setLive(false)
  }, [])

  const query = useCallback(
    async (override?: LogQueryParams) => {
      stopLive()
      setLoading(true)
      setStreamError(null)
      try {
        const result = await chaosLogApi.query({
          ...(override ?? baseParams),
          start: isoFromMinutes(windowMinutes),
          end: new Date().toISOString(),
          direction: 'backward',
        })
        setEntries(result.entries)
      } catch (error) {
        setEntries([])
        setStreamError(error instanceof Error ? error.message : '日志查询失败')
      } finally {
        setLoading(false)
      }
    },
    [baseParams, stopLive, windowMinutes]
  )

  const startLive = useCallback(() => {
    stopLive()
    setEntries([])
    setStreamError(null)
    setLive(true)
    const controller = new AbortController()
    streamController.current = controller
    void chaosLogApi
      .stream(
        {
          ...baseParams,
          start: new Date().toISOString(),
          limit: 200,
          direction: 'forward',
        },
        controller.signal,
        entry => {
          setEntries(current => [entry, ...current].slice(0, MAX_LIVE_ENTRIES))
        }
      )
      .then(() => {
        if (!controller.signal.aborted) {
          setStreamError('日志流连接已关闭')
          setLive(false)
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setStreamError(error instanceof Error ? error.message : '日志流已中断')
          setLive(false)
        }
      })
  }, [baseParams, stopLive])

  useEffect(() => {
    void query()
    return stopLive
    // Initial query only; filters are applied explicitly to avoid accidental load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copyTrace = async (trace: string) => {
    await navigator.clipboard.writeText(trace)
    setCopiedTrace(trace)
    window.setTimeout(() => setCopiedTrace(current => (current === trace ? null : current)), 1600)
  }

  const inspectTrace = (trace: string) => {
    setTraceID(trace)
    void query({ ...baseParams, trace_id: trace })
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.kicker}>OBSERVABILITY / LOGS</div>
          <h1>日志检索台</h1>
          <p>跨服务检索结构化日志，通过 Trace ID 串起一次完整调用。</p>
        </div>
        <div className={styles.connection} data-live={live}>
          <span className={styles.signal} aria-hidden="true" />
          <div>
            <strong>{live ? 'LIVE STREAM' : 'HISTORY'}</strong>
            <small>{live ? '持续接收新日志' : '固定时间窗口'}</small>
          </div>
        </div>
      </header>

      <section className={styles.controls} aria-label="日志筛选器">
        <label>
          <span>服务</span>
          <Input
            value={service}
            onChange={event => setService(event.target.value)}
            placeholder="全部服务"
          />
        </label>
        <label>
          <span>级别</span>
          <select value={severity} onChange={event => setSeverity(event.target.value)}>
            {severityOptions.map(option => (
              <option key={option || 'all'} value={option}>
                {option || '全部级别'}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.searchField}>
          <span>正文关键字</span>
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="delivery failed"
          />
        </label>
        <label className={styles.traceField}>
          <span>Trace ID</span>
          <Input
            value={traceID}
            onChange={event => setTraceID(event.target.value)}
            placeholder="32 位十六进制"
          />
        </label>
        <div className={styles.actions}>
          <Button onClick={() => void query()} disabled={loading}>
            <Search /> 查询
          </Button>
          <Button variant={live ? 'destructive' : 'outline'} onClick={live ? stopLive : startLive}>
            {live ? <Pause /> : <Play />}
            {live ? '暂停' : '实时'}
          </Button>
        </div>
      </section>

      <section className={styles.windowBar} aria-label="时间窗口">
        <div className={styles.presets}>
          {([15, 60, 360, 1440] as WindowMinutes[]).map(minutes => (
            <button
              type="button"
              key={minutes}
              aria-pressed={windowMinutes === minutes}
              onClick={() => setWindowMinutes(minutes)}
            >
              {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
            </button>
          ))}
        </div>
        <span>{entries.length} records</span>
      </section>

      <section className={styles.console} aria-live="polite" aria-busy={loading}>
        <div className={styles.consoleHeader}>
          <span>TIME</span>
          <span>LEVEL</span>
          <span>SERVICE</span>
          <span>MESSAGE</span>
          <span>TRACE</span>
        </div>

        {loading && (
          <div className={styles.state}>
            <Spinner /> 正在查询 Loki…
          </div>
        )}
        {!loading && streamError && (
          <div className={`${styles.state} ${styles.error}`}>
            <AlertTriangle /> {streamError}
          </div>
        )}
        {!loading && !streamError && entries.length === 0 && (
          <div className={styles.state}>当前条件下没有日志。调整筛选器或开启实时模式。</div>
        )}

        <div className={styles.rows}>
          {entries.map(entry => {
            const key = entryKey(entry)
            const isExpanded = expanded === key
            return (
              <article key={key} className={styles.record} data-level={entry.severity}>
                <button
                  type="button"
                  className={styles.recordSummary}
                  aria-expanded={isExpanded}
                  onClick={() => setExpanded(isExpanded ? null : key)}
                >
                  <time dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
                  <span className={styles.level}>{entry.severity}</span>
                  <span className={styles.service}>
                    {entry.service || entry.labels.container || 'unknown'}
                  </span>
                  <span className={styles.message}>{entry.body}</span>
                  <code>{entry.trace_id ? entry.trace_id.slice(0, 10) : '—'}</code>
                  {isExpanded ? <ChevronDown /> : <ChevronRight />}
                </button>
                {isExpanded && (
                  <div className={styles.detail}>
                    <div className={styles.detailMeta}>
                      <span>pod / {entry.labels.pod ?? 'unknown'}</span>
                      <span>container / {entry.labels.container ?? 'unknown'}</span>
                      <span>span / {entry.span_id ?? 'none'}</span>
                    </div>
                    <pre>{JSON.stringify(entry.attributes ?? {}, null, 2)}</pre>
                    {entry.trace_id && (
                      <div className={styles.traceActions}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void copyTrace(entry.trace_id!)}
                        >
                          <Copy /> {copiedTrace === entry.trace_id ? '已复制' : '复制 Trace'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => inspectTrace(entry.trace_id!)}
                        >
                          只看此 Trace
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
