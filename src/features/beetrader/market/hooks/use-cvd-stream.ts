/**
 * useCvdStream
 * ─────────────────────────────────────────────────────────────────
 * 连接后端 /ws/cvd/{coin}，实时接收累计 CVD 快照。
 * 前端在客户端将快照聚合成 1m / 5m / 15m 时间桶，
 * 每桶记录：CVD 增量、成交量、买/卖量、峰值 VpS、是否放量。
 *
 * 对外暴露三组柱图数据，供 CvdPanel 渲染。
 */
import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

/** 后端推送的原始快照（每 300ms 一次）*/
interface RawSnapshot {
  coin:      string
  ts:        number
  cvd:       number   // 累计 CVD（自连接起）
  buy_vol:   number   // 累计主买量
  sell_vol:  number   // 累计主卖量
  vps:       number   // 当前 VpS（5s 窗口）
  vps_ratio: number
}

/** 一个完整时间桶 */
export interface CvdBucket {
  ts:         number   // 桶开始时间 (unix ms)
  timeLabel:  string   // "HH:MM"
  cvdDelta:   number   // 本桶 CVD 净变化 (buy - sell)
  volume:     number   // 本桶总成交量
  buyVol:     number
  sellVol:    number
  maxVps:     number   // 桶内 VpS 峰值
  isSpike:    boolean
  spikeRatio: number   // volume / 均量
}

/** 某一周期的全部柱图数据 */
export interface CvdBarsData {
  bars:       CvdBucket[]
  avgVolume:  number
  totalCvd:   number   // 所有桶的 cvdDelta 之和
  spikeCount: number
  slope:      number   // 最后 N 桶的 CVD 斜率（线性回归）
}

export type CvdInterval = '1m' | '5m' | '15m'

export interface UseCvdStreamReturn {
  data:       Record<CvdInterval, CvdBarsData>
  status:     'disconnected' | 'connecting' | 'connected' | 'error'
  error:      string | null
  connect:    (coin: string) => void
  disconnect: () => void
  /** 当前未完成桶的实时 CVD 增量（live bar）*/
  liveCvd:    number
  liveVps:    number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET_MS: Record<CvdInterval, number> = {
  '1m':  1  * 60 * 1000,
  '5m':  5  * 60 * 1000,
  '15m': 15 * 60 * 1000,
}
const MAX_1M_BUCKETS  = 60   // 1h 历史
const SPIKE_THRESHOLD = 2.0
const SLOPE_WINDOW    = 10   // 用最后 N 桶算斜率

// ─── Helpers ─────────────────────────────────────────────────────────────────

function bucketStart(ts: number, intervalMs: number): number {
  return Math.floor(ts / intervalMs) * intervalMs
}

function toTimeLabel(ts: number): string {
  const d  = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

/** 线性回归斜率 (y = cvdDelta 序列) */
function calcSlope(bars: CvdBucket[], n: number): number {
  const pts = bars.slice(-n)
  if (pts.length < 2) return 0
  const len = pts.length
  let sx = 0, sy = 0, sxy = 0, sxx = 0
  for (let i = 0; i < len; i++) {
    sx  += i;  sy  += pts[i].cvdDelta
    sxy += i * pts[i].cvdDelta
    sxx += i * i
  }
  const denom = len * sxx - sx * sx
  return denom === 0 ? 0 : (len * sxy - sx * sy) / denom
}

/** 从 1m 桶聚合成 5m / 15m 桶 */
function aggregate(buckets1m: CvdBucket[], intervalMs: number): CvdBucket[] {
  const map = new Map<number, CvdBucket>()
  for (const b of buckets1m) {
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
  const volumes = bars.map((b) => b.volume)
  const avg     = volumes.length > 0 ? volumes.reduce((s, v) => s + v, 0) / volumes.length : 0
  const tagged  = bars.map((b) => ({
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

// ─── WebSocket URL helpers ────────────────────────────────────────────────────

function getWsBase(): string {
  const url = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL as string | undefined
  if (!url) return 'ws://localhost:8000'
  return url.replace(/^http/, 'ws')
}
const WS_BASE = getWsBase()
const API_KEY = import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY as string | undefined

// ─── Hook ─────────────────────────────────────────────────────────────────────

const EMPTY_BARS: CvdBarsData = { bars: [], avgVolume: 0, totalCvd: 0, spikeCount: 0, slope: 0 }

export function useCvdStream(): UseCvdStreamReturn {
  const [status,  setStatus]  = useState<UseCvdStreamReturn['status']>('disconnected')
  const [error,   setError]   = useState<string | null>(null)
  const [data,    setData]    = useState<Record<CvdInterval, CvdBarsData>>({
    '1m': EMPTY_BARS, '5m': EMPTY_BARS, '15m': EMPTY_BARS,
  })
  const [liveCvd, setLiveCvd] = useState(0)
  const [liveVps, setLiveVps] = useState(0)

  // 内部可变状态（不需要触发 render 的数据）
  const wsRef        = useRef<WebSocket | null>(null)
  const coinRef      = useRef<string | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 累计值锚点（每桶开始时记录）
  const anchorRef = useRef<{ cvd: number; buyVol: number; sellVol: number } | null>(null)
  // 当前桶的起始时间
  const curBucketTsRef = useRef<number>(0)
  // 当前桶内的峰值 VpS
  const curMaxVpsRef = useRef<number>(0)
  // 完整 1m 桶列表
  const buckets1mRef = useRef<CvdBucket[]>([])

  const flushBucket = useCallback((snap: RawSnapshot) => {
    const now    = snap.ts
    const anchor = anchorRef.current
    const bTs    = curBucketTsRef.current
    if (!anchor || bTs === 0) return

    const cvdDelta  = snap.cvd      - anchor.cvd
    const buyVol    = snap.buy_vol  - anchor.buyVol
    const sellVol   = snap.sell_vol - anchor.sellVol
    const volume    = buyVol + sellVol

    const bucket: CvdBucket = {
      ts:         bTs,
      timeLabel:  toTimeLabel(bTs),
      cvdDelta,
      volume,
      buyVol,
      sellVol,
      maxVps:     curMaxVpsRef.current,
      isSpike:    false,   // 重新算（buildBarsData 会覆盖）
      spikeRatio: 0,
    }

    buckets1mRef.current = [
      ...buckets1mRef.current.slice(-(MAX_1M_BUCKETS - 1)),
      bucket,
    ]

    // 重置下一桶锚点
    anchorRef.current   = { cvd: snap.cvd, buyVol: snap.buy_vol, sellVol: snap.sell_vol }
    curBucketTsRef.current = bucketStart(now, BUCKET_MS['1m'])
    curMaxVpsRef.current   = snap.vps

    // 聚合三个周期并更新 state
    const b1m  = buckets1mRef.current
    const b5m  = aggregate(b1m, BUCKET_MS['5m'])
    const b15m = aggregate(b1m, BUCKET_MS['15m'])
    setData({
      '1m':  buildBarsData(b1m),
      '5m':  buildBarsData(b5m),
      '15m': buildBarsData(b15m),
    })
  }, [])

  const handleMessage = useCallback((snap: RawSnapshot) => {
    const now    = snap.ts
    const bStart = bucketStart(now, BUCKET_MS['1m'])

    // 初始化锚点（首次收到消息）
    if (!anchorRef.current) {
      anchorRef.current      = { cvd: snap.cvd, buyVol: snap.buy_vol, sellVol: snap.sell_vol }
      curBucketTsRef.current = bStart
      curMaxVpsRef.current   = snap.vps
    }

    // 更新桶内峰值 VpS
    curMaxVpsRef.current = Math.max(curMaxVpsRef.current, snap.vps)

    // 跨过了 1 分钟边界 → flush 旧桶
    if (bStart > curBucketTsRef.current) {
      flushBucket(snap)
    }

    // 实时 live bar（当前桶增量）
    if (anchorRef.current) {
      setLiveCvd(snap.cvd - anchorRef.current.cvd)
      setLiveVps(snap.vps)
    }
  }, [flushBucket])

  const disconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current)
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    coinRef.current = null
    anchorRef.current = null
    curBucketTsRef.current = 0
    buckets1mRef.current   = []
    setStatus('disconnected')
    setData({ '1m': EMPTY_BARS, '5m': EMPTY_BARS, '15m': EMPTY_BARS })
    setLiveCvd(0)
    setLiveVps(0)
  }, [])

  const connect = useCallback((coin: string) => {
    if (wsRef.current && coinRef.current === coin && wsRef.current.readyState === WebSocket.OPEN) return
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
    if (reconnectRef.current) clearTimeout(reconnectRef.current)

    // 切换币种时重置聚合状态
    anchorRef.current      = null
    curBucketTsRef.current = 0
    buckets1mRef.current   = []

    coinRef.current = coin
    setStatus('connecting')
    setError(null)

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
  }, [handleMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current)
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
  }, [])

  return { data, status, error, connect, disconnect, liveCvd, liveVps }
}
