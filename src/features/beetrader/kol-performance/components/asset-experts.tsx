import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AnalysisResult } from '../types'

const ASSETS = ['BTC', 'ETH', '山寨币', '黄金/白银'] as const
const MIN_MVP = 5

export function AssetExperts({ analysis }: { analysis: AnalysisResult }) {
  const qualified = analysis.results.filter((r) => r.mvp >= MIN_MVP)

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
      {ASSETS.map((asset) => {
        const rows = qualified
          .map((r) => {
            const total = r.topAssets.reduce((s, a) => s + a.count, 0)
            const found = r.topAssets.find((a) => a.asset === asset)
            const cnt = found?.count ?? 0
            const pct = total > 0 ? cnt / total : 0
            return { name: r.display, count: cnt, pct, mvp: r.mvp }
          })
          .filter((r) => r.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        return (
          <Card key={asset}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>
                [{asset}] 专家 <span className='text-xs text-muted-foreground font-normal'>(MVP ≥ {MIN_MVP})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <div className='text-xs text-muted-foreground py-2'>无数据</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-8'>#</TableHead>
                      <TableHead>KOL</TableHead>
                      <TableHead className='text-right w-16'>记录数</TableHead>
                      <TableHead className='text-right w-16'>占比</TableHead>
                      <TableHead className='text-right w-16'>MVP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, idx) => (
                      <TableRow key={r.name}>
                        <TableCell className='text-muted-foreground tabular-nums'>
                          {idx + 1}
                        </TableCell>
                        <TableCell className='font-medium'>{r.name}</TableCell>
                        <TableCell className='text-right tabular-nums'>{r.count}</TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {(r.pct * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className='text-right tabular-nums text-muted-foreground'>
                          {r.mvp}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
