import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Shield } from 'lucide-react'
import type { Strategy } from '../types'

const BIAS_CONFIG: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary'; label: string }> = {
  '强势看多': { variant: 'default', label: '强势看多' },
  '震荡偏多': { variant: 'default', label: '震荡偏多' },
  '观望': { variant: 'secondary', label: '观望' },
  '震荡偏空': { variant: 'destructive', label: '震荡偏空' },
  '强势看空': { variant: 'destructive', label: '强势看空' },
}

interface Props {
  data: Strategy
  currentPrice: number
}

export function StrategyRecommendation({ data }: Props) {
  const biasConfig = BIAS_CONFIG[data.bias] || { variant: 'outline' as const, label: data.bias }

  // entry_strategy 可能是多行文本（包含战术点位）
  const entryLines = data.entry_strategy.split('\n')
  const entryTitle = entryLines[0]
  const tacticLines = entryLines.slice(1).filter(Boolean)

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

        {/* 共振指标明细 */}
        <div className='flex flex-wrap gap-1'>
          {data.resonance_details.map((d, i) => (
            <Badge
              key={i}
              variant='outline'
              className={`text-xs ${
                d.signal === 'bullish' || d.signal === 'confirmed'
                  ? 'text-green-600 border-green-300 dark:text-green-400 dark:border-green-700'
                  : d.signal === 'bearish' || d.signal === 'warning'
                    ? 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-700'
                    : 'text-slate-500 border-slate-300 dark:text-slate-400 dark:border-slate-600'
              }`}
              title={d.state || undefined}
            >
              {d.indicator}: {d.signal === 'bullish' ? '多' : d.signal === 'bearish' ? '空' : d.signal === 'confirmed' ? '确认' : d.signal === 'warning' ? '警告' : '中性'}
              {d.state ? ` · ${d.state}` : ''}
              {d.weight > 0 ? ` (×${d.weight})` : ''}
            </Badge>
          ))}
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
