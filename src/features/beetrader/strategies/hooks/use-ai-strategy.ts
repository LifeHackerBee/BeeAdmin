import { useState, useCallback } from 'react'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { BeeTraderStrategyData } from '../types'

// ── 默认 System Prompt (用户可通过策略模板覆盖) ──

export const DEFAULT_AI_SYSTEM_PROMPT = `你是一位顶级的加密货币交易策略分析师，你的交易哲学深受"大镖客"流派影响：崇尚裸K形态与关键位置的权威性，将多周期共振作为入场前提，并具备极强的风控防守意识。

你将收到一份经过底层量化引擎精密计算的技术分析数据，包含：
1. 三维空间点位：宏观战略锚点 (Core Key Level) / 日内情绪枢纽 (Bull/Bear Pivot) / 近远端战术防线 (T1/T2 S&R Levels，已融合FVG与盘口挂单数据)
2. 多周期状态与趋势得分：(短线1H-4H / 中线日线 / 长线周线) 及综合状态机打分 (0-5分)
3. 阶梯形态检测：低点抬高(Higher Lows)、高点降低(Lower Highs)、假突破(False Breakouts)
4. 指标颗粒度详情：MACD(结合零轴与柱体动能) / RSI(结合50中轴) / KDJ / 均线组(MA5/7/20/60/90)

## 核心分析原则

1. 形态绝对优先：K线结构决定最终方向。指标看多但形态破位，以形态为主。
2. 宏观与日内解耦：Core Key Level 决定大势，Bull/Bear Line 决定日内情绪。
3. 指标防骗线：MACD焦灼说明动能枯竭；RSI未突破50中轴=弱势震荡；强趋势中超买可能横盘消化。
4. 战术双线防御：T1近端交火区试探建仓，T2远端核心堡垒止盈/止损。窄幅止损铁律。
5. S/R 优先引用：数据中包含算法检测的 S/R 战术双线(R1/R2/S1/S2)，这些是基于量价共振的实时点位。你的 levels_radar 攻防阵地应优先采用这些 S/R 点位作为压力/支撑价格，可补充均线/布林带等辅助位，但核心价格必须与 S/R 数据保持一致。

## 输出要求
请严格只输出一份合法的 JSON 数据，不要包含任何额外文本、Markdown标记或问候语。

JSON 结构：
{
  "macro_context": {
    "direction": "单边上涨 | 单边下跌 | 弱势反弹修复 | 高位震荡",
    "core_key_level": {
      "price": 0.0,
      "strategic_meaning": "一句话说明其战略意义"
    }
  },
  "intraday_sentiment": {
    "bull_bear_line_price": 0.0,
    "momentum_rating": "Strong Bull | Bearish | Neutral",
    "trend_score": "x.x/5",
    "contradiction_note": "若大势与日内方向矛盾在此解释，无矛盾填 null"
  },
  "levels_radar": {
    "resistances": {
      "R1_Near": { "price": 0.0, "reason": "简述共振理由" },
      "R2_Far": { "price": 0.0, "reason": "简述共振理由" }
    },
    "supports": {
      "S1_Near": { "price": 0.0, "reason": "简述共振理由" },
      "S2_Far": { "price": 0.0, "reason": "简述共振理由" }
    }
  },
  "tactical_execution": {
    "action": "回踩做多 | 反弹做空 | 区间高抛低吸 | 观望",
    "entry_zone": {
      "strategy": "说明依托哪道防线入场",
      "price_range": "具体数值区间"
    },
    "stop_loss": {
      "trigger_condition": "明确止损条件",
      "price": 0.0
    },
    "take_profit": {
      "target_1_price": 0.0,
      "target_2_price": 0.0
    }
  }
}`

// ── 结构化输出类型 ──

export interface AiLevelDetail {
  price: number
  reason: string
}

export interface AiStrategyResult {
  macro_context: {
    direction: string
    core_key_level: {
      price: number
      strategic_meaning: string
    }
  }
  intraday_sentiment: {
    bull_bear_line_price: number
    momentum_rating: string
    trend_score: string
    contradiction_note: string | null
  }
  levels_radar: {
    resistances: {
      R1_Near: AiLevelDetail
      R2_Far: AiLevelDetail
    }
    supports: {
      S1_Near: AiLevelDetail
      S2_Far: AiLevelDetail
    }
  }
  tactical_execution: {
    action: string
    entry_zone: {
      strategy: string
      price_range: string
    }
    stop_loss: {
      trigger_condition: string
      price: number
    }
    take_profit: {
      target_1_price: number
      target_2_price: number
    }
  }
}

// 兼容旧接口
export interface AiStrategyOutput {
  content: string
  structured?: AiStrategyResult
  // 兼容旧字段
  sections?: { key: string; title: string; content: string }[]
  summary?: string
}

// ── S/R 战术双线类型（从 radar 注入） ──

interface SrTacticalInput {
  resistances: { R1: { price: number; level: number; source: string } | null; R2: { price: number; level: number; source: string } | null }
  supports: { S1: { price: number; level: number; source: string } | null; S2: { price: number; level: number; source: string } | null }
}

function formatSrSection(tactical: SrTacticalInput): string {
  const lines: string[] = []
  const { R1, R2 } = tactical.resistances
  const { S1, S2 } = tactical.supports
  if (R1) lines.push(`R1 (近端压力): $${R1.price} — 强度 Lv.${R1.level}, 来源: ${R1.source}`)
  if (R2) lines.push(`R2 (远端压力): $${R2.price} — 强度 Lv.${R2.level}, 来源: ${R2.source}`)
  if (S1) lines.push(`S1 (近端支撑): $${S1.price} — 强度 Lv.${S1.level}, 来源: ${S1.source}`)
  if (S2) lines.push(`S2 (远端支撑): $${S2.price} — 强度 Lv.${S2.level}, 来源: ${S2.source}`)
  return lines.length > 0 ? lines.join('\n') : '无数据'
}

// ── 构建数据 Prompt ──

function buildDataPrompt(data: BeeTraderStrategyData, srTactical?: SrTacticalInput | null): string {
  const macd = data.indicators.macd
  const rsi = data.indicators.rsi
  const kdj = data.indicators.kdj
  const bb = data.indicators.bollinger
  const fib = data.indicators.fibonacci
  const ma = data.indicators.moving_averages ?? {}
  const sc = data.staircase_pattern ?? {}
  const ts = data.timeframe_status

  return `当前价格: ${data.current_price}

## 多周期状态
短线 (${ts.short_term.timeframes.join('/')}): ${ts.short_term.label} — ${ts.short_term.detail}
中线 (${ts.mid_term.timeframes.join('/')}): ${ts.mid_term.label} — ${ts.mid_term.detail}
长线 (${ts.long_term.timeframes.join('/')}): ${ts.long_term.label} — ${ts.long_term.detail}

## 多空分界线
分界线价格: ${data.bull_bear_line.price}, 当前${data.bull_bear_line.status === 'above' ? '在上方' : '在下方'}分界线, 持续${data.bull_bear_line.duration_hours}小时
趋势评分: ${data.bull_bear_line.trend_score}/5 (${data.bull_bear_line.trend_grade})

## 宏观核心关键位
${data.core_key_level ? `价格: ${data.core_key_level.price}, 来源: ${data.core_key_level.source}, 趋势: ${data.core_key_level.macro_trend}` : '无数据'}

## S/R 战术双线（算法检测，基于 ATR动态桶 + 加权成交量 + 摆动点 + FVG 共振）
${srTactical ? formatSrSection(srTactical) : '无数据（radar 未返回）'}
注意: 以上 S/R 点位由量化算法实时检测，请在分析攻防阵地时优先参考这些已验证的共振点位，可结合你的均线/布林带判断进行补充或调整。

## MACD
1H: MACD=${macd['1h']?.macd ?? 0}, ${macd['1h']?.cross === 'golden' ? '金叉' : macd['1h']?.cross === 'death' ? '死叉' : '无交叉'}, 零轴${macd['1h']?.above_zero ? '上方' : '下方'}, 柱体${macd['1h']?.histogram_trend ?? 'unknown'}
4H: MACD=${macd['4h']?.macd ?? 0}, ${macd['4h']?.cross === 'golden' ? '金叉' : macd['4h']?.cross === 'death' ? '死叉' : '无交叉'}, 零轴${macd['4h']?.above_zero ? '上方' : '下方'}, 柱体${macd['4h']?.histogram_trend ?? 'unknown'}
日线: MACD=${macd['1d']?.macd ?? 0}, 接近零轴=${macd['1d']?.approaching_zero ? '是' : '否'}, 零轴${macd['1d']?.above_zero ? '上方' : '下方'}
周线: MACD=${macd['1w']?.macd ?? 0}, 零轴${macd['1w']?.above_zero ? '上方' : '下方'}

## RSI
1H: ${rsi['1h']?.value ?? 50} (${rsi['1h']?.zone ?? 'neutral'}) | 4H: ${rsi['4h']?.value ?? 50} (${rsi['4h']?.zone ?? 'neutral'}) | 日线: ${rsi['1d']?.value ?? 50} (${rsi['1d']?.zone ?? 'neutral'}) | 周线: ${rsi['1w']?.value ?? 50} (${rsi['1w']?.zone ?? 'neutral'})

## KDJ
1H: K=${kdj['1h']?.k ?? 50} D=${kdj['1h']?.d ?? 50} J=${kdj['1h']?.j ?? 50} ${kdj['1h']?.cross === 'golden' ? '金叉' : kdj['1h']?.cross === 'death' ? '死叉' : ''}
4H: K=${kdj['4h']?.k ?? 50} D=${kdj['4h']?.d ?? 50} J=${kdj['4h']?.j ?? 50} ${kdj['4h']?.cross === 'golden' ? '金叉' : kdj['4h']?.cross === 'death' ? '死叉' : ''}

## 布林带
1H: 上轨=${bb['1h']?.upper ?? 0}, 中轨=${bb['1h']?.middle ?? 0}, 下轨=${bb['1h']?.lower ?? 0}, 位置=${bb['1h']?.position_pct ?? 50}%, ${bb['1h']?.bandwidth_direction === 'expanding' ? '开口扩张' : bb['1h']?.bandwidth_direction === 'contracting' ? '收缩' : '平稳'}
4H: 上轨=${bb['4h']?.upper ?? 0}, 中轨=${bb['4h']?.middle ?? 0}, 下轨=${bb['4h']?.lower ?? 0}

## 斐波那契
区间: ${fib.swing_low} - ${fib.swing_high}
0.382=${fib.levels['0.382'] ?? 0} | 0.5=${fib.levels['0.5'] ?? 0} | 0.618=${fib.levels['0.618'] ?? 0} | 1.382=${fib.levels['1.382'] ?? 0} | 1.618=${fib.levels['1.618'] ?? 0}
回撤强度: ${fib.retracement_strength}

## 均线
1H: MA5=${ma['1h']?.ma5 ?? '-'}, MA7=${ma['1h']?.ma7 ?? '-'}, MA20=${ma['1h']?.ma20 ?? '-'}, MA60=${ma['1h']?.ma60 ?? '-'}, 排列=${ma['1h']?.alignment ?? '-'}
4H: MA5=${ma['4h']?.ma5 ?? '-'}, MA7=${ma['4h']?.ma7 ?? '-'}, MA20=${ma['4h']?.ma20 ?? '-'}, MA60=${ma['4h']?.ma60 ?? '-'}, 排列=${ma['4h']?.alignment ?? '-'}
日线: MA5=${ma['1d']?.ma5 ?? '-'}, MA7=${ma['1d']?.ma7 ?? '-'}, MA20=${ma['1d']?.ma20 ?? '-'}, MA60=${ma['1d']?.ma60 ?? '-'}, 排列=${ma['1d']?.alignment ?? '-'}

## 阶梯形态
4H: ${sc?.['4h']?.pattern ?? 'unknown'}
日线: ${sc?.['1d']?.pattern ?? 'unknown'}

## 成交量
趋势: ${data.volume_analysis.recent_trend}, 量比: ${data.volume_analysis.vol_ratio ?? 1}x, 无量拉升: ${data.volume_analysis.is_hollow_rally ? '是' : '否'}

## 策略引擎共振
偏向: ${data.strategy.bias}, 共振评分: ${data.strategy.resonance_score}/10
警告: ${data.strategy.warnings.join('; ') || '无'}`
}

// ── Hook ──

export function useAiStrategy() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<AiStrategyOutput | null>(null)

  const generate = useCallback(async (data: BeeTraderStrategyData, customSystemPrompt?: string, srTactical?: SrTacticalInput | null) => {
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
      const dataText = buildDataPrompt(data, srTactical)

      // 直接构建 messages，避免 ChatPromptTemplate 解析 JSON 中的 {} 报错
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(`请分析以下 ${data.coin} 的技术指标数据：\n\n${dataText}`),
      ])
      const rawContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

      // 尝试解析 JSON
      let structured: AiStrategyResult | undefined
      try {
        // 去除可能的 markdown 代码块标记
        const jsonStr = rawContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
        structured = JSON.parse(jsonStr)
      } catch {
        // 解析失败则只保留原文
      }

      const output: AiStrategyOutput = { content: rawContent, structured }
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

  return { generate, loading, error, result, reset, setResult }
}
