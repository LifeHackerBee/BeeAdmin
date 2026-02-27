import { useState, useCallback } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

// ============================================
// 类型定义
// ============================================

export interface LiquidationPoint {
  price: number
  liquidation_leverage: number
  cumulative_leverage: number | null
}

export interface LiquidationMeta {
  total_long_leverage: number
  total_short_leverage: number
  long_count: number
  short_count: number
}

export interface LiquidationData {
  current_price: number | null
  timestamp: string
  long: LiquidationPoint[]
  short: LiquidationPoint[]
  meta: LiquidationMeta
}

interface LiquidationMapResponse {
  success: boolean
  symbol: string
  data: LiquidationData
}

// ============================================
// Hook
// ============================================

export function useLiquidationMap() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<LiquidationData | null>(null)

  const fetch = useCallback(async (symbol: string = 'BTC') => {
    try {
      setLoading(true)
      setError(null)

      const result = await hyperliquidApiGet<LiquidationMapResponse>(
        `/api/hyperliquid/market/liquidation-map/${encodeURIComponent(symbol.toUpperCase())}`
      )

      if (!result.success || !result.data) {
        throw new Error('获取清算数据失败')
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

  return { fetch, loading, error, data, reset }
}
