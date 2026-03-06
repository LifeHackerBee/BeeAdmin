import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VolumeProfilePoint {
  price: number
  volume: number
}

export interface VolumeProfileResult {
  profile: {
    '1h': VolumeProfilePoint[]
    '4h': VolumeProfilePoint[]
    '1d': VolumeProfilePoint[]
  }
  currentPrice: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = 'https://api.hyperliquid.xyz/info'
const AUTO_REFRESH_MS = 30_000

const LOOKBACKS: Record<string, number> = {
  '1h': 7 * 24 * 60 * 60 * 1000,   // 7 days → ~168 1h candles
  '4h': 30 * 24 * 60 * 60 * 1000,  // 30 days → ~180 4h candles
  '1d': 90 * 24 * 60 * 60 * 1000,  // 90 days → ~90 1d candles
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchCandles(
  coin: string,
  interval: string,
  lookbackMs: number
): Promise<VolumeProfilePoint[]> {
  const now = Date.now()
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'candleSnapshot',
      req: { coin, interval, startTime: now - lookbackMs, endTime: now },
    }),
  })
  if (!res.ok) throw new Error(`candleSnapshot ${interval} HTTP ${res.status}`)

  const data = (await res.json()) as Array<{
    t: number; o: string; h: string; l: string; c: string; v: string
  }>

  if (!Array.isArray(data)) return []

  // Use midpoint of (high + low) as the representative price for each candle.
  // This distributes volume at the average traded price rather than just the close.
  return data.map((d) => ({
    price: (parseFloat(d.h) + parseFloat(d.l)) / 2,
    volume: parseFloat(d.v),
  }))
}

async function fetchCurrentPrice(coin: string): Promise<number> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'allMids' }),
  })
  if (!res.ok) return 0
  const mids = (await res.json()) as Record<string, string>
  return parseFloat(mids[coin] ?? '0') || 0
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVolumeProfile(coin: string) {
  const [data, setData] = useState<VolumeProfileResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [h1, h4, d1, currentPrice] = await Promise.all([
        fetchCandles(coin, '1h', LOOKBACKS['1h']),
        fetchCandles(coin, '4h', LOOKBACKS['4h']),
        fetchCandles(coin, '1d', LOOKBACKS['1d']),
        fetchCurrentPrice(coin),
      ])
      setData({ profile: { '1h': h1, '4h': h4, '1d': d1 }, currentPrice })
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load volume profile'))
    } finally {
      setLoading(false)
    }
  }, [coin])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), AUTO_REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  return { data, loading, error, refetch: load }
}
