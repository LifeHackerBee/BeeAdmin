import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MovingAverages, StaircasePattern } from '../types'

// ============================================
// 均线面板
// ============================================

interface MaPanelProps {
  data: Record<string, MovingAverages>
  currentPrice: number
}

function fmtMa(v: number | null): string {
  if (v == null) return '-'
  if (v >= 10_000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (v >= 100) return `$${v.toFixed(2)}`
  return `$${v.toFixed(4)}`
}

const ALIGNMENT_LABELS: Record<string, { label: string; color: string }> = {
  bullish: { label: '多头排列', color: 'text-green-500' },
  bearish: { label: '空头排列', color: 'text-red-500' },
  mixed: { label: '交叉', color: 'text-yellow-500' },
  unknown: { label: '-', color: 'text-muted-foreground' },
}

export function MovingAveragesPanel({ data, currentPrice }: MaPanelProps) {
  if (!data) return null
  const timeframes = Object.keys(data)

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>均线 MA (5/7/20/60)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {timeframes.map((tf) => {
            const ma = data[tf]
            const align = ALIGNMENT_LABELS[ma.alignment] ?? ALIGNMENT_LABELS.unknown
            return (
              <div key={tf} className='space-y-1'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium'>{tf.toUpperCase()}</span>
                  <Badge variant='outline' className={`text-[10px] h-4 px-1 ${align.color}`}>
                    {align.label}
                  </Badge>
                </div>
                <div className='grid grid-cols-4 gap-1 text-xs'>
                  {([5, 7, 20, 60] as const).map((period) => {
                    const key = `ma${period}` as keyof MovingAverages
                    const val = ma[key] as number | null
                    const isAbove = val != null && currentPrice > val
                    return (
                      <div key={period}>
                        <span className='text-muted-foreground'>MA{period}</span>
                        <div className={`font-mono tabular-nums text-[11px] ${val != null ? (isAbove ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : ''}`}>
                          {fmtMa(val)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 阶梯式形态面板
// ============================================

interface StaircasePanelProps {
  data: Record<string, StaircasePattern>
}

const PATTERN_LABELS: Record<string, { label: string; color: string }> = {
  staircase_up: { label: '完美阶梯上涨', color: 'text-green-500' },
  higher_lows: { label: '低点抬高(阶梯上涨)', color: 'text-green-500' },
  lower_lows: { label: '低点降低(阶梯下跌)', color: 'text-red-500' },
  unknown: { label: '无明显形态', color: 'text-muted-foreground' },
}

export function StaircasePatternPanel({ data }: StaircasePanelProps) {
  if (!data) return null
  const timeframes = Object.keys(data)
  const hasPattern = timeframes.some((tf) => data[tf]?.pattern !== 'unknown')

  if (!hasPattern) return null

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>阶梯形态</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-2'>
          {timeframes.map((tf) => {
            const sp = data[tf]
            if (sp.pattern === 'unknown') return null
            const config = PATTERN_LABELS[sp.pattern] ?? PATTERN_LABELS.unknown
            return (
              <div key={tf} className='space-y-1'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium'>{tf.toUpperCase()}</span>
                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                </div>
                {sp.swing_lows.length > 0 && (
                  <div className='flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap'>
                    <span>低点:</span>
                    {sp.swing_lows.map((v, i) => (
                      <span key={i} className='font-mono bg-muted px-1 rounded'>{fmtMa(v)}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
