import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { KolPerformanceRecord } from '../types'
import { overallStats } from '../utils'

export function StatsCards({ records }: { records: KolPerformanceRecord[] }) {
  const s = overallStats(records)
  const winPct = `${(s.win_rate * 100).toFixed(1)}%`
  const avgPnl = s.avg_pnl_pct != null ? `${s.avg_pnl_pct.toFixed(2)}%` : '—'

  const items = [
    { label: '总战数', value: String(s.total) },
    { label: '胜 / 负 / 平', value: `${s.win} / ${s.loss} / ${s.breakeven}` },
    { label: '胜率 (胜 ÷ 胜+负)', value: winPct },
    { label: '平均收益率', value: avgPnl },
  ]

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
      {items.map((it) => (
        <Card key={it.label}>
          <CardHeader className='pb-2'>
            <CardTitle className='text-xs text-muted-foreground font-normal'>
              {it.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-semibold'>{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
