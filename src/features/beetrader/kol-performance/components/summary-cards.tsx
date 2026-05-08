import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalysisResult } from '../types'

export function SummaryCards({ analysis }: { analysis: AnalysisResult }) {
  const totalKols = analysis.results.length
  const totalMvp = analysis.results.reduce((sum, r) => sum + r.mvp, 0)
  const dateRange =
    analysis.earliestDate && analysis.latestDate
      ? `${analysis.earliestDate} ~ ${analysis.latestDate}`
      : '—'

  const items: { label: string; value: string }[] = [
    { label: '日志覆盖天数', value: String(analysis.totalDays) },
    { label: '日期范围', value: dateRange },
    { label: 'KOL 总数', value: String(totalKols) },
    { label: 'MVP 总次数', value: String(totalMvp) },
    { label: '近 30 天交易日', value: String(analysis.recentDays) },
    { label: '更早交易日', value: String(analysis.earlierDays) },
  ]

  return (
    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3'>
      {items.map((it) => (
        <Card key={it.label}>
          <CardHeader className='pb-2'>
            <CardTitle className='text-xs text-muted-foreground font-normal'>
              {it.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-base font-semibold tabular-nums'>{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
