import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { KolMvpRecord } from '../types'
import { displayName } from '../utils'

export function RawRecordsTable({
  records,
  onDelete,
}: {
  records: KolMvpRecord[]
  onDelete: (id: number) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return records
    return records.filter(
      (r) =>
        r.kol_name.toLowerCase().includes(q) ||
        (r.org ?? '').toLowerCase().includes(q) ||
        (r.raw_line ?? '').toLowerCase().includes(q)
    )
  }, [records, search])

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='搜索 KOL / 原文...'
          className='max-w-sm'
        />
        <div className='text-xs text-muted-foreground'>
          {filtered.length} / {records.length} 条
        </div>
      </div>

      <div className='border rounded-md max-h-[640px] overflow-auto'>
        <Table>
          <TableHeader className='sticky top-0 bg-background z-10'>
            <TableRow>
              <TableHead className='w-28'>日期</TableHead>
              <TableHead className='w-44'>KOL</TableHead>
              <TableHead className='w-16'>方向</TableHead>
              <TableHead className='w-32'>品种</TableHead>
              <TableHead>原文</TableHead>
              <TableHead className='w-12'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='text-center text-muted-foreground py-10'>
                  无记录
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className='font-mono text-xs'>{r.date}</TableCell>
                  <TableCell className='font-medium'>{displayName(r.kol_name, r.org)}</TableCell>
                  <TableCell>
                    {r.direction === 'long' ? (
                      <Badge className='bg-emerald-500 hover:bg-emerald-500'>多</Badge>
                    ) : r.direction === 'short' ? (
                      <Badge variant='destructive'>空</Badge>
                    ) : (
                      <span className='text-muted-foreground'>—</span>
                    )}
                  </TableCell>
                  <TableCell className='text-xs'>
                    {(r.assets ?? []).map((a) => (
                      <span
                        key={a}
                        className='inline-block mr-1 px-1.5 py-0.5 rounded bg-muted text-foreground/80'
                      >
                        {a}
                      </span>
                    ))}
                  </TableCell>
                  <TableCell className='text-xs text-muted-foreground max-w-md truncate'>
                    {r.raw_line ?? '—'}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
