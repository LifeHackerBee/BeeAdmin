import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BullBearLine as BullBearLineData } from '../types'

interface Props {
  data: BullBearLineData
  currentPrice: number
}

export function BullBearLineCard({ data, currentPrice }: Props) {
  const isAbove = data.status === 'above'
  const distance = currentPrice - data.price
  const distancePct = ((distance / data.price) * 100).toFixed(2)

  return (
    <Card
      className={`border ${
        isAbove
          ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
          : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
      }`}
    >
      <CardContent className='py-3 px-4'>
        <div className='flex items-center justify-between flex-wrap gap-2'>
          <div className='flex items-center gap-3'>
            <span className='text-sm font-medium text-muted-foreground'>
              多空分界线
            </span>
            <span className='text-lg font-bold tabular-nums'>
              ${data.price.toLocaleString()}
            </span>
          </div>

          <div className='flex items-center gap-2'>
            <Badge
              variant={isAbove ? 'default' : 'destructive'}
              className='text-xs'
            >
              {isAbove ? '价格在上方' : '价格在下方'}{' '}
              {data.duration_hours > 0 && `${data.duration_hours}h`}
            </Badge>
            <span
              className={`text-xs tabular-nums ${
                isAbove
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {distance > 0 ? '+' : ''}
              {distancePct}%
            </span>
          </div>
        </div>

        {data.components.length > 0 && (
          <div className='flex items-center gap-3 mt-2 text-xs text-muted-foreground'>
            {data.components.map((c) => (
              <span key={c.name} className='tabular-nums'>
                {c.name === 'daily_bb_mid'
                  ? '日线中轨'
                  : c.name === '4h_ema20'
                    ? '4H EMA20'
                    : '5日VWAP'}
                : ${c.value.toLocaleString()} ({(c.weight * 100).toFixed(0)}%)
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
