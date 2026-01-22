import { useState, useEffect, useCallback, useRef } from 'react'

export type TimeFrame = '15m' | '1h' | '4h' | '24h'

export interface PriceChange {
  symbol: string
  currentPrice: number
  changePercent: number
  changeValue: number
  previousPrice: number
}

export interface PriceChanges {
  [symbol: string]: PriceChange
}

interface CandleData {
  T: number // close time
  c: string // close price
  h: string // high price
  i: string // interval
  l: string // low price
  n: number // number of trades
  o: string // open price
  s: string // symbol
  t: number // open time
  v: string // volume
}

/**
 * Hook to fetch price changes from Hyperliquid API
 * 优化版：批量获取，每10秒刷新一次
 */
export function usePriceChanges(symbols: string[], timeFrame: TimeFrame = '15m', refreshInterval = 10000) {
  const [priceChanges, setPriceChanges] = useState<PriceChanges>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchPriceChanges = useCallback(async () => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      setError(null)
      
      // 根据时间范围确定K线间隔
      let interval: string
      let millisBack: number
      
      switch (timeFrame) {
        case '15m':
          interval = '15m'
          millisBack = 15 * 60 * 1000
          break
        case '1h':
          interval = '1h'
          millisBack = 60 * 60 * 1000
          break
        case '4h':
          interval = '4h'
          millisBack = 4 * 60 * 60 * 1000
          break
        case '24h':
          interval = '1d'
          millisBack = 24 * 60 * 60 * 1000
          break
        default:
          interval = '15m'
          millisBack = 15 * 60 * 1000
      }

      const endTime = Date.now()
      const startTime = endTime - millisBack - 60000 // 多留1分钟余量

      // 并行获取所有币种的数据，但分批处理避免过载
      const batchSize = 3 // 每批3个请求
      const changes: PriceChanges = {}
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (symbol) => {
          try {
            const response = await fetch('https://api.hyperliquid.xyz/info', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'candleSnapshot',
                req: {
                  coin: symbol,
                  interval,
                  startTime,
                  endTime,
                },
              }),
              signal: abortController.signal,
            })

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }

            const candles: CandleData[] = await response.json()
            
            if (candles && candles.length >= 2) {
              // 使用最近的K线作为当前价格
              const latestCandle = candles[candles.length - 1]
              const previousCandle = candles[0]
              
              const currentPrice = parseFloat(latestCandle.c)
              const previousPrice = parseFloat(previousCandle.o)
              
              const changeValue = currentPrice - previousPrice
              const changePercent = previousPrice > 0 ? (changeValue / previousPrice) * 100 : 0

              changes[symbol] = {
                symbol,
                currentPrice,
                changePercent,
                changeValue,
                previousPrice,
              }
            } else if (candles && candles.length === 1) {
              // 只有一根K线，变化为0
              const currentPrice = parseFloat(candles[0].c)
              changes[symbol] = {
                symbol,
                currentPrice,
                changePercent: 0,
                changeValue: 0,
                previousPrice: currentPrice,
              }
            }
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              throw err // 重新抛出取消错误
            }
            console.error(`Error fetching ${symbol}:`, err)
            // 失败的币种不显示变化
          }
        })

        // 等待当前批次完成
        await Promise.all(batchPromises)
        
        // 批次间稍微延迟，避免API限流
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      setPriceChanges(changes)
      setLoading(false)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // 请求被取消，不设置错误
        return
      }
      const error = err instanceof Error ? err : new Error('获取价格变化失败')
      setError(error)
      setLoading(false)
      console.error('Error fetching price changes:', err)
    }
  }, [symbols, timeFrame])

  useEffect(() => {
    // 立即获取一次
    fetchPriceChanges()

    // 设置定时刷新（每10秒）
    if (refreshInterval > 0) {
      const interval = setInterval(fetchPriceChanges, refreshInterval)
      return () => {
        clearInterval(interval)
        // 清理时取消请求
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchPriceChanges, refreshInterval])

  return {
    priceChanges,
    loading,
    error,
    refetch: fetchPriceChanges,
  }
}
