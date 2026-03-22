// ============================================
// 大镖客策略分析 — 类型定义
// ============================================

// ── MACD 指标 ──
export interface MacdIndicator {
  macd: number
  signal: number
  histogram: number
  cross: 'golden' | 'death' | null
  histogram_trend: 'expanding' | 'contracting' | 'unknown'
  zero_distance: number
  above_zero: boolean
  approaching_zero: boolean
}

// ── 布林带 ──
export interface BollingerIndicator {
  upper: number
  middle: number
  lower: number
  position_pct: number
  bandwidth_direction: 'expanding' | 'contracting' | 'flat'
  price_vs_middle: 'above' | 'below' | 'at'
}

// ── RSI ──
export interface RsiIndicator {
  value: number
  zone: 'overbought' | 'neutral_bullish' | 'neutral_bearish' | 'oversold'
}

// ── KDJ ──
export interface KdjIndicator {
  k: number
  d: number
  j: number
  cross: 'golden' | 'death' | null
  zone: 'overbought' | 'oversold' | 'bullish' | 'bearish' | 'neutral'
  j_extreme: 'extreme_overbought' | 'extreme_oversold' | null
}

// ── 均线 ──
export interface MovingAverages {
  ma5: number | null
  ma7: number | null
  ma20: number | null
  ma60: number | null
  alignment: 'bullish' | 'bearish' | 'mixed' | 'unknown'
}

// ── 阶梯式形态 ──
export interface StaircasePattern {
  pattern: 'higher_lows' | 'lower_lows' | 'staircase_up' | 'unknown'
  swing_lows: number[]
  swing_highs: number[]
}

// ── 斐波那契 ──
export interface FibonacciData {
  swing_high: number
  swing_low: number
  levels: Record<string, number>
  current_position: string
  retracement_pct: number
  retracement_strength: string
}

// ── 综合指标集 ──
export interface Indicators {
  macd: Record<string, MacdIndicator>
  bollinger: Record<string, BollingerIndicator>
  rsi: Record<string, RsiIndicator>
  kdj: Record<string, KdjIndicator>
  fibonacci: FibonacciData
  moving_averages: Record<string, MovingAverages>
}

// ── 多周期状态 ──
export interface TimeframeItem {
  timeframes: string[]
  status: string
  label: string
  detail: string
}

export interface TimeframeStatus {
  short_term: TimeframeItem
  mid_term: TimeframeItem
  long_term: TimeframeItem
}

// ── 多空分界线 ──
export interface BullBearLineComponent {
  name: string
  value: number
  weight: number
  above?: boolean
}

export interface BullBearLine {
  price: number
  status: 'above' | 'below' | 'neutral' | 'unknown'
  duration_hours: number
  trend_score?: number
  trend_grade?: 'strong_bull' | 'ranging' | 'bearish'
  base_source?: string
  components: BullBearLineComponent[]
  hint: string
}

// ── 成交量分析 ──
export interface VolumeAnalysis {
  recent_trend: 'increasing' | 'declining' | 'stable' | 'unknown'
  vol_ratio: number
  price_change_pct: number
  is_hollow_rally: boolean
  volume_price_match: boolean
  hint: string
}

// ── 共振详情 ──
export interface ResonanceDetail {
  indicator: string
  signal: 'bullish' | 'bearish' | 'neutral' | 'confirmed' | 'warning'
  weight: number
  state?: string
}

// ── 关键位 ──
export interface KeyLevels {
  bull_bear_line: number
  entry_zone: [number, number]
  stop_loss: number
  take_profit_1: number
  take_profit_2: number
}

// ── 策略建议 ──
export interface Strategy {
  bias: string
  entry_strategy: string
  resonance_score: number
  resonance_details: ResonanceDetail[]
  key_levels: KeyLevels
  warnings: string[]
  error_prevention: string
}

// ── 完整分析数据 ──
export interface BeeTraderStrategyData {
  coin: string
  current_price: number
  timestamp: string
  timeframe_status: TimeframeStatus
  indicators: Indicators
  bull_bear_line: BullBearLine
  volume_analysis: VolumeAnalysis
  staircase_pattern: Record<string, StaircasePattern>
  strategy: Strategy
}

// ── API 响应 ──
export interface BeeTraderStrategyResponse {
  success: boolean
  coin: string | null
  data: BeeTraderStrategyData | null
  error: string | null
}
