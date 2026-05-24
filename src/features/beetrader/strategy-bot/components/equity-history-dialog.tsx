import { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import { format, subDays, subYears } from 'date-fns'

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
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId?: string
}

function toISODate(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

export function EquityHistoryDialog({ open, onOpenChange, accountId = 'default' }: Props) {
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
    if (!open) return
    const now = new Date()
    if (period === 'month') {
      fetchData(toISODate(subDays(now, 30)), toISODate(now))
    } else if (period === 'year') {
      fetchData(toISODate(subYears(now, 1)), toISODate(now))
    }
  }, [open, period, fetchData])

  const handleCustomFetch = () => {
    fetchData(customStart, customEnd)
  }

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl'>
        <DialogHeader>
          <DialogTitle>资产净值曲线</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* 时间段选择 */}
          <div className='flex items-center gap-3 flex-wrap'>
            <Tabs value={period} onValueChange={v => setPeriod(v as Period)}>
              <TabsList className='h-8'>
                <TabsTrigger value='month' className='text-xs h-7 px-3'>近 30 天</TabsTrigger>
                <TabsTrigger value='year' className='text-xs h-7 px-3'>近 1 年</TabsTrigger>
                <TabsTrigger value='custom' className='text-xs h-7 px-3'>自定义</TabsTrigger>
              </TabsList>
            </Tabs>
            {period === 'custom' && (
              <div className='flex items-center gap-2'>
                <Input
                  type='date'
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className='h-7 text-xs w-36'
                />
                <span className='text-xs text-muted-foreground'>—</span>
                <Input
                  type='date'
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className='h-7 text-xs w-36'
                />
                <Button size='sm' className='h-7 text-xs px-3' onClick={handleCustomFetch}>
                  查询
                </Button>
              </div>
            )}
          </div>

          {/* 摘要数据 */}
          {summary && (
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
              <div className='rounded-lg border p-3 text-center'>
                <div className='text-[10px] text-muted-foreground mb-1'>期初净值</div>
                <div className='text-sm font-bold font-mono'>${summary.start_equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div className='rounded-lg border p-3 text-center'>
                <div className='text-[10px] text-muted-foreground mb-1'>当前净值</div>
                <div className='text-sm font-bold font-mono'>${summary.end_equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div className='rounded-lg border p-3 text-center'>
                <div className='text-[10px] text-muted-foreground mb-1'>区间盈亏</div>
                <div className={`text-sm font-bold font-mono ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                  {isProfit ? '+' : ''}${summary.total_pnl.toFixed(2)}
                </div>
              </div>
              <div className='rounded-lg border p-3 text-center'>
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
              <div className='h-64 flex items-center justify-center text-sm text-muted-foreground'>加载中…</div>
            ) : points.length === 0 ? (
              <div className='h-64 flex items-center justify-center text-sm text-muted-foreground'>该时段暂无成交记录</div>
            ) : (
              <ResponsiveContainer width='100%' height={260}>
                <AreaChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
                    tickFormatter={v => {
                      const parts = v.split('-')
                      return period === 'year' ? `${parts[1]}/${parts[2]}` : `${parts[1]}/${parts[2]}`
                    }}
                    interval='preserveStartEnd'
                  />
                  <YAxis
                    domain={[yMin, yMax]}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatY}
                    width={52}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => [`$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '净值']}
                    labelFormatter={l => `日期: ${l}`}
                  />
                  <ReferenceLine y={initialBalance} stroke='#94a3b8' strokeDasharray='4 2' strokeWidth={1} />
                  <Area
                    type='monotone'
                    dataKey='equity'
                    stroke={chartColor}
                    strokeWidth={2}
                    fill='url(#equityGrad)'
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {points.length > 0 && (
            <p className='text-[10px] text-muted-foreground text-center'>
              净值 = 初始余额 + 累计已实现盈亏（不含浮盈亏）· 虚线为初始余额 ${initialBalance.toLocaleString()}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
