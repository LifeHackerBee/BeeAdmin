import { useState, useEffect, useCallback } from 'react'

export interface MarketPrice {
  symbol: string
  price: number
}

export interface MarketPrices {
  [symbol: string]: number
}

/**
 * Hook to fetch market prices from Hyperliquid API
 */
export function useMarketPrices(refreshInterval = 5000) {
  const [prices, setPrices] = useState<MarketPrices>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPrices = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'allMids',
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: MarketPrices = await response.json()
      setPrices(data)
      setLoading(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取价格失败')
      setError(error)
      setLoading(false)
      console.error('Error fetching market prices:', err)
    }
  }, [])

  useEffect(() => {
    // 立即获取一次
    fetchPrices()

    // 设置定时刷新
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

