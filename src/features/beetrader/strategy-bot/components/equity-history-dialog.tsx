import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import { format, subDays, subYears } from 'date-fns'
import { TrendingUp } from 'lucide-react'

interface EquityPoint {
  date: string
  daily_pnl: number
  cumulative_pnl: number
  equity: number
}

interface EquityHistoryResponse {
  success: boolean
  initial_balance: number
  points: EquityPoint[]
  summary?: {
    start_equity: number
    end_equity: number
    total_pnl: number
    change_pct: number
  }
}

type Period = 'month' | 'year' | 'custom'

interface Props {
  accountId?: string
}

function toISODate(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

export function EquityHistoryPanel({ accountId = 'default' }: Props) {
  const [period, setPeriod] = useState<Period>('month')
  const [customStart, setCustomStart] = useState(toISODate(subDays(new Date(), 30)))
  const [customEnd, setCustomEnd] = useState(toISODate(new Date()))
  const [data, setData] = useState<EquityHistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async (start: string, end: string) => {
    setLoading(true)
    try {
      const res = await hyperliquidApiGet<EquityHistoryResponse>(
        `/api/sim_exchange/equity_history?account_id=${accountId}&start_date=${start}&end_date=${end}`
      )
      if (res.success) setData(res)
    } catch { /* */ } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    const now = new Date()
    if (period === 'month') {
      fetchData(toISODate(subDays(now, 30)), toISODate(now))
    } else if (period === 'year') {
      fetchData(toISODate(subYears(now, 1)), toISODate(now))
    }
  }, [period, fetchData])

  const handleCustomFetch = () => fetchData(customStart, customEnd)

  const points = data?.points ?? []
  const summary = data?.summary
  const initialBalance = data?.initial_balance ?? 20000

  const isProfit = (summary?.total_pnl ?? 0) >= 0
  const chartColor = isProfit ? '#22c55e' : '#ef4444'

  const yMin = points.length > 0
    ? Math.min(...points.map(p => p.equity)) * 0.999
    : initialBalance * 0.99
  const yMax = points.length > 0
    ? Math.max(...points.map(p => p.equity)) * 1.001
    : initialBalance * 1.01

  const formatY = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between flex-wrap gap-2'>
          <CardTitle className='text-base flex items-center gap-2'>
            <TrendingUp className='h-4 w-4 text-purple-500' />
            净值曲线
          </CardTitle>
          <div className='flex items-center gap-2 flex-wrap'>
            <Tabs value={period} onValueChange={v => setPeriod(v as Period)}>
              <TabsList className='h-7'>
                <TabsTrigger value='month' className='text-xs h-6 px-2'>近 30 天</TabsTrigger>
                <TabsTrigger value='year' className='text-xs h-6 px-2'>近 1 年</TabsTrigger>
                <TabsTrigger value='custom' className='text-xs h-6 px-2'>自定义</TabsTrigger>
              </TabsList>
            </Tabs>
            {period === 'custom' && (
              <div className='flex items-center gap-1'>
                <Input type='date' value={customStart} onChange={e => setCustomStart(e.target.value)} className='h-7 text-xs w-32' />
                <span className='text-xs text-muted-foreground'>—</span>
                <Input type='date' value={customEnd} onChange={e => setCustomEnd(e.target.value)} className='h-7 text-xs w-32' />
                <Button size='sm' className='h-7 text-xs px-2' onClick={handleCustomFetch}>查询</Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-3'>
        {/* 摘要 */}
        {summary && (
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
            <div className='rounded-lg border p-2 text-center'>
              <div className='text-[10px] text-muted-foreground mb-1'>期初净值</div>
              <div className='text-sm font-bold font-mono'>${summary.start_equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
            <div className='rounded-lg border p-2 text-center'>
              <div className='text-[10px] text-muted-foreground mb-1'>当前净值</div>
              <div className='text-sm font-bold font-mono'>${summary.end_equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
            <div className='rounded-lg border p-2 text-center'>
              <div className='text-[10px] text-muted-foreground mb-1'>区间盈亏</div>
              <div className={`text-sm font-bold font-mono ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                {isProfit ? '+' : ''}${summary.total_pnl.toFixed(2)}
              </div>
            </div>
            <div className='rounded-lg border p-2 text-center'>
              <div className='text-[10px] text-muted-foreground mb-1'>收益率</div>
              <div className={`text-sm font-bold font-mono ${summary.change_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {summary.change_pct >= 0 ? '+' : ''}{summary.change_pct.toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        {/* 图表 */}
        <div className='rounded-lg border bg-muted/20 p-3'>
          {loading ? (
            <div className='h-52 flex items-center justify-center text-sm text-muted-foreground'>加载中…</div>
          ) : points.length === 0 ? (
            <div className='h-52 flex items-center justify-center text-sm text-muted-foreground'>该时段暂无成交记录</div>
          ) : (
            <ResponsiveContainer width='100%' height={210}>
              <AreaChart data={points} margin={{ top: 6, right: 6, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id='equityGrad' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor={chartColor} stopOpacity={0.25} />
                    <stop offset='95%' stopColor={chartColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey='date'
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => { const p = v.split('-'); return `${p[1]}/${p[2]}` }}
                  interval='preserveStartEnd'
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatY}
                  width={48}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number | undefined) => [v != null ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-', '净值']}
                  labelFormatter={l => `日期: ${l}`}
                />
                <ReferenceLine y={initialBalance} stroke='#94a3b8' strokeDasharray='4 2' strokeWidth={1} />
                <Area type='monotone' dataKey='equity' stroke={chartColor} strokeWidth={2} fill='url(#equityGrad)' dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {points.length > 0 && (
          <p className='text-[10px] text-muted-foreground text-center'>
            净值 = 初始余额 + 累计已实现盈亏（不含浮盈亏）· 虚线为初始余额 ${initialBalance.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
