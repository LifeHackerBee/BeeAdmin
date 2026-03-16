import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { FibonacciData } from '../types'

const FIB_COLORS: Record<string, string> = {
  '0.0': 'bg-green-600',
  '0.236': 'bg-green-500',
  '0.382': 'bg-green-400',
  '0.5': 'bg-yellow-500',
  '0.618': 'bg-orange-500',
  '0.786': 'bg-red-400',
  '1.0': 'bg-red-600',
  '1.382': 'bg-purple-400',
  '1.618': 'bg-purple-600',
}

const STRENGTH_LABELS: Record<string, { label: string; color: string }> = {
  very_strong_recovery: {
    label: '极强收复',
    color: 'text-green-600 dark:text-green-400',
  },
  strong_recovery: {
    label: '强势收复',
    color: 'text-green-600 dark:text-green-400',
  },
  moderate_recovery: {
    label: '中度反弹',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  weak_recovery: {
    label: '弱势反弹',
    color: 'text-orange-600 dark:text-orange-400',
  },
  failed_recovery: {
    label: '反弹失败',
    color: 'text-red-600 dark:text-red-400',
  },
}

interface Props {
  data: FibonacciData
  currentPrice: number
}

export function FibonacciPanel({ data, currentPrice }: Props) {
  const strengthConfig = STRENGTH_LABELS[data.retracement_strength] || {
    label: data.retracement_strength,
    color: '',
  }

  const fibEntries = Object.entries(data.levels).sort(
    ([, a], [, b]) => a - b
  )
  const priceRange = data.swing_high - data.swing_low

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm'>斐波那契回撤</CardTitle>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='text-xs tabular-nums'>
              回撤 {(data.retracement_pct * 100).toFixed(1)}%
            </Badge>
            <span className={`text-xs font-medium ${strengthConfig.color}`}>
              {strengthConfig.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {/* 价格范围标注 */}
          <div className='flex justify-between text-xs text-muted-foreground'>
            <span>
              低点 ${data.swing_low.toLocaleString()}
            </span>
            <span>
              高点 ${data.swing_high.toLocaleString()}
            </span>
          </div>

          {/* 斐波那契标尺 */}
          <div className='relative'>
            {/* 背景条 */}
            <div className='h-8 bg-muted rounded-md relative overflow-hidden'>
              {/* 各级别色块 */}
              {fibEntries.map(([ratio, price], i) => {
                if (i === fibEntries.length - 1) return null
                const nextPrice = fibEntries[i + 1][1]
                const left =
                  priceRange > 0
                    ? ((price - data.swing_low) / priceRange) * 100
                    : 0
                const width =
                  priceRange > 0
                    ? ((nextPrice - price) / priceRange) * 100
                    : 0
                return (
                  <div
                    key={ratio}
                    className={`absolute top-0 bottom-0 ${FIB_COLORS[ratio] || 'bg-slate-400'} opacity-20`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                )
              })}

              {/* 当前价格指示器 */}
              {priceRange > 0 && (
                <div
                  className='absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10'
                  style={{
                    left: `${Math.min(Math.max(((currentPrice - data.swing_low) / priceRange) * 100, 0), 100)}%`,
                  }}
                >
                  <div className='absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap'>
                    ${currentPrice.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* 刻度线和标签 */}
            <div className='relative h-10 mt-0.5'>
              {fibEntries.map(([ratio, price]) => {
                const left =
                  priceRange > 0
                    ? ((price - data.swing_low) / priceRange) * 100
                    : 0
                const isNearPrice =
                  Math.abs(price - currentPrice) / currentPrice < 0.01
                return (
                  <div
                    key={ratio}
                    className='absolute flex flex-col items-center'
                    style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className='w-px h-2 bg-foreground/30' />
                    <span
                      className={`text-[9px] tabular-nums leading-tight ${isNearPrice ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}
                    >
                      {ratio}
                    </span>
                    <span className='text-[8px] tabular-nums text-muted-foreground'>
                      {price >= 10000
                        ? `${(price / 1000).toFixed(1)}k`
                        : price.toFixed(1)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 关键位说明 */}
          <div className='text-xs text-muted-foreground'>
            0.618 ({data.levels['0.618']?.toLocaleString()}) 和 0.5 ({data.levels['0.5']?.toLocaleString()}) 是判断反弹强度的关键位。
            收复 0.618 以上属于强势反弹，0.382 以下属于弱势反弹。
            扩展位 1.382 ({data.levels['1.382']?.toLocaleString()}) 和 1.618 ({data.levels['1.618']?.toLocaleString()}) 为突破后上方目标价。
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
