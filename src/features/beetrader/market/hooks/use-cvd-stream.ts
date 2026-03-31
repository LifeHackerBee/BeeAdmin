/**
 * useCvdStream
 * ─────────────────────────────────────────────────────────────────
 * 1. 启动时先从后端 GET /api/cvd/history/{coin} 拉取 Supabase 历史 1m 桶
 *    （由 Celery Worker 后台写入，最多 3 天数据）
 * 2. 再连接 /ws/cvd/{coin} WebSocket，将实时快照聚合追加到历史数据
 *
 * 对外暴露三组柱图数据（1m/5m/15m）供 CvdPanel 渲染。
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { hyperliquidApiGet, hyperliquidApiPost } from '@/lib/hyperliquid-api-client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawSnapshot {
  coin:      string
  ts:        number
  cvd:       number
  buy_vol:   number
  sell_vol:  number
  vps:       number
  vps_ratio: number
}

interface HistoryRow {
  ts:        number
  cvd_delta: number
  volume:    number
  buy_vol:   number
  sell_vol:  number
  max_vps:   number
}

export interface CvdBucket {
  ts:         number
  timeLabel:  string
  cvdDelta:   number
  volume:     number
  buyVol:     number
  sellVol:    number
  maxVps:     number
  isSpike:    boolean
  spikeRatio: number
}

export interface CvdBarsData {
  bars:       CvdBucket[]
  avgVolume:  number
  totalCvd:   number
  spikeCount: number
  slope:      number
}

export type CvdInterval = '1m' | '5m' | '15m'

export interface UseCvdStreamReturn {
  data:         Record<CvdInterval, CvdBarsData>
  status:       'disconnected' | 'loading' | 'connecting' | 'connected' | 'error'
  error:        string | null
  connect:      (coin: string) => void
  disconnect:   () => void
  liveCvd:      number
  liveVps:      number
  /** 监控开关状态 */
  monitorEnabled:  boolean | null
  toggleMonitor:   (enabled: boolean) => Promise<void>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET_MS: Record<CvdInterval, number> = {
  '1m':  60_000,
  '5m':  300_000,
  '15m': 900_000,
}
const MAX_1M_BUCKETS  = 4320   // 3 天历史
const SPIKE_THRESHOLD = 2.0
const SLOPE_WINDOW    = 10

// ─── Helpers ─────────────────────────────────────────────────────────────────

function bucketStart(ts: number, ms: number) { return Math.floor(ts / ms) * ms }

function toTimeLabel(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

function calcSlope(bars: CvdBucket[], n: number): number {
  const pts = bars.slice(-n)
  if (pts.length < 2) return 0
  const len = pts.length
  let sx = 0, sy = 0, sxy = 0, sxx = 0
  for (let i = 0; i < len; i++) {
    sx += i; sy += pts[i].cvdDelta
    sxy += i * pts[i].cvdDelta; sxx += i * i
  }
  const d = len * sxx - sx * sx
  return d === 0 ? 0 : (len * sxy - sx * sy) / d
}

function aggregate(b1m: CvdBucket[], intervalMs: number): CvdBucket[] {
  const map = new Map<number, CvdBucket>()
  for (const b of b1m) {
    const key = bucketStart(b.ts, intervalMs)
    const cur = map.get(key)
    if (!cur) {
      map.set(key, { ...b, ts: key, timeLabel: toTimeLabel(key) })
    } else {
      cur.cvdDelta += b.cvdDelta
      cur.volume   += b.volume
      cur.buyVol   += b.buyVol
      cur.sellVol  += b.sellVol
      cur.maxVps    = Math.max(cur.maxVps, b.maxVps)
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts)
}

function buildBarsData(bars: CvdBucket[]): CvdBarsData {
  const avg    = bars.length > 0 ? bars.reduce((s, b) => s + b.volume, 0) / bars.length : 0
  const tagged = bars.map((b) => ({
    ...b,
    isSpike:    avg > 0 && b.volume >= avg * SPIKE_THRESHOLD,
    spikeRatio: avg > 0 ? Math.round((b.volume / avg) * 10) / 10 : 0,
  }))
  return {
    bars:       tagged,
    avgVolume:  avg,
    totalCvd:   bars.reduce((s, b) => s + b.cvdDelta, 0),
    spikeCount: tagged.filter((b) => b.isSpike).length,
    slope:      calcSlope(bars, SLOPE_WINDOW),
  }
}

function rebuildAll(b1m: CvdBucket[]): Record<CvdInterval, CvdBarsData> {
  return {
    '1m':  buildBarsData(b1m),
    '5m':  buildBarsData(aggregate(b1m, BUCKET_MS['5m'])),
    '15m': buildBarsData(aggregate(b1m, BUCKET_MS['15m'])),
  }
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

function getWsBase(): string {
  const url = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL as string | undefined
  if (!url) return 'ws://localhost:8000'
  return url.replace(/^http/, 'ws')
}
const WS_BASE = getWsBase()
const API_KEY = import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY as string | undefined

// ─── Hook ─────────────────────────────────────────────────────────────────────

const EMPTY_BARS: CvdBarsData = { bars: [], avgVolume: 0, totalCvd: 0, spikeCount: 0, slope: 0 }
const EMPTY_DATA: Record<CvdInterval, CvdBarsData> = {
  '1m': EMPTY_BARS, '5m': EMPTY_BARS, '15m': EMPTY_BARS,
}

export function useCvdStream(): UseCvdStreamReturn {
  const [status,  setStatus]  = useState<UseCvdStreamReturn['status']>('disconnected')
  const [error,   setError]   = useState<string | null>(null)
  const [data,    setData]    = useState<Record<CvdInterval, CvdBarsData>>(EMPTY_DATA)
  const [liveCvd, setLiveCvd] = useState(0)
  const [liveVps, setLiveVps] = useState(0)
  const [monitorEnabled, setMonitorEnabled] = useState<boolean | null>(null)

  const wsRef          = useRef<WebSocket | null>(null)
  const coinRef        = useRef<string | null>(null)
  const reconnectRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const anchorRef      = useRef<{ cvd: number; buyVol: number; sellVol: number } | null>(null)
  const curBucketTsRef = useRef<number>(0)
  const curMaxVpsRef   = useRef<number>(0)
  const buckets1mRef   = useRef<CvdBucket[]>([])

  // ── 读取监控开关状态 ────────────────────────────────────────────────────────
  const fetchMonitorStatus = useCallback(async (coin: string) => {
    try {
      const res = await hyperliquidApiGet<{ configs: { coin: string; enabled: boolean }[] }>(
        '/api/cvd/monitor/status'
      )
      const cfg = res.configs.find((c) => c.coin === coin)
      setMonitorEnabled(cfg?.enabled ?? true)
    } catch {
      setMonitorEnabled(true)
    }
  }, [])

  const toggleMonitor = useCallback(async (enabled: boolean) => {
    const coin = coinRef.current
    if (!coin) return
    try {
      await hyperliquidApiPost('/api/cvd/monitor/toggle', { coin, enabled })
      setMonitorEnabled(enabled)
    } catch { /* ignore */ }
  }, [])

  // ── 从 Supabase 加载历史桶 ─────────────────────────────────────────────────
  const loadHistory = useCallback(async (coin: string) => {
    try {
      const res = await hyperliquidApiGet<{ coin: string; rows: HistoryRow[] }>(
        `/api/cvd/history/${coin}?limit=4320`
      )
      if (res.rows.length > 0) {
        const historicBuckets: CvdBucket[] = res.rows.map((r) => ({
          ts:         r.ts,
          timeLabel:  toTimeLabel(r.ts),
          cvdDelta:   r.cvd_delta,
          volume:     r.volume,
          buyVol:     r.buy_vol,
          sellVol:    r.sell_vol,
          maxVps:     r.max_vps,
          isSpike:    false,
          spikeRatio: 0,
        }))
        buckets1mRef.current = historicBuckets.slice(-MAX_1M_BUCKETS)
        setData(rebuildAll(buckets1mRef.current))
      }
    } catch { /* 加载失败时忽略，继续用 WS 数据 */ }
  }, [])

  // ── WS 桶 flush ────────────────────────────────────────────────────────────
  const flushBucket = useCallback((snap: RawSnapshot) => {
    const anchor = anchorRef.current
    const bTs    = curBucketTsRef.current
    if (!anchor || bTs === 0) return

    const buyVol  = snap.buy_vol  - anchor.buyVol
    const sellVol = snap.sell_vol - anchor.sellVol

    buckets1mRef.current = [
      ...buckets1mRef.current.slice(-(MAX_1M_BUCKETS - 1)),
      {
        ts:         bTs,
        timeLabel:  toTimeLabel(bTs),
        cvdDelta:   snap.cvd - anchor.cvd,
        volume:     buyVol + sellVol,
        buyVol,
        sellVol,
        maxVps:     curMaxVpsRef.current,
        isSpike:    false,
        spikeRatio: 0,
      },
    ]

    anchorRef.current      = { cvd: snap.cvd, buyVol: snap.buy_vol, sellVol: snap.sell_vol }
    curBucketTsRef.current = bucketStart(snap.ts, BUCKET_MS['1m'])
    curMaxVpsRef.current   = snap.vps

    setData(rebuildAll(buckets1mRef.current))
  }, [])

  const handleMessage = useCallback((snap: RawSnapshot) => {
    const bStart = bucketStart(snap.ts, BUCKET_MS['1m'])

    if (!anchorRef.current) {
      anchorRef.current      = { cvd: snap.cvd, buyVol: snap.buy_vol, sellVol: snap.sell_vol }
      curBucketTsRef.current = bStart
      curMaxVpsRef.current   = snap.vps
    }

    curMaxVpsRef.current = Math.max(curMaxVpsRef.current, snap.vps)

    if (bStart > curBucketTsRef.current) flushBucket(snap)

    if (anchorRef.current) {
      setLiveCvd(snap.cvd - anchorRef.current.cvd)
      setLiveVps(snap.vps)
    }
  }, [flushBucket])

  // ── disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current)
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null }
    coinRef.current        = null
    anchorRef.current      = null
    curBucketTsRef.current = 0
    buckets1mRef.current   = []
    setStatus('disconnected')
    setData(EMPTY_DATA)
    setLiveCvd(0); setLiveVps(0)
    setMonitorEnabled(null)
  }, [])

  // ── connect ────────────────────────────────────────────────────────────────
  const connect = useCallback((coin: string) => {
    if (wsRef.current && coinRef.current === coin && wsRef.current.readyState === WebSocket.OPEN) return
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
    if (reconnectRef.current) clearTimeout(reconnectRef.current)

    // 切换币种时重置
    if (coinRef.current !== coin) {
      anchorRef.current      = null
      curBucketTsRef.current = 0
      buckets1mRef.current   = []
      setData(EMPTY_DATA)
    }

    coinRef.current = coin
    setStatus('loading')
    setError(null)

    // 1. 先拉历史 + 读监控开关，再连 WS
    Promise.all([loadHistory(coin), fetchMonitorStatus(coin)]).finally(() => {
      if (coinRef.current !== coin) return  // 已切换 coin，放弃

      setStatus('connecting')
      const url = API_KEY
        ? `${WS_BASE}/ws/cvd/${coin}?api_key=${API_KEY}`
        : `${WS_BASE}/ws/cvd/${coin}`

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen    = () => { setStatus('connected'); setError(null) }
      ws.onerror   = () => { setError('WebSocket 连接错误'); setStatus('error') }
      ws.onmessage = (evt) => {
        try { handleMessage(JSON.parse(evt.data as string) as RawSnapshot) } catch { /* ignore */ }
      }
      ws.onclose = (evt) => {
        wsRef.current = null
        if (evt.code === 4001) { setError('API Key 无效'); setStatus('error'); return }
        if (coinRef.current) {
          setStatus('connecting')
          reconnectRef.current = setTimeout(() => { if (coinRef.current) connect(coinRef.current) }, 3000)
        }
      }
    })
  }, [handleMessage, loadHistory, fetchMonitorStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current)
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
  }, [])

  return { data, status, error, connect, disconnect, liveCvd, liveVps, monitorEnabled, toggleMonitor }
}
