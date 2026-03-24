import { useState, useCallback } from 'react'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { BeeTraderStrategyData } from '../types'

// ── 默认 System Prompt ──

export const DEFAULT_AI_SYSTEM_PROMPT = `你是一位专业的加密货币交易策略分析师，擅长多周期技术分析。

你将收到一份币种的完整技术分析数据，包含：
1. **多周期状态** (短线1H-4H / 中线日线 / 长线周线)
2. **技术指标** (MACD含零轴分析 / 布林带 / RSI / KDJ / 斐波那契回撤+扩展 / 均线MA5/7/20/60)
3. **多空分界线** (基于日线中轨+4H EMA20+日线MA60+VWAP加权)
4. **成交量分析** (量价匹配 / 无量拉升检测)
5. **阶梯形态** (低点抬高/降低, 阶梯式上涨/下跌)
6. **策略引擎的初步建议** (共振评分 / 偏向 / 关键位)

## 分析原则

1. **多周期协同**: 大周期定方向, 小周期找入场。如果周线偏弱, 即使日线/小时线看多, 也只做短线, 不重仓。
2. **零轴引力**: 日线MACD向零轴修复时, 零轴自带阻力。如果MACD回抽零轴但价格未突破上方强压, 极易受阻回落。
3. **量价验证**: 无量拉升不追高。放量突破才确认有效。
4. **顺大势逆小势**: 偏多时不追涨, 等弱势回踩到支撑位再接多; 偏空时不追跌, 等反弹到压力位再做空。
5. **盈亏比硬约束**: 必须 >= 1.5:1, 不满足则观望。
6. **进场灵活**: 给出合理的建仓区间, 不必严格踩点。

## 输出要求

请用中文输出完整的交易策略分析，包含:
1. **方向判断**: 做多/做空/观望，以及信心度(1-10)
2. **入场策略**: 具体建仓区间和入场逻辑
3. **止盈止损**: 具体价位和理由
4. **关键位**: 核心多空分水岭、上方压力位、下方支撑位
5. **风险提示**: 需要关注的风险因素
6. **分析理由**: 引用具体指标数据支撑你的判断`

// ── AI 输出类型（纯文本） ──

export interface AiStrategyOutput {
  content: string
}

// ── Hook ──

export function useAiStrategy() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<AiStrategyOutput | null>(null)

  const generate = useCallback(async (data: BeeTraderStrategyData, customSystemPrompt?: string) => {
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

      const systemPrompt = customSystemPrompt || DEFAULT_AI_SYSTEM_PROMPT

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        ['human', `请分析以下 {coin} 的技术指标数据并生成交易策略：

当前价格: ${data.current_price}

## 多周期状态
短线 ({short_tf}): {short_status} — {short_detail}
中线 ({mid_tf}): {mid_status} — {mid_detail}
长线 ({long_tf}): {long_status} — {long_detail}

## 多空分界线
分界线价格: {bull_bear_price}, 当前{bull_bear_status}分界线, 持续{bull_bear_hours}小时

## MACD
1H: MACD={macd_1h_val}, {macd_1h_cross}, 零轴{macd_1h_zero}
4H: MACD={macd_4h_val}, {macd_4h_cross}, 零轴{macd_4h_zero}
日线: MACD={macd_1d_val}, 接近零轴={macd_1d_approaching}, 零轴{macd_1d_zero}
周线: MACD={macd_1w_val}, 零轴{macd_1w_zero}

## RSI
1H: {rsi_1h} ({rsi_1h_zone}) | 4H: {rsi_4h} ({rsi_4h_zone}) | 日线: {rsi_1d} ({rsi_1d_zone}) | 周线: {rsi_1w} ({rsi_1w_zone})

## KDJ
1H: K={kdj_1h_k} D={kdj_1h_d} J={kdj_1h_j} {kdj_1h_cross}
4H: K={kdj_4h_k} D={kdj_4h_d} J={kdj_4h_j} {kdj_4h_cross}

## 布林带
1H: 上轨={bb_1h_upper}, 中轨={bb_1h_middle}, 下轨={bb_1h_lower}, 位置={bb_1h_pct}%, {bb_1h_dir}
4H: 上轨={bb_4h_upper}, 中轨={bb_4h_middle}, 下轨={bb_4h_lower}

## 斐波那契
区间: {fib_low} - {fib_high}
0.382={fib_382} | 0.5={fib_500} | 0.618={fib_618} | 1.382={fib_1382} | 1.618={fib_1618}
回撤强度: {fib_strength}

## 均线 MA
1H: MA5={ma_1h_5}, MA7={ma_1h_7}, MA20={ma_1h_20}, MA60={ma_1h_60}, 排列={ma_1h_align}
4H: MA5={ma_4h_5}, MA7={ma_4h_7}, MA20={ma_4h_20}, MA60={ma_4h_60}, 排列={ma_4h_align}
日线: MA5={ma_1d_5}, MA7={ma_1d_7}, MA20={ma_1d_20}, MA60={ma_1d_60}, 排列={ma_1d_align}

## 阶梯形态
4H: {staircase_4h}
日线: {staircase_1d}

## 成交量
趋势: {vol_trend}, 量比: {vol_ratio}x, 无量拉升: {vol_hollow}

## 策略引擎建议
偏向: {strategy_bias}, 共振评分: {resonance_score}/10
入场策略: {entry_strategy}
警告: {warnings}`],
      ])

      const macd = data.indicators.macd
      const rsi = data.indicators.rsi
      const kdj = data.indicators.kdj
      const bb = data.indicators.bollinger
      const fib = data.indicators.fibonacci
      const ma = data.indicators.moving_averages ?? {}
      const sc = data.staircase_pattern ?? {}
      const ts = data.timeframe_status

      const chain = prompt.pipe(model)
      const response = await chain.invoke({
        coin: data.coin,
        short_tf: ts.short_term.timeframes.join('/'),
        short_status: ts.short_term.label,
        short_detail: ts.short_term.detail,
        mid_tf: ts.mid_term.timeframes.join('/'),
        mid_status: ts.mid_term.label,
        mid_detail: ts.mid_term.detail,
        long_tf: ts.long_term.timeframes.join('/'),
        long_status: ts.long_term.label,
        long_detail: ts.long_term.detail,
        bull_bear_price: data.bull_bear_line.price,
        bull_bear_status: data.bull_bear_line.status === 'above' ? '在上方' : '在下方',
        bull_bear_hours: data.bull_bear_line.duration_hours,
        macd_1h_val: macd['1h']?.macd ?? 0,
        macd_1h_cross: macd['1h']?.cross === 'golden' ? '金叉' : macd['1h']?.cross === 'death' ? '死叉' : '无交叉',
        macd_1h_zero: macd['1h']?.above_zero ? '上方' : '下方',
        macd_4h_val: macd['4h']?.macd ?? 0,
        macd_4h_cross: macd['4h']?.cross === 'golden' ? '金叉' : macd['4h']?.cross === 'death' ? '死叉' : '无交叉',
        macd_4h_zero: macd['4h']?.above_zero ? '上方' : '下方',
        macd_1d_val: macd['1d']?.macd ?? 0,
        macd_1d_approaching: macd['1d']?.approaching_zero ? '是' : '否',
        macd_1d_zero: macd['1d']?.above_zero ? '上方' : '下方',
        macd_1w_val: macd['1w']?.macd ?? 0,
        macd_1w_zero: macd['1w']?.above_zero ? '上方' : '下方',
        rsi_1h: rsi['1h']?.value ?? 50,
        rsi_1h_zone: rsi['1h']?.zone ?? 'neutral',
        rsi_4h: rsi['4h']?.value ?? 50,
        rsi_4h_zone: rsi['4h']?.zone ?? 'neutral',
        rsi_1d: rsi['1d']?.value ?? 50,
        rsi_1d_zone: rsi['1d']?.zone ?? 'neutral',
        rsi_1w: rsi['1w']?.value ?? 50,
        rsi_1w_zone: rsi['1w']?.zone ?? 'neutral',
        kdj_1h_k: kdj['1h']?.k ?? 50,
        kdj_1h_d: kdj['1h']?.d ?? 50,
        kdj_1h_j: kdj['1h']?.j ?? 50,
        kdj_1h_cross: kdj['1h']?.cross === 'golden' ? '金叉' : kdj['1h']?.cross === 'death' ? '死叉' : '',
        kdj_4h_k: kdj['4h']?.k ?? 50,
        kdj_4h_d: kdj['4h']?.d ?? 50,
        kdj_4h_j: kdj['4h']?.j ?? 50,
        kdj_4h_cross: kdj['4h']?.cross === 'golden' ? '金叉' : kdj['4h']?.cross === 'death' ? '死叉' : '',
        bb_1h_upper: bb['1h']?.upper ?? 0,
        bb_1h_middle: bb['1h']?.middle ?? 0,
        bb_1h_lower: bb['1h']?.lower ?? 0,
        bb_1h_pct: bb['1h']?.position_pct ?? 50,
        bb_1h_dir: bb['1h']?.bandwidth_direction === 'expanding' ? '开口扩张' : bb['1h']?.bandwidth_direction === 'contracting' ? '开口收缩' : '平稳',
        bb_4h_upper: bb['4h']?.upper ?? 0,
        bb_4h_middle: bb['4h']?.middle ?? 0,
        bb_4h_lower: bb['4h']?.lower ?? 0,
        fib_low: fib.swing_low,
        fib_high: fib.swing_high,
        fib_382: fib.levels['0.382'] ?? 0,
        fib_500: fib.levels['0.5'] ?? 0,
        fib_618: fib.levels['0.618'] ?? 0,
        fib_1382: fib.levels['1.382'] ?? 0,
        fib_1618: fib.levels['1.618'] ?? 0,
        fib_strength: fib.retracement_strength,
        ma_1h_5: ma['1h']?.ma5 ?? '-',
        ma_1h_7: ma['1h']?.ma7 ?? '-',
        ma_1h_20: ma['1h']?.ma20 ?? '-',
        ma_1h_60: ma['1h']?.ma60 ?? '-',
        ma_1h_align: ma['1h']?.alignment ?? 'unknown',
        ma_4h_5: ma['4h']?.ma5 ?? '-',
        ma_4h_7: ma['4h']?.ma7 ?? '-',
        ma_4h_20: ma['4h']?.ma20 ?? '-',
        ma_4h_60: ma['4h']?.ma60 ?? '-',
        ma_4h_align: ma['4h']?.alignment ?? 'unknown',
        ma_1d_5: ma['1d']?.ma5 ?? '-',
        ma_1d_7: ma['1d']?.ma7 ?? '-',
        ma_1d_20: ma['1d']?.ma20 ?? '-',
        ma_1d_60: ma['1d']?.ma60 ?? '-',
        ma_1d_align: ma['1d']?.alignment ?? 'unknown',
        staircase_4h: sc?.['4h']?.pattern ?? 'unknown',
        staircase_1d: sc?.['1d']?.pattern ?? 'unknown',
        vol_trend: data.volume_analysis.recent_trend,
        vol_ratio: data.volume_analysis.vol_ratio ?? 1,
        vol_hollow: data.volume_analysis.is_hollow_rally ? '是' : '否',
        strategy_bias: data.strategy.bias,
        resonance_score: data.strategy.resonance_score,
        entry_strategy: data.strategy.entry_strategy,
        warnings: data.strategy.warnings.join('; ') || '无',
      })

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
      const output: AiStrategyOutput = { content }
      setResult(output)
      return output
    } catch (err) {
      const e = err instanceof Error ? err : new Error('AI 策略生成失败')
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
