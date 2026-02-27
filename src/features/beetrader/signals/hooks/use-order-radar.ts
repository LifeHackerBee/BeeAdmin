import { useState, useCallback } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

// ============================================
// 类型定义
// ============================================

export interface VegasInfo {
  upper: number
  lower: number
  mid: number
  width: number
  width_pct: number
  position: 'above' | 'below' | 'inside'
  trend: 'expanding' | 'contracting' | 'stable' | 'insufficient_data'
  signal_bullish: boolean
  signal_bearish: boolean
}

export interface L1Trend {
  is_bullish: boolean
  ema12: number
  ema144: number
  vegas: VegasInfo
}

export interface RsiInfo {
  rsi: number | null
  oversold: boolean
  overbought: boolean
  bull_divergence: boolean
  bear_divergence: boolean
}

export interface CvdInfo {
  cvd_trend: string
  cvd_confirmed: boolean
  cvd_declining: boolean
  cvd_rising: boolean
}

export interface WallInfo {
  label: string
  price: number
  size: number
  dist_pct: number
}

export interface VolumeInfo {
  recent: number
  ma20: number
  ratio: number
  low_volume: boolean
}

export interface VwapInfo {
  value: number | null
  intraday: boolean
  dist_pct: number | null
}

export interface ConsolidationSignal {
  active: boolean
  reason: string
  [key: string]: unknown
}

export interface ConsolidationInfo {
  is_consolidation: boolean
  signal_count: number
  signals: {
    ema_twist: ConsolidationSignal
    bb_squeeze: ConsolidationSignal
    rsi_deadzone: ConsolidationSignal
    wall_sandwich: ConsolidationSignal
  }
}

export interface KeyLevel {
  name: string
  price: number
  is_resistance: boolean
  dist_pct: number
  status: string
}

export interface TradeAdvice {
  entry: number
  stop: number
  take_profit: number | null
  entry_basis: string
  tp_basis: string
}

export interface StrategyLayers {
  l1: boolean
  l2: boolean
  l3: boolean
  l4: boolean
  count: number
}

export interface StrategyInfo {
  resonance_threshold: number
  long: StrategyLayers
  short: StrategyLayers
  recommendation: 'long' | 'short' | 'neutral' | 'wait'
  long_advice: TradeAdvice | null
  short_advice: TradeAdvice | null
}

export interface ChartData {
  volume_profile: {
    '1h': { price: number; volume: number }[]
    '4h': { price: number; volume: number }[]
  }
  l2_walls: {
    bids: { price: number; size: number }[]
    asks: { price: number; size: number }[]
  }
}

export interface OrderRadarData {
  coin: string
  current_price: number
  boll_pct: number | null
  l1_trend: L1Trend
  l2_bollinger: { upper: number; lower: number }
  l3_rsi: RsiInfo
  l4_cvd: CvdInfo
  walls: WallInfo[]
  chart_data: ChartData
  volume: VolumeInfo
  vwap: VwapInfo
  consolidation: ConsolidationInfo
  key_levels: KeyLevel[]
  strategy: StrategyInfo
}

interface OrderRadarResponse {
  success: boolean
  coin: string | null
  data: OrderRadarData | null
  error: string | null
}

// ============================================
// Hook
// ============================================

export function useOrderRadar() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<OrderRadarData | null>(null)

  const analyze = useCallback(async (coin: string = 'BTC') => {
    try {
      setLoading(true)
      setError(null)

      const result = await hyperliquidApiGet<OrderRadarResponse>(
        `/api/order_radar/analyze?coin=${encodeURIComponent(coin.toUpperCase())}`
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
