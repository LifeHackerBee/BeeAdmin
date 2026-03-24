import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Strategy, ResonanceDetail } from '../types'

const BIAS_CONFIG: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary'; label: string; color: string }> = {
  '强势看多': { variant: 'default', label: '强势看多', color: 'text-green-600 dark:text-green-400' },
  '震荡偏多': { variant: 'default', label: '震荡偏多', color: 'text-green-600 dark:text-green-400' },
  '观望': { variant: 'secondary', label: '观望', color: 'text-muted-foreground' },
  '震荡偏空': { variant: 'destructive', label: '震荡偏空', color: 'text-red-600 dark:text-red-400' },
  '强势看空': { variant: 'destructive', label: '强势看空', color: 'text-red-600 dark:text-red-400' },
}

const SIGNAL_ICON = {
  bullish: TrendingUp,
  confirmed: TrendingUp,
  bearish: TrendingDown,
  warning: AlertTriangle,
  neutral: Minus,
}

const SIGNAL_LABEL: Record<string, string> = {
  bullish: '看多',
  bearish: '看空',
  confirmed: '确认',
  warning: '警告',
  neutral: '中性',
}

const SIGNAL_COLOR: Record<string, string> = {
  bullish: 'text-green-600 dark:text-green-400',
  confirmed: 'text-green-600 dark:text-green-400',
  bearish: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  neutral: 'text-muted-foreground',
}

const SIGNAL_BG: Record<string, string> = {
  bullish: 'bg-green-50 dark:bg-green-950/20',
  confirmed: 'bg-green-50 dark:bg-green-950/20',
  bearish: 'bg-red-50 dark:bg-red-950/20',
  warning: 'bg-yellow-50 dark:bg-yellow-950/20',
  neutral: '',
}

function buildResonanceSummary(details: ResonanceDetail[], score: number, bias: string): string {
  const bullish = details.filter((d) => d.signal === 'bullish' || d.signal === 'confirmed')
  const bearish = details.filter((d) => d.signal === 'bearish' || d.signal === 'warning')
  const neutral = details.filter((d) => d.signal === 'neutral')
  const parts: string[] = []

  if (bullish.length > 0) {
    parts.push(`${bullish.length} 项指标看多 (${bullish.map((d) => d.indicator.replace(/ \d[hHdDwW]$/, '')).filter((v, i, a) => a.indexOf(v) === i).join('、')})`)
  }
  if (bearish.length > 0) {
    parts.push(`${bearish.length} 项看空 (${bearish.map((d) => d.indicator.replace(/ \d[hHdDwW]$/, '')).filter((v, i, a) => a.indexOf(v) === i).join('、')})`)
  }
  if (neutral.length > 0) {
    parts.push(`${neutral.length} 项中性`)
  }

  const strength = score >= 8 ? '共振强烈' : score >= 6 ? '共振较好' : score >= 4 ? '信号分歧' : '共振较弱'
  return `${strength}，${parts.join('，')}。综合偏向「${bias}」`
}

interface Props {
  data: Strategy
  currentPrice: number
}

export function StrategyRecommendation({ data }: Props) {
  const biasConfig = BIAS_CONFIG[data.bias] || { variant: 'outline' as const, label: data.bias, color: 'text-muted-foreground' }

  // entry_strategy 可能是多行文本（包含战术点位）
  const entryLines = data.entry_strategy.split('\n')
  const entryTitle = entryLines[0]
  const tacticLines = entryLines.slice(1).filter(Boolean)

  const summary = buildResonanceSummary(data.resonance_details, data.resonance_score, data.bias)

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base'>策略建议</CardTitle>
          <div className='flex items-center gap-2'>
            <Badge variant={biasConfig.variant}>{biasConfig.label}</Badge>
            <Badge variant='outline' className='tabular-nums'>
              共振 {data.resonance_score}/10
            </Badge>
          </div>
        </div>
        {/* 共振总结描述 */}
        <p className='text-xs text-muted-foreground mt-1'>{summary}</p>
      </CardHeader>
      <CardContent className='space-y-3'>
        {/* 入场策略 + 战术点位 */}
        <div className='text-sm space-y-1'>
          <div>
            <span className='text-muted-foreground'>入场策略: </span>
            <span className='font-medium'>{entryTitle}</span>
          </div>
          {tacticLines.length > 0 && (
            <div className='rounded-md border bg-muted/30 p-2.5 space-y-0.5'>
              {tacticLines.map((line, i) => (
                <div key={i} className='text-xs text-muted-foreground font-mono'>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 共振指标明细 — 清晰列表 */}
        <div className='space-y-1.5'>
          <p className='text-xs font-medium text-muted-foreground'>共振指标明细</p>
          <div className='grid gap-1'>
            {data.resonance_details.map((d, i) => {
              const Icon = SIGNAL_ICON[d.signal] ?? Minus
              const color = SIGNAL_COLOR[d.signal] ?? ''
              const bg = SIGNAL_BG[d.signal] ?? ''
              const label = SIGNAL_LABEL[d.signal] ?? d.signal
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${bg}`}
                >
                  <Icon className={`h-3 w-3 shrink-0 ${color}`} />
                  <span className='font-medium min-w-[80px]'>{d.indicator}</span>
                  <span className={`font-medium ${color}`}>{label}</span>
                  {d.weight > 0 && (
                    <span className='text-muted-foreground'>权重 ×{d.weight}</span>
                  )}
                  {d.state && (
                    <span className='text-muted-foreground ml-auto truncate max-w-[200px]' title={d.state}>
                      {d.state}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 风险提醒 */}
        {data.warnings.length > 0 && (
          <div className='space-y-1'>
            {data.warnings.map((w, i) => (
              <div
                key={i}
                className='flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400'
              >
                <AlertTriangle className='h-3 w-3 mt-0.5 shrink-0' />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* 防错提醒 */}
        {data.error_prevention && (
          <Alert className='border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30'>
            <Shield className='h-4 w-4 text-orange-600 dark:text-orange-400' />
            <AlertDescription className='text-xs text-orange-700 dark:text-orange-400'>
              {data.error_prevention}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
