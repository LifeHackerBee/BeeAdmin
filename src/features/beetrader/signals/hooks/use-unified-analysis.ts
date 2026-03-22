import { useState, useCallback } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import type { OrderRadarData } from './use-order-radar'
import type { BeeTraderStrategyData } from '../../strategies/types'

interface UnifiedResponse {
  success: boolean
  coin: string
  radar: OrderRadarData | null
  strategy: BeeTraderStrategyData | null
  errors: Record<string, string>
}

export function useUnifiedAnalysis() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [radarData, setRadarData] = useState<OrderRadarData | null>(null)
  const [strategyData, setStrategyData] = useState<BeeTraderStrategyData | null>(null)

  const analyze = useCallback(async (coin: string = 'BTC') => {
    try {
      setLoading(true)
      setError(null)

      const result = await hyperliquidApiGet<UnifiedResponse>(
        `/api/unified/analyze?coin=${encodeURIComponent(coin)}`
      )

      if (!result.success && !result.radar && !result.strategy) {
        throw new Error(result.errors?.general || '分析失败')
      }

      setRadarData(result.radar)
      setStrategyData(result.strategy)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('请求失败')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setRadarData(null)
    setStrategyData(null)
    setError(null)
  }, [])

  const setStrategy = useCallback((data: BeeTraderStrategyData) => {
    setStrategyData(data)
  }, [])

  return { analyze, loading, error, radarData, strategyData, setStrategy, reset }
}
