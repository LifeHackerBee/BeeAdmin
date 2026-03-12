import { useState, useEffect, useCallback } from 'react'

export interface MarketPrice {
  symbol: string
  price: number
}

export interface MarketPrices {
  [symbol: string]: number
}

/** 获取 xyz 资产（如 xyz:GOLD）的最新价格（通过最近一根 1m K 线） */
async function fetchXyzPrices(symbols: string[]): Promise<MarketPrices> {
  const xyzSymbols = symbols.filter((s) => s.startsWith('xyz:'))
  if (xyzSymbols.length === 0) return {}

  const now = Date.now()
  const results: MarketPrices = {}

  await Promise.all(
    xyzSymbols.map(async (symbol) => {
      try {
        const res = await fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'candleSnapshot',
            req: { coin: symbol, interval: '1m', startTime: now - 120_000, endTime: now },
          }),
        })
        if (!res.ok) return
        const candles = await res.json()
        if (Array.isArray(candles) && candles.length > 0) {
          results[symbol] = parseFloat(candles[candles.length - 1].c)
        }
      } catch {
        /* ignore individual failures */
      }
    })
  )
  return results
}

/**
 * Hook to fetch market prices from Hyperliquid API
 * - 加密货币: allMids
 * - xyz 商品 (GOLD/SILVER/BRENTOIL): candleSnapshot
 */
export function useMarketPrices(refreshInterval = 5000, symbols: string[] = []) {
  const [prices, setPrices] = useState<MarketPrices>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPrices = useCallback(async () => {
    try {
      setError(null)

      const [allMidsRes, xyzPrices] = await Promise.all([
        fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'allMids' }),
        }),
        fetchXyzPrices(symbols),
      ])

      if (!allMidsRes.ok) {
        throw new Error(`HTTP error! status: ${allMidsRes.status}`)
      }

      const allMids: MarketPrices = await allMidsRes.json()
      setPrices({ ...allMids, ...xyzPrices })
      setLoading(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取价格失败')
      setError(error)
      setLoading(false)
      console.error('Error fetching market prices:', err)
    }
  }, [symbols])

  useEffect(() => {
    fetchPrices()

    if (refreshInterval > 0) {
      const interval = setInterval(fetchPrices, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchPrices, refreshInterval])

  return {
    prices,
    loading,
    error,
    refetch: fetchPrices,
  }
}

/**
 * Get price for specific symbols
 */
export function getPricesForSymbols(
  prices: MarketPrices,
  symbols: string[]
): MarketPrice[] {
  return symbols
    .map((symbol) => ({
      symbol,
      price: prices[symbol] || 0,
    }))
    .filter((item) => item.price > 0)
}
