import { useState, useEffect, useCallback, useRef } from 'react'

export type CandleInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M'

export interface CandleData {
  T: number // Close time (epoch millis)
  c: string // Close price
  h: string // High price
  i: CandleInterval // Interval
  l: string // Low price
  n: number // Number of trades
  o: string // Open price
  s: string // Symbol
  t: number // Start time (epoch millis)
  v: string // Volume
}

export interface CandleSnapshotRequest {
  coin: string
  interval: CandleInterval
  startTime: number // epoch millis
  endTime: number // epoch millis
}

/**
 * Hook to fetch candle snapshot data from Hyperliquid API
 */
export function useCandleData(
  coin: string,
  interval: CandleInterval,
  startTime?: number,
  endTime?: number
) {
  const [data, setData] = useState<CandleData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const fetchingRef = useRef(false)
  const lastRequestKeyRef = useRef<string>('')
  const dataLengthRef = useRef(0)

  // 生成请求的唯一 key，用于判断是否需要重新请求
  // 注意：这里只比较币种和间隔，不比较具体时间，因为时间范围是固定的（24小时）
  const getRequestKey = useCallback((c: string, i: CandleInterval) => {
    return `${c}-${i}`
  }, [])

  const fetchCandles = useCallback(async () => {
    if (!coin || !interval) {
      return
    }

    // 防止重复请求
    if (fetchingRef.current) {
      return
    }

    // 如果没有提供时间范围，默认获取最近24小时的数据
    const now = Date.now()
    const defaultStartTime = startTime || now - 24 * 60 * 60 * 1000
    const defaultEndTime = endTime || now

    const requestKey = getRequestKey(coin, interval)

    // 如果请求参数没有变化，不重复请求
    if (lastRequestKeyRef.current === requestKey && dataLengthRef.current > 0) {
      return
    }

    fetchingRef.current = true
    lastRequestKeyRef.current = requestKey

    try {
      // 只在首次加载或没有数据时显示 loading
      setLoading(dataLengthRef.current === 0)
      setError(null)

      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: {
            coin,
            interval,
            startTime: defaultStartTime,
            endTime: defaultEndTime,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const candleData: CandleData[] = await response.json()
      setData(candleData)
      dataLengthRef.current = candleData.length
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取K线数据失败')
      setError(error)
      console.error('Error fetching candle data:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [coin, interval, startTime, endTime, getRequestKey])

  // 当币种或时间间隔改变时，清空旧数据并重新请求
  useEffect(() => {
    const requestKey = getRequestKey(coin, interval)
    if (lastRequestKeyRef.current !== requestKey && !fetchingRef.current) {
      setData([])
      dataLengthRef.current = 0
      lastRequestKeyRef.current = '' // 重置，强制重新请求
      fetchCandles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin, interval])

  return {
    data,
    loading,
    error,
    refetch: fetchCandles,
  }
}

