import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVolumeProfile } from '../hooks/use-volume-profile'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VolumePoint {
  price: number
  volume: number
}

interface VolumeBar {
  priceLabel: string
  priceCenter: number
  priceLow: number
  priceHigh: number
  volume: number
  normVolume: number
  isPOC: boolean
  isAbove: boolean
  isCurrentBucket: boolean
}

interface VolumeProfileChartProps {
  coin: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEFRAMES = ['1h', '4h', '1d'] as const
type Timeframe = (typeof TIMEFRAMES)[number]

const TF_LABELS: Record<Timeframe, string> = { '1h': '1H', '4h': '4H', '1d': '1D' }

const NUM_BUCKETS = 28

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPriceShort(p: number): string {
  if (p >= 10_000) return `${(p / 1_000).toFixed(1)}k`
  if (p >= 1_000) return `${p.toFixed(0)}`
  if (p >= 100) return `${p.toFixed(1)}`
  return `${p.toFixed(2)}`
}

function buildBars(data: VolumePoint[], currentPrice: number): VolumeBar[] {
  if (!data || data.length === 0) return []

  const prices = data.map((d) => d.price)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const range = maxP - minP
  if (range === 0) return []

  const bucketSize = range / NUM_BUCKETS
  const buckets: number[] = new Array(NUM_BUCKETS).fill(0)

  for (const { price, volume } of data) {
    const idx = Math.min(Math.floor((price - minP) / bucketSize), NUM_BUCKETS - 1)
    buckets[idx] += volume
  }

  const maxVol = Math.max(...buckets, 1)
  const pocIdx = buckets.indexOf(maxVol)

  const currentBucketIdx =
    currentPrice > 0 && currentPrice >= minP && currentPrice <= maxP
      ? Math.min(Math.floor((currentPrice - minP) / bucketSize), NUM_BUCKETS - 1)
      : -1

  const result: VolumeBar[] = []
  for (let i = NUM_BUCKETS - 1; i >= 0; i--) {
    if (buckets[i] === 0) continue
    const priceLow = minP + i * bucketSize
    const priceHigh = priceLow + bucketSize
    const priceCenter = (priceLow + priceHigh) / 2
    result.push({
      priceLabel: `$${fmtPriceShort(priceCenter)}`,
      priceCenter,
      priceLow,
      priceHigh,
      volume: buckets[i],
      normVolume: (buckets[i] / maxVol) * 100,
      isPOC: i === pocIdx,
      isAbove: currentPrice > 0 ? priceCenter > currentPrice : false,
      isCurrentBucket: i === currentBucketIdx,
    })
  }
  return result
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function VolumeTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: VolumeBar }[]
}) {
  if (!active || !payload?.[0]) return null
  const bar = payload[0].payload
  return (
    <div className='rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1 min-w-[180px]'>
      <div className='font-mono font-medium'>
        ${bar.priceLow.toFixed(0)} – ${bar.priceHigh.toFixed(0)}
      </div>
      <div className='text-muted-foreground'>成交量 {bar.volume.toFixed(3)}</div>
      <div className='text-muted-foreground'>占比 {bar.normVolume.toFixed(1)}%</div>
      {bar.isCurrentBucket && (
        <div className='text-amber-500 font-semibold'>◆ 当前价格区间</div>
      )}
      {bar.isPOC && (
        <div className='text-yellow-500 font-semibold'>
          ⭐ POC（控制点）
          <div className='text-[10px] font-normal text-muted-foreground mt-0.5'>
            成交量最大的价格区间，是多空博弈最激烈的价位
          </div>
        </div>
      )}
      {!bar.isCurrentBucket && (
        <div className={bar.isAbove ? 'text-red-500' : 'text-emerald-500'}>
          {bar.isAbove ? '▲ 压力区' : '▼ 支撑区'}
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VolumeProfileChart({ coin }: VolumeProfileChartProps) {
  const [tf, setTf] = useState<Timeframe>('1d')
  const { data, loading, error, refetch } = useVolumeProfile(coin)

  const bars = useMemo(
    () => buildBars(data?.profile[tf] ?? [], data?.currentPrice ?? 0),
    [data, tf]
  )

  const poc = bars.find((b) => b.isPOC)
  const hasPriceData = (data?.currentPrice ?? 0) > 0
  const chartHeight = Math.min(Math.max(bars.length * 13 + 40, 280), 400)

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='pb-2 flex-shrink-0'>
        <CardTitle className='text-sm flex items-center justify-between'>
          <span className='flex items-center gap-2'>
            {coin} 筹码分布
            {poc && (
              <span className='text-[10px] font-normal text-yellow-600 dark:text-yellow-400'>
                POC ${fmtPriceShort(poc.priceCenter)}
              </span>
            )}
            {data?.currentPrice ? (
              <span className='text-[10px] font-normal text-muted-foreground'>
                现价 ${fmtPriceShort(data.currentPrice)}
              </span>
            ) : null}
          </span>
          <div className='flex items-center gap-2'>
            <div className='flex gap-1'>
              {TIMEFRAMES.map((t) => (
                <Badge
                  key={t}
                  variant={tf === t ? 'default' : 'outline'}
                  className='cursor-pointer text-[10px] px-1.5 py-0 h-5'
                  onClick={() => setTf(t)}
                >
                  {TF_LABELS[t]}
                </Badge>
              ))}
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6'
              onClick={() => void refetch()}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className='flex-1 min-h-0 p-2 pt-0 flex flex-col'>
        {error ? (
          <div className='flex-1 flex items-center justify-center text-destructive text-sm px-4 text-center'>
            {error.message}
          </div>
        ) : loading && bars.length === 0 ? (
          <div className='flex-1 flex items-center justify-center text-muted-foreground text-sm'>
            加载中...
          </div>
        ) : bars.length === 0 ? (
          <div className='flex-1 flex items-center justify-center text-muted-foreground text-sm'>
            暂无数据
          </div>
        ) : (
          <div className='flex-1 min-h-0' style={{ height: chartHeight }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart
                data={bars}
                layout='vertical'
                margin={{ top: 4, right: 6, bottom: 4, left: 56 }}
                barCategoryGap='3%'
              >
                <XAxis type='number' domain={[0, 105]} hide />
                <YAxis
                  type='category'
                  dataKey='priceLabel'
                  width={54}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<VolumeTooltip />} />

                <Bar dataKey='normVolume' maxBarSize={18} radius={[0, 3, 3, 0]}>
                  {bars.map((bar, i) => {
                    if (bar.isCurrentBucket) {
                      return (
                        <Cell
                          key={i}
                          fill={bar.isPOC ? 'rgba(6,182,212,0.55)' : 'rgba(6,182,212,0.35)'}
                          stroke='#06b6d4'
                          strokeWidth={2}
                        />
                      )
                    }
                    if (bar.isPOC) {
                      return <Cell key={i} fill='#f59e0b' stroke='#d97706' strokeWidth={1} />
                    }
                    if (!hasPriceData) {
                      return <Cell key={i} fill='rgba(156,163,175,0.45)' />
                    }
                    return (
                      <Cell
                        key={i}
                        fill={bar.isAbove ? 'rgba(239,68,68,0.55)' : 'rgba(16,185,129,0.55)'}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div className='flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground pt-1.5 justify-center flex-shrink-0'>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-2.5 rounded-sm' style={{ background: 'rgba(16,185,129,0.7)' }} />
            支撑区
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-2.5 rounded-sm' style={{ background: 'rgba(239,68,68,0.7)' }} />
            压力区
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-2.5 rounded-sm' style={{ background: '#f59e0b' }} />
            POC 控制点
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-2.5 rounded-sm border' style={{ background: 'rgba(6,182,212,0.35)', borderColor: '#06b6d4' }} />
            当前价区间
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
