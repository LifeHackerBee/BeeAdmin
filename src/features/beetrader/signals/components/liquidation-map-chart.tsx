import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flame } from 'lucide-react'
import type { LiquidationData } from '../hooks/use-liquidation-map'

interface LiquidationMapChartProps {
  data: LiquidationData
  coin: string
}

interface ChartPoint {
  price: number
  priceLabel: string
  longBar: number | null
  shortBar: number | null
  cumLong: number | null
  cumShort: number | null
}

/**
 * 清算热力图
 *
 * X 轴: 价格
 * Y 轴左: 各价格点清算量（柱状图，多头绿色在下，空头红色在上）
 * Y 轴右: 累计清算量（折线）
 * 当前价标记为竖直参考线
 */
export function LiquidationMapChart({ data, coin }: LiquidationMapChartProps) {
  const { points, maxBar, currentPrice } = useMemo(() => {
    const map = new Map<number, ChartPoint>()

    // 收集多头清算点（价格低于当前价）
    for (const pt of data.long) {
      map.set(pt.price, {
        price: pt.price,
        priceLabel: formatPrice(pt.price),
        longBar: pt.liquidation_leverage,
        shortBar: null,
        cumLong: pt.cumulative_leverage,
        cumShort: null,
      })
    }

    // 收集空头清算点（价格高于当前价）
    for (const pt of data.short) {
      const existing = map.get(pt.price)
      if (existing) {
        existing.shortBar = pt.liquidation_leverage
        existing.cumShort = pt.cumulative_leverage
      } else {
        map.set(pt.price, {
          price: pt.price,
          priceLabel: formatPrice(pt.price),
          longBar: null,
          shortBar: pt.liquidation_leverage,
          cumLong: null,
          cumShort: pt.cumulative_leverage,
        })
      }
    }

    // 按价格排序
    const sorted = Array.from(map.values()).sort((a, b) => a.price - b.price)

    // 找最大柱高（用于 Y 轴范围）
    let mb = 0
    for (const p of sorted) {
      if (p.longBar != null && p.longBar > mb) mb = p.longBar
      if (p.shortBar != null && p.shortBar > mb) mb = p.shortBar
    }

    return {
      points: sorted,
      maxBar: mb || 1,
      currentPrice: data.current_price,
    }
  }, [data])

  if (points.length === 0) return null

  // 采样 X 轴 tick，避免过于密集
  const tickInterval = Math.max(1, Math.floor(points.length / 15))

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <Flame className='h-4 w-4' />
          {coin} 清算热力图
          <span className='text-xs text-muted-foreground font-normal'>数据来源: CoinGlass</span>
          <div className='flex gap-1 ml-auto flex-wrap'>
            <Badge variant='outline' className='text-xs gap-1'>
              <span className='inline-block w-2 h-2 rounded-sm bg-green-500' />
              多头清算 ${formatCompact(data.meta.total_long_leverage)}
            </Badge>
            <Badge variant='outline' className='text-xs gap-1'>
              <span className='inline-block w-2 h-2 rounded-sm bg-red-500' />
              空头清算 ${formatCompact(data.meta.total_short_leverage)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={320}>
          <ComposedChart data={points} margin={{ top: 10, right: 50, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray='3 3' strokeOpacity={0.15} />
            <XAxis
              dataKey='priceLabel'
              stroke='#888888'
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              angle={-30}
              textAnchor='end'
              height={50}
            />
            <YAxis
              yAxisId='bar'
              stroke='#888888'
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCompact(v)}
              domain={[0, maxBar * 1.1]}
            />
            <YAxis
              yAxisId='cum'
              orientation='right'
              stroke='#888888'
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCompact(v)}
            />

            <Tooltip content={<LiquidationTooltip currentPrice={currentPrice} />} />

            {/* 当前价参考线 */}
            {currentPrice != null && (
              <ReferenceLine
                x={formatPrice(currentPrice)}
                yAxisId='bar'
                stroke='hsl(45, 93%, 58%)'
                strokeWidth={2}
                strokeDasharray='6 3'
                label={{
                  value: `当前价 $${formatPrice(currentPrice)}`,
                  position: 'top',
                  fill: 'hsl(45, 93%, 58%)',
                  fontSize: 11,
                }}
              />
            )}

            {/* 多头清算柱（绿色） */}
            <Bar yAxisId='bar' dataKey='longBar' maxBarSize={8} radius={[2, 2, 0, 0]}>
              {points.map((_, i) => (
                <Cell key={i} fill='hsl(142, 71%, 45%)' fillOpacity={0.85} />
              ))}
            </Bar>

            {/* 空头清算柱（红色） */}
            <Bar yAxisId='bar' dataKey='shortBar' maxBarSize={8} radius={[2, 2, 0, 0]}>
              {points.map((_, i) => (
                <Cell key={i} fill='hsl(0, 84%, 60%)' fillOpacity={0.85} />
              ))}
            </Bar>

            {/* 累计多头清算线 */}
            <Line
              yAxisId='cum'
              type='monotone'
              dataKey='cumLong'
              stroke='hsl(142, 76%, 36%)'
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
            />

            {/* 累计空头清算线 */}
            <Line
              yAxisId='cum'
              type='monotone'
              dataKey='cumShort'
              stroke='hsl(0, 72%, 51%)'
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* 图例 */}
        <div className='flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground justify-center'>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-3 rounded-sm bg-green-500' />
            多头清算
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-3 rounded-sm bg-red-500' />
            空头清算
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t-2 border-green-700' />
            累计多头
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t-2 border-red-700' />
            累计空头
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t-2 border-dashed' style={{ borderColor: 'hsl(45, 93%, 58%)' }} />
            当前价
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 工具函数
// ============================================

function formatPrice(v: number) {
  if (v >= 10000) return v.toFixed(0)
  if (v >= 100) return v.toFixed(1)
  return v.toFixed(2)
}

function formatCompact(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toFixed(1)
}

// ============================================
// 自定义 Tooltip
// ============================================

function LiquidationTooltip({
  active,
  payload,
  currentPrice,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number; payload: ChartPoint }[]
  currentPrice: number | null
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  const dist =
    currentPrice != null
      ? (((point.price - currentPrice) / currentPrice) * 100).toFixed(2)
      : null

  return (
    <div className='rounded-lg border bg-background p-2.5 shadow-md text-sm space-y-1 min-w-[180px]'>
      <div className='font-medium font-mono'>${formatPrice(point.price)}</div>
      {dist != null && (
        <div className='text-xs text-muted-foreground'>
          距当前价 {dist}%
        </div>
      )}
      {point.longBar != null && point.longBar > 0 && (
        <div className='flex justify-between gap-4'>
          <span className='text-green-500'>多头清算</span>
          <span className='font-mono'>${formatCompact(point.longBar)}</span>
        </div>
      )}
      {point.shortBar != null && point.shortBar > 0 && (
        <div className='flex justify-between gap-4'>
          <span className='text-red-500'>空头清算</span>
          <span className='font-mono'>${formatCompact(point.shortBar)}</span>
        </div>
      )}
      {point.cumLong != null && (
        <div className='flex justify-between gap-4 text-xs'>
          <span className='text-muted-foreground'>累计多头</span>
          <span className='font-mono'>${formatCompact(point.cumLong)}</span>
        </div>
      )}
      {point.cumShort != null && (
        <div className='flex justify-between gap-4 text-xs'>
          <span className='text-muted-foreground'>累计空头</span>
          <span className='font-mono'>${formatCompact(point.cumShort)}</span>
        </div>
      )}
    </div>
  )
}
