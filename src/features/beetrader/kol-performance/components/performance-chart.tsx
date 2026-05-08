import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { KolPerformanceRecord } from '../types'
import { aggregateByKol, buildKolDailySeries } from '../utils'

export function PerformanceChart({ records }: { records: KolPerformanceRecord[] }) {
  const stats = useMemo(() => aggregateByKol(records), [records])

  const barData = useMemo(
    () =>
      stats.slice(0, 20).map((s) => ({
        kol: s.kol_name,
        win: s.win,
        loss: s.loss,
        breakeven: s.breakeven,
        win_rate: Math.round(s.win_rate * 1000) / 10,
      })),
    [stats]
  )

  const [selectedKol, setSelectedKol] = useState<string>(() => stats[0]?.kol_name ?? '')

  const lineData = useMemo(
    () =>
      buildKolDailySeries(records, selectedKol).map((p) => ({
        date: p.date,
        胜率: Math.round(p.win_rate * 1000) / 10,
        总战数: p.total,
      })),
    [records, selectedKol]
  )

  if (!records.length) {
    return (
      <Card>
        <CardContent className='py-12 text-center text-muted-foreground'>
          暂无数据，先录入几条战绩再来看图。
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>各 KOL 战绩对比 (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width='100%' height={360}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='kol' angle={-30} textAnchor='end' height={70} interval={0} fontSize={11} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey='win' name='胜' fill='#10b981' stackId='a' />
              <Bar dataKey='loss' name='负' fill='#ef4444' stackId='a' />
              <Bar dataKey='breakeven' name='平' fill='#9ca3af' stackId='a' />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0'>
          <CardTitle className='text-base'>选定 KOL 胜率时间序列</CardTitle>
          <Select value={selectedKol} onValueChange={setSelectedKol}>
            <SelectTrigger className='w-48'>
              <SelectValue placeholder='选择 KOL' />
            </SelectTrigger>
            <SelectContent>
              {stats.map((s) => (
                <SelectItem key={s.kol_name} value={s.kol_name}>
                  {s.kol_name} ({s.total})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width='100%' height={360}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='date' fontSize={11} />
              <YAxis yAxisId='left' domain={[0, 100]} unit='%' />
              <YAxis yAxisId='right' orientation='right' />
              <Tooltip />
              <Legend />
              <Line yAxisId='left' type='monotone' dataKey='胜率' stroke='#3b82f6' strokeWidth={2} dot />
              <Line yAxisId='right' type='monotone' dataKey='总战数' stroke='#a855f7' strokeWidth={1} dot />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
