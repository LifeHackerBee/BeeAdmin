import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BullBearLine as BullBearLineData } from '../types'

interface Props {
  data: BullBearLineData
  currentPrice: number
}

const COMPONENT_LABELS: Record<string, string> = {
  daily_bb_mid: '日线中轨',
  '4h_ema20': '4H EMA20',
  daily_ma60: '日线MA60',
  '5d_vwap': '5日VWAP',
}

const BASE_SOURCE_LABELS: Record<string, string> = {
  yesterday_poc: '昨日POC',
  yesterday_typical: '昨日典型价',
  fallback_current: '当前价',
}

const GRADE_LABELS: Record<string, { text: string; color: string }> = {
  strong_bull: { text: '强多头', color: 'text-green-600 dark:text-green-400' },
  ranging: { text: '震荡', color: 'text-yellow-600 dark:text-yellow-400' },
  bearish: { text: '偏空', color: 'text-red-600 dark:text-red-400' },
}

export function BullBearLineCard({ data, currentPrice }: Props) {
  const isAbove = data.status === 'above'
  const isNeutral = data.status === 'neutral'
  const isCounter = data.status === 'counter_trend_pullback'
  const distance = currentPrice - data.price
  const distancePct = ((distance / data.price) * 100).toFixed(2)
  const score = data.trend_score ?? 0
  const grade = data.trend_grade ?? 'ranging'
  const gradeInfo = GRADE_LABELS[grade] ?? GRADE_LABELS.ranging

  const borderColor = isAbove
    ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
    : isNeutral
      ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20'
      : isCounter
        ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20'
        : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'

  return (
    <Card className={`border ${borderColor}`}>
      <CardContent className='py-3 px-4'>
        <div className='flex items-center justify-between flex-wrap gap-2'>
          <div className='flex items-center gap-3'>
            <span className='text-sm font-medium text-muted-foreground'>
              多空分界线
            </span>
            <span className='text-lg font-bold tabular-nums'>
              ${data.price.toLocaleString()}
            </span>
            {data.base_source && (
              <span className='text-[10px] text-muted-foreground/60'>
                ({BASE_SOURCE_LABELS[data.base_source] ?? data.base_source})
              </span>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Badge
              variant={isAbove ? 'default' : isNeutral ? 'secondary' : 'destructive'}
              className='text-xs'
            >
              {isAbove ? '偏多' : isNeutral ? '震荡' : isCounter ? '逆势回调' : '偏空'}
              {data.duration_hours > 0 && ` ${data.duration_hours}h`}
            </Badge>
            <span className={`text-xs font-semibold ${gradeInfo.color}`}>
              {score.toFixed(1)}/5
            </span>
            <span
              className={`text-xs tabular-nums ${
                isAbove
                  ? 'text-green-600 dark:text-green-400'
                  : isNeutral
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {distance > 0 ? '+' : ''}
              {distancePct}%
            </span>
          </div>
        </div>

        {data.components.length > 0 && (
          <div className='flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap'>
            <span className='text-muted-foreground/60'>趋势打分:</span>
            {data.components.map((c) => (
              <span
                key={c.name}
                className={`tabular-nums ${c.above ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
              >
                {c.above ? '✓' : '✗'}{' '}
                {COMPONENT_LABELS[c.name] ?? c.name}: ${c.value.toLocaleString()} (+{c.weight})
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
