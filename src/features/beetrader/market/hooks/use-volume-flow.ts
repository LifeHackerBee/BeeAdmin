import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VolumeBar {
  time: number       // unix ms
  timeLabel: string  // e.g. "14:35"
  volume: number
  isBullish: boolean  // close >= open
  isSpike: boolean    // volume >= 2× average
  open: number
  close: number
}

export interface VolumeFlowData {
  bars: VolumeBar[]
  avgVolume: number
  currentVolume: number
  spikeCount: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info'
const INTERVAL = '5m'
const LOOKBACK_MS = 4 * 60 * 60 * 1000  // 4 hours → 48 bars
const SPIKE_THRESHOLD = 2                 // ≥ 2× average is a spike
const AUTO_REFRESH_MS = 30_000           // refresh every 30 s

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchVolumeFlow(coin: string): Promise<VolumeFlowData> {
  const now = Date.now()
  const startTime = now - LOOKBACK_MS

  const res = await fetch(HYPERLIQUID_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'candleSnapshot',
      req: { coin, interval: INTERVAL, startTime, endTime: now },
    }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const raw = (await res.json()) as Array<{
    t: number
    o: string
    h: string
    l: string
    c: string
    v: string
  }>

  if (!Array.isArray(raw) || raw.length === 0) {
    return { bars: [], avgVolume: 0, currentVolume: 0, spikeCount: 0 }
  }

  const sorted = [...raw].sort((a, b) => a.t - b.t)
  const volumes = sorted.map((d) => parseFloat(d.v))
  const avgVolume = volumes.reduce((s, v) => s + v, 0) / volumes.length

  const bars: VolumeBar[] = sorted.map((d) => {
    const volume = parseFloat(d.v)
    const open = parseFloat(d.o)
    const close = parseFloat(d.c)
    const date = new Date(d.t)
    const hh = date.getHours().toString().padStart(2, '0')
    const mm = date.getMinutes().toString().padStart(2, '0')
    return {
      time: d.t,
      timeLabel: `${hh}:${mm}`,
      volume,
      isBullish: close >= open,
      isSpike: volume >= avgVolume * SPIKE_THRESHOLD,
      open,
      close,
    }
  })

  return {
    bars,
    avgVolume,
    currentVolume: volumes[volumes.length - 1] ?? 0,
    spikeCount: bars.filter((b) => b.isSpike).length,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVolumeFlow(coin: string) {
  const [data, setData] = useState<VolumeFlowData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchVolumeFlow(coin)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'))
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
