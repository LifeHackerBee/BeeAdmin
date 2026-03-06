import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Raw API types ────────────────────────────────────────────────────────────

interface RawTrade {
  coin: string
  side: 'B' | 'A' // B = buyer-initiated (Buy), A = seller-initiated (Ask/Sell)
  px: string       // price
  sz: string       // size in coin
  time: number     // epoch ms
  hash: string
  tid: number      // trade id (unique, microseconds)
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface LargeTrade {
  id: number
  side: 'buy' | 'sell'
  price: number
  size: number
  usdValue: number
  time: number
}

export function getTimeAgo(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return `${Math.floor(diff / 1000)}秒前`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  return `${Math.floor(diff / 86_400_000)}天前`
}

export function fmtUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

export function fmtPrice(p: number): string {
  if (p >= 10_000) return `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (p >= 100) return `$${p.toFixed(2)}`
  return `$${p.toFixed(4)}`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLargeTrades(coin: string) {
  const [trades, setTrades] = useState<LargeTrade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [minUsdValue, setMinUsdValue] = useState(0)
  const tradesLenRef = useRef(0)

  const fetchTrades = useCallback(async () => {
    if (!coin) return
    try {
      if (tradesLenRef.current === 0) setLoading(true)

      // Note: recentTrades does NOT use a "req" wrapper — coin is a top-level field
      const res = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'recentTrades',
          coin: coin.toUpperCase(),
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: RawTrade[] = await res.json()

      if (!Array.isArray(data) || data.length === 0) {
        setTrades([])
        tradesLenRef.current = 0
        return
      }

      // Dynamic threshold: top 15% by USD notional value
      const usdArr = data
        .map((t) => parseFloat(t.px) * parseFloat(t.sz))
        .sort((a, b) => a - b)
      const p85idx = Math.floor(usdArr.length * 0.85)
      const threshold = usdArr[p85idx] ?? 0
      setMinUsdValue(threshold)

      const result: LargeTrade[] = data
        .map((t) => ({
          id: t.tid,
          side: (t.side === 'B' ? 'buy' : 'sell') as 'buy' | 'sell',
          price: parseFloat(t.px),
          size: parseFloat(t.sz),
          usdValue: parseFloat(t.px) * parseFloat(t.sz),
          time: t.time,
        }))
        .filter((t) => t.usdValue >= threshold)
        .sort((a, b) => b.time - a.time)
        .slice(0, 60)

      setTrades(result)
      tradesLenRef.current = result.length
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('获取大额成交数据失败'))
    } finally {
      setLoading(false)
    }
  }, [coin])

  useEffect(() => {
    tradesLenRef.current = 0
    setTrades([])
    void fetchTrades()
    const timer = setInterval(() => void fetchTrades(), 30_000)
    return () => clearInterval(timer)
  }, [fetchTrades])

  return { trades, loading, error, minUsdValue, refetch: fetchTrades }
}
