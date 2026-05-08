import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AnalysisResult, KolAnalysis } from '../types'

type SortKey = 'mvp' | 'attendance' | 'recent' | 'streak' | 'trend'

const KEY_LABELS: Record<SortKey, string> = {
  mvp: 'MVP',
  attendance: '出勤率',
  recent: '近30天',
  streak: '连胜',
  trend: '趋势变化',
}

function sortFn(key: SortKey): (a: KolAnalysis, b: KolAnalysis) => number {
  switch (key) {
    case 'mvp':
      return (a, b) => b.mvp - a.mvp
    case 'attendance':
      return (a, b) => b.attendance - a.attendance
    case 'recent':
      return (a, b) => b.recent - a.recent
    case 'streak':
      return (a, b) => b.streak - a.streak || b.mvp - a.mvp
    case 'trend':
      return (a, b) => b.trendDiff - a.trendDiff
  }
}

export function RankingsTable({ analysis }: { analysis: AnalysisResult }) {
  const [sortKey, setSortKey] = useState<SortKey>('mvp')
  const [search, setSearch] = useState('')

  const sorted = useMemo(() => {
    const filtered = search.trim()
      ? analysis.results.filter((r) =>
          r.display.toLowerCase().includes(search.trim().toLowerCase())
        )
      : analysis.results
    return [...filtered].sort(sortFn(sortKey))
  }, [analysis.results, sortKey, search])

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => {
    const active = sortKey === k
    const Icon = active ? ArrowDown : ArrowUpDown
    return (
      <button
        type='button'
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          active ? 'text-foreground font-medium' : 'text-muted-foreground'
        }`}
        onClick={() => setSortKey(k)}
      >
        {label} <Icon className='h-3 w-3' />
      </button>
    )
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='搜索 KOL...'
          className='max-w-xs'
        />
        <div className='text-xs text-muted-foreground'>
          排序: <span className='font-medium'>{KEY_LABELS[sortKey]}</span> · 共 {sorted.length} 位
        </div>
      </div>

      <div className='border rounded-md'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-12'>#</TableHead>
              <TableHead>KOL</TableHead>
              <TableHead className='w-20 text-right'>
                <SortBtn k='mvp' label='MVP' />
              </TableHead>
              <TableHead className='w-24 text-right'>
                <SortBtn k='attendance' label='出勤率' />
              </TableHead>
              <TableHead className='w-20 text-right'>
                <SortBtn k='recent' label='近30天' />
              </TableHead>
              <TableHead className='w-16 text-right'>更早</TableHead>
              <TableHead className='w-20 text-right'>
                <SortBtn k='streak' label='连胜' />
              </TableHead>
              <TableHead className='w-28 text-right'>
                <SortBtn k='trend' label='趋势' />
              </TableHead>
              <TableHead className='w-32'>多空偏好</TableHead>
              <TableHead>主要品种</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className='text-center text-muted-foreground py-10'>
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r, idx) => (
                <TableRow key={r.display}>
                  <TableCell className='text-muted-foreground tabular-nums'>{idx + 1}</TableCell>
                  <TableCell className='font-medium'>
                    {r.name}
                    {r.org && (
                      <span className='ml-1 text-xs text-muted-foreground'>({r.org})</span>
                    )}
                  </TableCell>
                  <TableCell className='text-right tabular-nums font-semibold'>{r.mvp}</TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {(r.attendance * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>{r.recent}</TableCell>
                  <TableCell className='text-right tabular-nums text-muted-foreground'>
                    {r.earlier}
                  </TableCell>
                  <TableCell className='text-right'>
                    {r.streak > 0 ? (
                      <Badge className='bg-amber-500 hover:bg-amber-500'>{r.streak}</Badge>
                    ) : (
                      <span className='text-muted-foreground'>—</span>
                    )}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    <TrendCell diff={r.trendDiff} />
                  </TableCell>
                  <TableCell>
                    <BiasCell bias={r.bias} />
                  </TableCell>
                  <TableCell className='text-xs'>
                    {r.topAssets.slice(0, 3).map((a, i) => (
                      <span key={a.asset}>
                        {i > 0 && <span className='mx-1 text-muted-foreground'>·</span>}
                        <span>
                          {a.asset}
                          <span className='text-muted-foreground ml-0.5'>({a.count})</span>
                        </span>
                      </span>
                    ))}
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

function TrendCell({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.05) return <span className='text-muted-foreground'>持平</span>
  if (diff > 0)
    return (
      <span className='text-emerald-600 inline-flex items-center gap-0.5'>
        <ArrowUp className='h-3 w-3' /> {(diff * 100).toFixed(0)}%
      </span>
    )
  return (
    <span className='text-red-600 inline-flex items-center gap-0.5'>
      <ArrowDown className='h-3 w-3' /> {(Math.abs(diff) * 100).toFixed(0)}%
    </span>
  )
}

function BiasCell({ bias }: { bias: string }) {
  if (bias.startsWith('偏多')) {
    return <Badge className='bg-emerald-500/90 hover:bg-emerald-500'>{bias}</Badge>
  }
  if (bias.startsWith('偏空')) {
    return <Badge variant='destructive'>{bias}</Badge>
  }
  if (bias === '多空均衡') {
    return <Badge variant='secondary'>{bias}</Badge>
  }
  return <span className='text-muted-foreground'>—</span>
}
