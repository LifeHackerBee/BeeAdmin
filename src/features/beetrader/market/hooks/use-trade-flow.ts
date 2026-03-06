import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FlowInterval = '1m' | '5m' | '1h'

export interface FlowBucket {
  timeLabel: string   // "HH:MM"
  timestamp: number   // epoch ms of candle open
  buyVol: number      // estimated buy volume (coin units)
  sellVol: number     // estimated sell volume (coin units, positive)
  negSellVol: number  // -sellVol, for diverging bar chart
  netFlow: number     // buyVol - sellVol
  totalVol: number
  isBullish: boolean  // close >= open
}

export interface TradeFlowData {
  buckets: FlowBucket[]
  totalBuyVol: number
  totalSellVol: number
  netFlow: number
  buyPct: number       // 0–100
  lastPrice: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = 'https://api.hyperliquid.xyz/info'
const AUTO_REFRESH_MS = 30_000

const INTERVAL_CONFIG: Record<FlowInterval, { lookbackMs: number; xTickInterval: number }> = {
  '1m': { lookbackMs: 45 * 60 * 1000, xTickInterval: 14 },     // 45 minutes → ~45 bars
  '5m': { lookbackMs: 4 * 60 * 60 * 1000, xTickInterval: 11 }, // 4 hours → ~48 bars
  '1h': { lookbackMs: 24 * 60 * 60 * 1000, xTickInterval: 5 }, // 24 hours → ~24 bars
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchTradeFlow(coin: string, interval: FlowInterval): Promise<TradeFlowData> {
  const now = Date.now()
  const { lookbackMs } = INTERVAL_CONFIG[interval]
  const startTime = now - lookbackMs

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'candleSnapshot',
      req: { coin, interval, startTime, endTime: now },
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const raw = (await res.json()) as Array<{
    t: number; o: string; h: string; l: string; c: string; v: string
  }>

  if (!Array.isArray(raw) || raw.length === 0) {
    return { buckets: [], totalBuyVol: 0, totalSellVol: 0, netFlow: 0, buyPct: 50, lastPrice: 0 }
  }

  const sorted = [...raw].sort((a, b) => a.t - b.t)

  const buckets: FlowBucket[] = sorted.map((d) => {
    const open = parseFloat(d.o)
    const high = parseFloat(d.h)
    const low = parseFloat(d.l)
    const close = parseFloat(d.c)
    const totalVol = parseFloat(d.v)

    const range = high - low
    const buyFrac = range > 0 ? Math.min(Math.max((close - low) / range, 0), 1) : 0.5
    const buyVol = totalVol * buyFrac
    const sellVol = totalVol * (1 - buyFrac)

    const date = new Date(d.t)
    const hh = date.getHours().toString().padStart(2, '0')
    const mm = date.getMinutes().toString().padStart(2, '0')

    return {
      timeLabel: `${hh}:${mm}`,
      timestamp: d.t,
      buyVol,
      sellVol,
      negSellVol: -sellVol,
      netFlow: buyVol - sellVol,
      totalVol,
      isBullish: close >= open,
    }
  })

  const totalBuyVol = buckets.reduce((s, b) => s + b.buyVol, 0)
  const totalSellVol = buckets.reduce((s, b) => s + b.sellVol, 0)
  const total = totalBuyVol + totalSellVol

  return {
    buckets,
    totalBuyVol,
    totalSellVol,
    netFlow: totalBuyVol - totalSellVol,
    buyPct: total > 0 ? (totalBuyVol / total) * 100 : 50,
    lastPrice: parseFloat(sorted[sorted.length - 1].c),
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTradeFlow(coin: string, interval: FlowInterval = '1m') {
  const [data, setData] = useState<TradeFlowData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchTradeFlow(coin, interval))
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load trade flow'))
    } finally {
      setLoading(false)
    }
  }, [coin, interval])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), AUTO_REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  const xTickInterval = INTERVAL_CONFIG[interval].xTickInterval

  return { data, loading, error, refetch: load, xTickInterval }
}
