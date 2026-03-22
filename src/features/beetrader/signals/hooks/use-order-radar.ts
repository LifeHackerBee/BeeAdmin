import { useState, useCallback } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

// ============================================
// 类型定义 — 入场触发
// ============================================

export interface SrLevel {
  price: number
  source: string
  strength: 'institutional_wall' | 'strong_resonance' | 'strong' | 'moderate' | 'weak'
}

export interface SrTier {
  supports: SrLevel[]
  resistances: SrLevel[]
}

export interface TacticalLine {
  price: number
  level: number  // 1-5 强度等级
  source: string
}

export interface TacticalLines {
  resistances: { R1: TacticalLine | null; R2: TacticalLine | null }
  supports: { S1: TacticalLine | null; S2: TacticalLine | null }
}

export interface SrLevels {
  short_term: SrTier
  medium_term: SrTier
  long_term: SrTier
  tactical: TacticalLines
  hint: string
}

export interface OrderBlock {
  high: number
  low: number
  strength: number
}

export interface OrderBlockData {
  bullish: OrderBlock[]
  bearish: OrderBlock[]
  hint: string
}

export interface CvdData {
  trend: string
  value: number
  bull_divergence: boolean
  bear_divergence: boolean
  hint: string
}

export interface OiData {
  open_interest: number | null
  funding_rate: number | null
  funding_8h: number[]
  funding_trend: 'positive' | 'negative' | 'neutral'
  hint: string
}

export interface EntryTrigger {
  sr_levels: SrLevels
  order_blocks: OrderBlockData
  cvd: CvdData
  oi: OiData
}

// ============================================
// 类型定义 — 趋势过滤
// ============================================

export interface VwapData {
  value: number | null
  dist_pct: number | null
  intraday: boolean
  hint: string
}

export interface EmaData {
  ema12: number
  slope: 'up' | 'down' | 'flat'
  price_vs_ema: 'above' | 'below'
  hint: string
}

export interface TrendFilter {
  vwap: VwapData
  ema: EmaData
}

// ============================================
// 类型定义 — 止盈止损参考
// ============================================

export interface BollingerData {
  upper: number
  lower: number
  pct: number | null
  upper_4h: number | null
  lower_4h: number | null
  hint: string
}

export interface MacdData {
  macd: number
  signal: number
  histogram: number
  cross: 'golden' | 'death' | null
  histogram_trend: 'expanding' | 'contracting'
  hint: string
}

export interface TpSlReference {
  sr_levels: SrLevels
  bollinger: BollingerData
  macd: MacdData
}

// ============================================
// 类型定义 — 图表数据
// ============================================

export interface BollBand {
  upper: number
  lower: number
}

export interface ChartData {
  volume_profile: {
    '1h': { price: number; volume: number }[]
    '4h': { price: number; volume: number }[]
    '1d': { price: number; volume: number }[]
  }
  l2_walls: {
    bids: { price: number; size: number }[]
    asks: { price: number; size: number }[]
  }
  bollinger: {
    '1h': BollBand
    '4h': BollBand | null
  }
}

// ============================================
// 组合类型
// ============================================

export interface OrderRadarData {
  coin: string
  current_price: number
  entry_trigger: EntryTrigger
  trend_filter: TrendFilter
  tp_sl_reference: TpSlReference
  chart_data: ChartData
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
        `/api/order_radar/analyze?coin=${encodeURIComponent(coin)}`
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
