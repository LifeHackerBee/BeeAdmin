import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MovingAverages, StaircasePattern } from '../types'

// ============================================
// 均线面板 — 紧凑表格
// ============================================

interface MaPanelProps {
  data: Record<string, MovingAverages>
  currentPrice: number
}

function fmtMa(v: number | null): string {
  if (v == null) return '-'
  if (v >= 10_000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (v >= 100) return v.toFixed(2)
  return v.toFixed(4)
}

const ALIGN_LABEL: Record<string, { text: string; color: string }> = {
  bullish: { text: '多', color: 'text-green-500' },
  bearish: { text: '空', color: 'text-red-500' },
  mixed: { text: '交叉', color: 'text-yellow-500' },
  unknown: { text: '-', color: 'text-muted-foreground' },
}

export function MovingAveragesPanel({ data, currentPrice }: MaPanelProps) {
  if (!data) return null
  const timeframes = Object.keys(data)
  const periods = [5, 7, 20, 60] as const

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>均线 MA</CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <table className='w-full text-xs'>
          <thead>
            <tr className='border-b text-muted-foreground'>
              <th className='text-left font-medium px-3 py-1.5 w-12'></th>
              {periods.map((p) => (
                <th key={p} className='text-right font-medium px-2 py-1.5'>MA{p}</th>
              ))}
              <th className='text-right font-medium px-3 py-1.5 w-12'>排列</th>
            </tr>
          </thead>
          <tbody>
            {timeframes.map((tf) => {
              const ma = data[tf]
              const align = ALIGN_LABEL[ma.alignment] ?? ALIGN_LABEL.unknown
              return (
                <tr key={tf} className='border-b last:border-0 hover:bg-muted/30'>
                  <td className='font-medium px-3 py-1.5'>{tf.toUpperCase()}</td>
                  {periods.map((period) => {
                    const key = `ma${period}` as keyof MovingAverages
                    const val = ma[key] as number | null
                    const above = val != null && currentPrice > val
                    return (
                      <td key={period} className={`text-right font-mono tabular-nums px-2 py-1.5 ${val != null ? (above ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-muted-foreground'}`}>
                        {fmtMa(val)}
                      </td>
                    )
                  })}
                  <td className={`text-right px-3 py-1.5 font-medium ${align.color}`}>{align.text}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
