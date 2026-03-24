import { useState, useCallback } from 'react'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { BeeTraderStrategyData } from '../types'

// ── 默认 System Prompt ──

export const DEFAULT_AI_SYSTEM_PROMPT = `你是一位专业的加密货币交易策略分析师，擅长多周期技术分析和大镖客方法论。

核心原则:
1. 多周期协同: 大周期定方向, 小周期找入场
2. 零轴引力: 日线MACD向零轴修复时, 零轴自带阻力
3. 量价验证: 无量拉升不追高, 放量突破才有效
4. 顺大势逆小势: 偏多时等回踩接多, 偏空时等反弹做空
5. 盈亏比硬约束: >= 1.5:1, 不满足则观望`

// ── 四段式 Prompt ──

const SECTION_PROMPTS = {
  macro: {
    title: '战略大局观',
    prompt: `基于以下技术指标数据，分析 {coin} 的**战略大局观 (Macro Context)**。

请用 Markdown 格式输出，要求：
- 周线/日线级别的趋势方向和强度
- 当前处于什么阶段（主升浪/回调/筑底/破位等）
- 大周期 MACD、RSI、均线排列给出的方向性判断
- 一句话总结当前大局观`,
  },
  sentiment: {
    title: '日内情绪面',
    prompt: `基于以下技术指标数据，分析 {coin} 的**日内情绪面 (Intraday Sentiment)**。

请用 Markdown 格式输出，要求：
- 多空分界线的位置和当前状态
- 1H/4H 级别的 KDJ、RSI 超买超卖状态
- 布林带开口方向和价格位置
- 成交量趋势和量价匹配情况
- 综合判断当前日内情绪偏多还是偏空`,
  },
  levels: {
    title: '攻防阵地数据明细',
    prompt: `基于以下技术指标数据，列出 {coin} 的**攻防阵地数据明细**。

请用 Markdown 表格或列表格式输出，要求：
- **核心多空分水岭**: 价格及判定依据
- **上方压力位**: 2-3 个价位，标注来源（如布林上轨、前高、斐波那契位、MA60）
- **下方支撑位**: 2-3 个价位，标注来源（如布林下轨、前低、斐波那契位）
- 斐波那契关键回撤/扩展位
- 均线系统的支撑压力（MA5/7/20/60）`,
  },
  action: {
    title: '策略动作',
    prompt: `基于以下技术指标数据和之前的分析背景，给出 {coin} 的**具体策略动作**。

请用 Markdown 格式输出，要求：
- **方向**: 做多/做空/观望，信心度 1-10
- **入场策略**: 具体建仓区间和入场条件
- **止盈位**: 具体价格和理由
- **止损位**: 具体价格和理由
- **盈亏比**: 计算结果
- **仓位建议**: 轻仓/标准/重仓
- **风险提示**: 需要注意的反转信号和风险因素
- **失效条件**: 什么情况下策略失效需要离场`,
  },
} as const

export type AiSectionKey = keyof typeof SECTION_PROMPTS

// ── AI 输出类型（四段式） ──

export interface AiStrategySection {
  key: AiSectionKey
  title: string
  content: string
}

export interface AiStrategyOutput {
  content: string // 保持兼容：完整文本
  sections?: AiStrategySection[]
}

// ── 构建 user prompt 的数据部分 ──

function buildDataPrompt(data: BeeTraderStrategyData): string {
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

## MACD
1H: MACD=${macd['1h']?.macd ?? 0}, ${macd['1h']?.cross === 'golden' ? '金叉' : macd['1h']?.cross === 'death' ? '死叉' : '无交叉'}, 零轴${macd['1h']?.above_zero ? '上方' : '下方'}
4H: MACD=${macd['4h']?.macd ?? 0}, ${macd['4h']?.cross === 'golden' ? '金叉' : macd['4h']?.cross === 'death' ? '死叉' : '无交叉'}, 零轴${macd['4h']?.above_zero ? '上方' : '下方'}
日线: MACD=${macd['1d']?.macd ?? 0}, 接近零轴=${macd['1d']?.approaching_zero ? '是' : '否'}, 零轴${macd['1d']?.above_zero ? '上方' : '下方'}
周线: MACD=${macd['1w']?.macd ?? 0}, 零轴${macd['1w']?.above_zero ? '上方' : '下方'}

## RSI
1H: ${rsi['1h']?.value ?? 50} (${rsi['1h']?.zone ?? 'neutral'}) | 4H: ${rsi['4h']?.value ?? 50} (${rsi['4h']?.zone ?? 'neutral'}) | 日线: ${rsi['1d']?.value ?? 50} (${rsi['1d']?.zone ?? 'neutral'}) | 周线: ${rsi['1w']?.value ?? 50} (${rsi['1w']?.zone ?? 'neutral'})

## KDJ
1H: K=${kdj['1h']?.k ?? 50} D=${kdj['1h']?.d ?? 50} J=${kdj['1h']?.j ?? 50} ${kdj['1h']?.cross === 'golden' ? '金叉' : kdj['1h']?.cross === 'death' ? '死叉' : ''}
4H: K=${kdj['4h']?.k ?? 50} D=${kdj['4h']?.d ?? 50} J=${kdj['4h']?.j ?? 50} ${kdj['4h']?.cross === 'golden' ? '金叉' : kdj['4h']?.cross === 'death' ? '死叉' : ''}

## 布林带
1H: 上轨=${bb['1h']?.upper ?? 0}, 中轨=${bb['1h']?.middle ?? 0}, 下轨=${bb['1h']?.lower ?? 0}, 位置=${bb['1h']?.position_pct ?? 50}%, ${bb['1h']?.bandwidth_direction === 'expanding' ? '开口扩张' : bb['1h']?.bandwidth_direction === 'contracting' ? '开口收缩' : '平稳'}
4H: 上轨=${bb['4h']?.upper ?? 0}, 中轨=${bb['4h']?.middle ?? 0}, 下轨=${bb['4h']?.lower ?? 0}

## 斐波那契
区间: ${fib.swing_low} - ${fib.swing_high}
0.382=${fib.levels['0.382'] ?? 0} | 0.5=${fib.levels['0.5'] ?? 0} | 0.618=${fib.levels['0.618'] ?? 0} | 1.382=${fib.levels['1.382'] ?? 0} | 1.618=${fib.levels['1.618'] ?? 0}
回撤强度: ${fib.retracement_strength}

## 均线 MA
1H: MA5=${ma['1h']?.ma5 ?? '-'}, MA7=${ma['1h']?.ma7 ?? '-'}, MA20=${ma['1h']?.ma20 ?? '-'}, MA60=${ma['1h']?.ma60 ?? '-'}, 排列=${ma['1h']?.alignment ?? 'unknown'}
4H: MA5=${ma['4h']?.ma5 ?? '-'}, MA7=${ma['4h']?.ma7 ?? '-'}, MA20=${ma['4h']?.ma20 ?? '-'}, MA60=${ma['4h']?.ma60 ?? '-'}, 排列=${ma['4h']?.alignment ?? 'unknown'}
日线: MA5=${ma['1d']?.ma5 ?? '-'}, MA7=${ma['1d']?.ma7 ?? '-'}, MA20=${ma['1d']?.ma20 ?? '-'}, MA60=${ma['1d']?.ma60 ?? '-'}, 排列=${ma['1d']?.alignment ?? 'unknown'}

## 阶梯形态
4H: ${sc?.['4h']?.pattern ?? 'unknown'}
日线: ${sc?.['1d']?.pattern ?? 'unknown'}

## 成交量
趋势: ${data.volume_analysis.recent_trend}, 量比: ${data.volume_analysis.vol_ratio ?? 1}x, 无量拉升: ${data.volume_analysis.is_hollow_rally ? '是' : '否'}

## 策略引擎建议
偏向: ${data.strategy.bias}, 共振评分: ${data.strategy.resonance_score}/10
入场策略: ${data.strategy.entry_strategy}
警告: ${data.strategy.warnings.join('; ') || '无'}`
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
      const dataText = buildDataPrompt(data)

      // 四段并行生成
      const sectionKeys: AiSectionKey[] = ['macro', 'sentiment', 'levels', 'action']
      const results = await Promise.all(
        sectionKeys.map(async (key) => {
          const cfg = SECTION_PROMPTS[key]
          const prompt = ChatPromptTemplate.fromMessages([
            ['system', systemPrompt],
            ['human', `${cfg.prompt}\n\n---\n\n${dataText}`],
          ])
          const chain = prompt.pipe(model)
          const response = await chain.invoke({ coin: data.coin })
          const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
          return { key, title: cfg.title, content } as AiStrategySection
        }),
      )

      const fullContent = results.map((s) => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n')
      const output: AiStrategyOutput = { content: fullContent, sections: results }
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
