import { useState, useCallback } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import type { BeeTraderStrategyData, BeeTraderStrategyResponse } from '../types'

export function useBeeTraderStrategy() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<BeeTraderStrategyData | null>(null)

  const analyze = useCallback(async (coin: string = 'BTC') => {
    try {
      setLoading(true)
      setError(null)

      const result = await hyperliquidApiGet<BeeTraderStrategyResponse>(
        `/api/beetrader_strategy/analyze?coin=${encodeURIComponent(coin)}`
      )

      if (!result.success || !result.data) {
        throw new Error(result.error || '分析失败')
      }

      setData(result.data)
      return result.data
    } catch (err) {
      const error = err instanceof Error ? err : new Error('请求失败')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return { analyze, loading, error, data, reset }
}
