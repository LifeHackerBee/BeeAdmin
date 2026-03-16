import { useState, useCallback } from 'react'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { aiStrategySchema, type AiStrategyOutput } from '../../strategies/hooks/use-ai-strategy'
import type { OrderRadarData } from './use-order-radar'

// ── System Prompt ──

const SYSTEM_PROMPT = `你是一位专业的加密货币短线交易员，擅长订单流分析和市场微观结构判断。

你将收到一份币种的订单流与市场结构数据，包含：
1. **S/R 支撑压力位** (短期/中期/长期三档，含强度)
2. **订单块** (看涨/看跌订单块区间)
3. **CVD 累计量差** (趋势 + 背离信号)
4. **OI & 资金费率** (持仓量 + 费率趋势)
5. **趋势过滤** (VWAP 偏离 + EMA12 斜率)
6. **布林带** (1H/4H 上下轨 + 价格位置)
7. **MACD 4H** (交叉信号 + 柱状趋势)

## 分析原则

1. **S/R 优先**: 入场点必须靠近强支撑或强压力位，不在无人区开仓。
2. **订单流验证**: CVD 背离 + 订单块共振是最强入场信号。看涨订单块内的底背离 = 极佳多头入场。
3. **资金费率反转**: 费率极端偏移时，反向操作胜率更高 (正向极端 → 做空; 负向极端 → 做多)。
4. **VWAP 锚定**: 价格偏离 VWAP 过远时倾向回归; 贴近 VWAP 时观察方向性突破。
5. **盈亏比硬约束**: 必须 >= 1.5:1, 不满足则观望。
6. **进场灵活**: 给出合理的建仓区间，不必严格踩点。

## 输出要求

根据数据分析后，输出一个结构化的交易策略：
1. 交易方向、建仓区间、止损、止盈
2. **核心关键位**: 今日多空分水岭价格，结合 VWAP、EMA12、布林中轨综合判断
3. **上方压力位**: 2-3个，从近到远 (如布林上轨、强 S/R、看跌订单块上沿)
4. **下方支撑位**: 2-3个，从近到远 (如布林下轨、强 S/R、看涨订单块下沿)
5. 如果没有明确机会, direction 设为 "wait", 但仍需输出关键位信息`

// ── 格式化辅助 ──

function fmtSrTier(tier: OrderRadarData['entry_trigger']['sr_levels']['short_term']): string {
  if (!tier) return '无数据'
  const supports = (tier.supports ?? []).map((s) => `${s.price}(${s.source},${s.strength})`).join(', ')
  const resistances = (tier.resistances ?? []).map((r) => `${r.price}(${r.source},${r.strength})`).join(', ')
  return `支撑=[${supports || '无'}] 压力=[${resistances || '无'}]`
}

function fmtOrderBlocks(ob: OrderRadarData['entry_trigger']['order_blocks']): string {
  const bulls = ob.bullish.map((b) => `${b.low}-${b.high}(${(b.strength * 100).toFixed(0)}%)`).join(', ')
  const bears = ob.bearish.map((b) => `${b.low}-${b.high}(${(b.strength * 100).toFixed(0)}%)`).join(', ')
  return `看涨=[${bulls || '无'}] 看跌=[${bears || '无'}]`
}

// ── Hook ──

export function useHackerBeeAI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<AiStrategyOutput | null>(null)

  const generate = useCallback(async (data: OrderRadarData) => {
    try {
      setLoading(true)
      setError(null)

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      const baseURL = import.meta.env.VITE_OPENAI_BASE_URL
      const modelName = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o'

      if (!apiKey) {
        throw new Error('未配置 VITE_OPENAI_API_KEY 环境变量')
      }

      const model = new ChatOpenAI({
        apiKey,
        model: modelName,
        configuration: { baseURL },
        temperature: 0.3,
      })

      const structured = model.withStructuredOutput(aiStrategySchema)

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', SYSTEM_PROMPT],
        ['human', `请分析以下 {coin} 的订单流数据并生成交易策略：

当前价格: {current_price}

## S/R 支撑压力位
短期: {sr_short}
中期: {sr_mid}
长期: {sr_long}

## 订单块
{order_blocks}

## CVD 累计量差
趋势: {cvd_trend}, CVD值: {cvd_value}
底背离: {cvd_bull_div}, 顶背离: {cvd_bear_div}

## OI & 资金费率
OI: {oi}, 费率: {funding_rate}
费率趋势: {funding_trend}

## 趋势过滤
VWAP: {vwap}, 偏离: {vwap_dist}
EMA12: {ema12}, 斜率: {ema_slope}, 价格{ema_pos}EMA

## 布林带
1H: {bb_1h_lower} – {bb_1h_upper}, 位置: {bb_pct}%
4H: {bb_4h_lower} – {bb_4h_upper}

## MACD 4H
MACD: {macd_val}, 信号线: {macd_signal}, 柱状: {macd_hist}
交叉: {macd_cross}, 柱状趋势: {macd_hist_trend}`],
      ])

      const { entry_trigger, trend_filter, tp_sl_reference } = data
      const { sr_levels, order_blocks, cvd, oi } = entry_trigger
      const { vwap, ema } = trend_filter
      const { bollinger, macd } = tp_sl_reference

      const chain = prompt.pipe(structured)
      const output = await chain.invoke({
        coin: data.coin,
        current_price: data.current_price,
        // S/R
        sr_short: fmtSrTier(sr_levels.short_term),
        sr_mid: fmtSrTier(sr_levels.medium_term),
        sr_long: fmtSrTier(sr_levels.long_term),
        // 订单块
        order_blocks: fmtOrderBlocks(order_blocks),
        // CVD
        cvd_trend: cvd.trend,
        cvd_value: cvd.value.toFixed(1),
        cvd_bull_div: cvd.bull_divergence ? '是' : '否',
        cvd_bear_div: cvd.bear_divergence ? '是' : '否',
        // OI
        oi: oi.open_interest != null ? oi.open_interest.toLocaleString() : '未知',
        funding_rate: oi.funding_rate != null ? `${(oi.funding_rate * 100).toFixed(4)}%` : '未知',
        funding_trend: oi.funding_trend === 'positive' ? '正向(多头付费)' : oi.funding_trend === 'negative' ? '负向(空头付费)' : '中性',
        // 趋势过滤
        vwap: vwap.value != null ? vwap.value.toFixed(2) : '未知',
        vwap_dist: vwap.dist_pct != null ? `${vwap.dist_pct > 0 ? '+' : ''}${vwap.dist_pct.toFixed(2)}%` : '未知',
        ema12: ema.ema12.toFixed(2),
        ema_slope: ema.slope === 'up' ? '上升' : ema.slope === 'down' ? '下降' : '平坦',
        ema_pos: ema.price_vs_ema === 'above' ? '在上方' : '在下方',
        // 布林带
        bb_1h_lower: bollinger.lower.toFixed(2),
        bb_1h_upper: bollinger.upper.toFixed(2),
        bb_pct: bollinger.pct != null ? bollinger.pct.toString() : '未知',
        bb_4h_lower: bollinger.lower_4h != null ? bollinger.lower_4h.toFixed(2) : '未知',
        bb_4h_upper: bollinger.upper_4h != null ? bollinger.upper_4h.toFixed(2) : '未知',
        // MACD
        macd_val: macd.macd.toFixed(2),
        macd_signal: macd.signal.toFixed(2),
        macd_hist: macd.histogram.toFixed(2),
        macd_cross: macd.cross === 'golden' ? '金叉' : macd.cross === 'death' ? '死叉' : '无交叉',
        macd_hist_trend: macd.histogram_trend === 'expanding' ? '扩张' : '收缩',
      })

      setResult(output)
      return output
    } catch (err) {
      const e = err instanceof Error ? err : new Error('黑客蜂 AI 策略生成失败')
      setError(e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { generate, loading, error, result, reset }
}
