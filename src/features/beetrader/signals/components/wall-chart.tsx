import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert } from 'lucide-react'
import type { ChartData } from '../hooks/use-order-radar'

interface WallChartProps {
  chartData: ChartData
  currentPrice: number
  bollUpper: number
  bollLower: number
  vegasUpper: number
  vegasLower: number
  coin: string
}

interface ChartPoint {
  price: number
  priceLabel: string
  support: number
  resistance: number
  l2Bid: number
  l2Ask: number
}

/**
 * 挂单墙 & 量能墙图表
 * 参考 CoinGlass 清算热力图样式：
 * - X 轴: 价格
 * - Y 轴: 量能
 * - 绿色柱: 支撑（买盘墙 + 量能密集区 below price）
 * - 红色柱: 压力（卖盘墙 + 量能密集区 above price）
 * - 当前价、布林轨道、Vegas 通道作为参考线
 */
export function WallChart({ chartData, currentPrice, bollUpper, bollLower, vegasUpper, vegasLower, coin }: WallChartProps) {
  const { points, maxValue } = useMemo(() => {
    const map = new Map<number, ChartPoint>()

    const getOrCreate = (price: number): ChartPoint => {
      const rounded = Math.round(price * 100) / 100
      if (!map.has(rounded)) {
        map.set(rounded, {
          price: rounded,
          priceLabel: rounded.toFixed(2),
          support: 0,
          resistance: 0,
          l2Bid: 0,
          l2Ask: 0,
        })
      }
      return map.get(rounded)!
    }

    // Volume profile 1H — 归一化到 0~100
    const vp1h = chartData.volume_profile['1h']
    const maxVp1h = Math.max(...vp1h.map((v) => v.volume), 1)
    for (const v of vp1h) {
      const pt = getOrCreate(v.price)
      const normalized = (v.volume / maxVp1h) * 100
      if (v.price < currentPrice) {
        pt.support += normalized
      } else {
        pt.resistance += normalized
      }
    }

    // Volume profile 4H — 归一化，稍低权重叠加
    const vp4h = chartData.volume_profile['4h']
    const maxVp4h = Math.max(...vp4h.map((v) => v.volume), 1)
    for (const v of vp4h) {
      const pt = getOrCreate(v.price)
      const normalized = (v.volume / maxVp4h) * 60
      if (v.price < currentPrice) {
        pt.support += normalized
      } else {
        pt.resistance += normalized
      }
    }

    // L2 挂单墙 — 归一化
    const allL2Sizes = [...chartData.l2_walls.bids.map((b) => b.size), ...chartData.l2_walls.asks.map((a) => a.size)]
    const maxL2 = Math.max(...allL2Sizes, 1)
    for (const b of chartData.l2_walls.bids) {
      const pt = getOrCreate(b.price)
      pt.l2Bid = (b.size / maxL2) * 80
    }
    for (const a of chartData.l2_walls.asks) {
      const pt = getOrCreate(a.price)
      pt.l2Ask = (a.size / maxL2) * 80
    }

    const sorted = Array.from(map.values()).sort((a, b) => a.price - b.price)
    const mv = Math.max(...sorted.map((p) => Math.max(p.support + p.l2Bid, p.resistance + p.l2Ask)), 1)

    return { points: sorted, maxValue: mv }
  }, [chartData, currentPrice])

  if (points.length === 0) return null

  // 格式化价格轴
  const formatPrice = (v: number) => {
    if (v >= 10000) return `${(v / 1000).toFixed(1)}k`
    if (v >= 1000) return v.toFixed(0)
    return v.toFixed(2)
  }

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <ShieldAlert className='h-4 w-4' />
          {coin} 挂单墙 & 量能墙
          <div className='flex gap-1 ml-auto'>
            <Badge variant='outline' className='text-xs gap-1'>
              <span className='inline-block w-2 h-2 rounded-sm bg-green-500' />
              支撑
            </Badge>
            <Badge variant='outline' className='text-xs gap-1'>
              <span className='inline-block w-2 h-2 rounded-sm bg-red-500' />
              压力
            </Badge>
            <Badge variant='outline' className='text-xs gap-1'>
              <span className='inline-block w-2 h-2 rounded-sm bg-green-500/40' />
              <span className='inline-block w-2 h-2 rounded-sm bg-red-500/40' />
              L2 盘口
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={320}>
          <ComposedChart data={points} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
            <XAxis
              dataKey='price'
              type='number'
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatPrice}
              stroke='#888888'
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type='number'
              domain={[0, Math.ceil(maxValue * 1.1)]}
              hide
            />
            <Tooltip content={<WallTooltip currentPrice={currentPrice} />} />

            {/* Volume Profile 支撑 (绿) */}
            <Bar dataKey='support' stackId='a' barSize={12} radius={[2, 2, 0, 0]}>
              {points.map((_, i) => (
                <Cell key={i} fill='hsl(142, 71%, 45%)' fillOpacity={0.85} />
              ))}
            </Bar>
            {/* L2 买盘墙叠加 (浅绿) */}
            <Bar dataKey='l2Bid' stackId='a' barSize={12} radius={[2, 2, 0, 0]}>
              {points.map((_, i) => (
                <Cell key={i} fill='hsl(142, 71%, 45%)' fillOpacity={0.35} />
              ))}
            </Bar>
            {/* Volume Profile 压力 (红) */}
            <Bar dataKey='resistance' stackId='b' barSize={12} radius={[2, 2, 0, 0]}>
              {points.map((_, i) => (
                <Cell key={i} fill='hsl(0, 84%, 60%)' fillOpacity={0.85} />
              ))}
            </Bar>
            {/* L2 卖盘墙叠加 (浅红) */}
            <Bar dataKey='l2Ask' stackId='b' barSize={12} radius={[2, 2, 0, 0]}>
              {points.map((_, i) => (
                <Cell key={i} fill='hsl(0, 84%, 60%)' fillOpacity={0.35} />
              ))}
            </Bar>

            {/* 当前价 */}
            <ReferenceLine
              x={currentPrice}
              stroke='hsl(45, 93%, 58%)'
              strokeWidth={2}
              strokeDasharray='4 2'
              label={{
                value: `$${formatPrice(currentPrice)}`,
                position: 'top',
                fill: 'hsl(45, 93%, 58%)',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            {/* 布林轨道 */}
            <ReferenceLine x={bollUpper} stroke='#6366f1' strokeDasharray='3 3' strokeOpacity={0.5} />
            <ReferenceLine x={bollLower} stroke='#6366f1' strokeDasharray='3 3' strokeOpacity={0.5} />
            {/* Vegas 通道 */}
            <ReferenceLine x={vegasUpper} stroke='#f59e0b' strokeDasharray='6 3' strokeOpacity={0.4} />
            <ReferenceLine x={vegasLower} stroke='#f59e0b' strokeDasharray='6 3' strokeOpacity={0.4} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* 参考线图例 */}
        <div className='flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground justify-center'>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t-2 border-dashed' style={{ borderColor: 'hsl(45, 93%, 58%)' }} />
            当前价
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t border-dashed border-indigo-500' />
            布林轨道
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t border-dashed border-amber-500' />
            Vegas 通道
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 自定义 Tooltip
// ============================================

function WallTooltip({ active, payload, currentPrice }: {
  active?: boolean
  payload?: { dataKey: string; value: number; payload: ChartPoint }[]
  currentPrice: number
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const dist = ((point.price - currentPrice) / currentPrice * 100).toFixed(2)
  const side = point.price < currentPrice ? '支撑' : '压力'

  const vpStrength = point.price < currentPrice ? point.support : point.resistance
  const l2Strength = point.price < currentPrice ? point.l2Bid : point.l2Ask
  const totalStrength = vpStrength + l2Strength

  return (
    <div className='rounded-lg border bg-background p-2.5 shadow-md text-sm space-y-1'>
      <div className='font-medium'>
        ${point.price.toFixed(2)}{' '}
        <span className='text-muted-foreground font-normal'>
          ({dist}% {side})
        </span>
      </div>
      {vpStrength > 0 && (
        <div className='flex justify-between gap-4'>
          <span className='text-muted-foreground'>量能密集区</span>
          <span>{vpStrength.toFixed(1)}</span>
        </div>
      )}
      {l2Strength > 0 && (
        <div className='flex justify-between gap-4'>
          <span className='text-muted-foreground'>L2 盘口</span>
          <span>{l2Strength.toFixed(1)}</span>
        </div>
      )}
      {totalStrength > 0 && (
        <div className='flex justify-between gap-4 pt-1 border-t'>
          <span className='text-muted-foreground'>综合强度</span>
          <span className='font-medium'>{totalStrength.toFixed(1)}</span>
        </div>
      )}
    </div>
  )
}
