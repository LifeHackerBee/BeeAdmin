import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { KolPerformanceRecord } from '../types'

const outcomeBadge = (o: KolPerformanceRecord['outcome']) => {
  if (o === 'win') return <Badge className='bg-emerald-500 hover:bg-emerald-500'>胜</Badge>
  if (o === 'loss') return <Badge variant='destructive'>负</Badge>
  return <Badge variant='secondary'>平</Badge>
}

const dirLabel = (d: KolPerformanceRecord['direction']) =>
  d === 'long' ? '多' : d === 'short' ? '空' : '—'

export function RecordsTable({
  records,
  onDelete,
}: {
  records: KolPerformanceRecord[]
  onDelete: (id: number) => void
}) {
  if (!records.length) {
    return (
      <div className='border rounded-md py-12 text-center text-muted-foreground text-sm'>
        暂无录入记录
      </div>
    )
  }

  return (
    <div className='border rounded-md'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-28'>日期</TableHead>
            <TableHead>KOL</TableHead>
            <TableHead className='w-20'>品种</TableHead>
            <TableHead className='w-16'>方向</TableHead>
            <TableHead className='w-16'>结果</TableHead>
            <TableHead className='w-20 text-right'>收益率</TableHead>
            <TableHead className='w-28 text-right'>开仓价</TableHead>
            <TableHead className='w-28 text-right'>平仓价</TableHead>
            <TableHead>备注</TableHead>
            <TableHead className='w-12'></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell className='font-mono text-xs'>{r.date}</TableCell>
              <TableCell className='font-medium'>{r.kol_name}</TableCell>
              <TableCell>{r.coin || '—'}</TableCell>
              <TableCell>{dirLabel(r.direction)}</TableCell>
              <TableCell>{outcomeBadge(r.outcome)}</TableCell>
              <TableCell className='text-right font-mono'>
                {r.pnl_pct != null ? `${Number(r.pnl_pct).toFixed(2)}%` : '—'}
              </TableCell>
              <TableCell className='text-right font-mono'>
                {r.entry_price != null ? Number(r.entry_price) : '—'}
              </TableCell>
              <TableCell className='text-right font-mono'>
                {r.exit_price != null ? Number(r.exit_price) : '—'}
              </TableCell>
              <TableCell className='text-xs text-muted-foreground max-w-xs truncate'>
                {r.note || '—'}
              </TableCell>
              <TableCell>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7'
                  onClick={() => onDelete(r.id)}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
