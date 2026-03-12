import { useState } from 'react'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTradeFlow, type FlowBucket, type FlowInterval } from '../hooks/use-trade-flow'
import { coinLabel } from '../coins'
import { cn } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const INTERVALS: { value: FlowInterval; label: string }[] = [
  { value: '1m', label: '1分钟' },
  { value: '5m', label: '5分钟' },
  { value: '1h', label: '1小时' },
]

const INTERVAL_SOURCE: Record<FlowInterval, string> = {
  '1m': '1分钟K线',
  '5m': '5分钟K线',
  '1h': '1小时K线',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtVol(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  if (abs >= 1) return v.toFixed(1)
  return v.toFixed(3)
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function FlowTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: FlowBucket }[]
}) {
  if (!active || !payload?.[0]) return null
  const b = payload[0].payload
  const buyPct = b.totalVol > 0 ? (b.buyVol / b.totalVol) * 100 : 50

  return (
    <div className='rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1 min-w-[160px]'>
      <div className='font-medium'>{b.timeLabel}</div>
      <div className='flex items-center gap-1 text-emerald-500'>
        <TrendingUp className='h-3 w-3' />
        多方 {fmtVol(b.buyVol)} ({buyPct.toFixed(1)}%)
      </div>
      <div className='flex items-center gap-1 text-red-500'>
        <TrendingDown className='h-3 w-3' />
        空方 {fmtVol(b.sellVol)} ({(100 - buyPct).toFixed(1)}%)
      </div>
      <div className={`font-semibold ${b.netFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
        净流向 {b.netFlow >= 0 ? '+' : ''}{fmtVol(b.netFlow)}
      </div>
    </div>
  )
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({
  buyPct,
  totalBuyVol,
  totalSellVol,
}: {
  buyPct: number
  totalBuyVol: number
  totalSellVol: number
}) {
  return (
    <div className='px-3 pb-2 space-y-1'>
      <div className='flex justify-between text-[10px]'>
        <span className='text-emerald-600 dark:text-emerald-400'>
          多 {fmtVol(totalBuyVol)} ({buyPct.toFixed(1)}%)
        </span>
        <span className='text-red-600 dark:text-red-400'>
          空 {fmtVol(totalSellVol)} ({(100 - buyPct).toFixed(1)}%)
        </span>
      </div>
      <div className='h-1.5 w-full rounded-full overflow-hidden flex'>
        <div
          className='h-full bg-emerald-500 transition-all duration-500'
          style={{ width: `${buyPct}%` }}
        />
        <div
          className='h-full bg-red-500 transition-all duration-500'
          style={{ width: `${100 - buyPct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LargeTradesPanelProps {
  coin: string
}

export function LargeTradesPanel({ coin }: LargeTradesPanelProps) {
  const [interval, setInterval] = useState<FlowInterval>('1m')
  const { data, loading, error, refetch, xTickInterval } = useTradeFlow(coin, interval)

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='pb-1 flex-shrink-0'>
        <CardTitle className='text-sm flex items-center justify-between'>
          <span>{coinLabel(coin)} 多空流向</span>
          <div className='flex items-center gap-1.5'>
            {/* Interval tabs */}
            <div className='flex rounded-md border bg-muted/50 p-0.5'>
              {INTERVALS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setInterval(value)}
                  className={cn(
                    'px-2 py-0.5 text-[11px] rounded-sm transition-colors',
                    interval === value
                      ? 'bg-background text-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6'
              onClick={() => void refetch()}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Summary buy/sell bar */}
      {data && data.buckets.length > 0 && (
        <SummaryBar
          buyPct={data.buyPct}
          totalBuyVol={data.totalBuyVol}
          totalSellVol={data.totalSellVol}
        />
      )}

      <CardContent className='flex-1 min-h-0 p-2 pt-0' style={{ minHeight: 260 }}>
        {error ? (
          <div className='flex items-center justify-center h-full text-destructive text-sm px-4 text-center'>
            {error.message}
          </div>
        ) : loading && !data ? (
          <div className='flex items-center justify-center h-full text-muted-foreground text-sm'>
            加载中...
          </div>
        ) : !data || data.buckets.length === 0 ? (
          <div className='flex items-center justify-center h-full text-muted-foreground text-sm'>
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart
              data={data.buckets}
              margin={{ top: 4, right: 8, bottom: 0, left: 36 }}
              barCategoryGap='2%'
            >
              <XAxis
                dataKey='timeLabel'
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                interval={xTickInterval}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtVol}
                width={36}
              />
              <Tooltip content={<FlowTooltip />} />
              <ReferenceLine y={0} stroke='rgba(156,163,175,0.3)' strokeWidth={1} />

              {/* Buy volume — green bars above zero */}
              <Bar dataKey='buyVol' maxBarSize={20} radius={[2, 2, 0, 0]}>
                {data.buckets.map((_, i) => (
                  <Cell key={i} fill='rgba(16,185,129,0.65)' />
                ))}
              </Bar>

              {/* Sell volume — red bars below zero (negated) */}
              <Bar dataKey='negSellVol' maxBarSize={20} radius={[0, 0, 2, 2]}>
                {data.buckets.map((_, i) => (
                  <Cell key={i} fill='rgba(239,68,68,0.65)' />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>

      {/* Legend */}
      <div className='flex gap-4 text-[9px] text-muted-foreground pb-2 px-3 justify-center flex-shrink-0'>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-2.5 h-2 rounded-sm' style={{ background: 'rgba(16,185,129,0.75)' }} />
          多方买入
        </span>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-2.5 h-2 rounded-sm' style={{ background: 'rgba(239,68,68,0.75)' }} />
          空方卖出
        </span>
        <span className='flex items-center gap-1 text-muted-foreground'>
          数据来源：{INTERVAL_SOURCE[interval]}成交量估算
        </span>
      </div>
    </Card>
  )
}
