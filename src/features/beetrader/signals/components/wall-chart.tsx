import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
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
  /** 显示用标签 */
  label: string
  /** 原始价格 */
  price: number
  /** 支撑强度（负值，柱子向左） */
  support: number
  /** 压力强度（正值，柱子向右） */
  resistance: number
  /** 数据来源标签 */
  sources: string[]
}

/**
 * 挂单墙 & 量能墙图表 — 水平双向柱状图
 *
 * Y 轴: 价格（从高到低）
 * X 轴: 强度（左 = 支撑/绿，右 = 压力/红）
 * 当前价、布林、Vegas 作为水平参考线
 */
export function WallChart({ chartData, currentPrice, bollUpper, bollLower, vegasUpper, vegasLower, coin }: WallChartProps) {
  const { points, absMax, refLines } = useMemo(() => {
    // ── 1. 确定可视价格范围 ──
    // 以当前价为中心，取 boll / vegas 范围再外扩 1%
    const refPrices = [currentPrice, bollUpper, bollLower, vegasUpper, vegasLower]
    const rangeMin = Math.min(...refPrices) * 0.99
    const rangeMax = Math.max(...refPrices) * 1.01

    // ── 2. 收集所有数据点 ──
    const map = new Map<string, ChartPoint>()

    const upsert = (price: number, value: number, side: 'support' | 'resistance', source: string) => {
      if (price < rangeMin || price > rangeMax) return
      // 按价格分桶：对齐到当前价的 0.1%
      const bucketSize = currentPrice * 0.001
      const key = (Math.round(price / bucketSize) * bucketSize).toFixed(2)
      if (!map.has(key)) {
        const p = parseFloat(key)
        map.set(key, { label: key, price: p, support: 0, resistance: 0, sources: [] })
      }
      const pt = map.get(key)!
      if (side === 'support') {
        pt.support -= value // 负值向左
      } else {
        pt.resistance += value
      }
      if (!pt.sources.includes(source)) pt.sources.push(source)
    }

    // Volume profile 1H
    const vp1h = chartData.volume_profile['1h']
    const maxVp1h = Math.max(...vp1h.map((v) => v.volume), 1)
    for (const v of vp1h) {
      const norm = (v.volume / maxVp1h) * 100
      upsert(v.price, norm, v.price < currentPrice ? 'support' : 'resistance', 'VP 1H')
    }

    // Volume profile 4H
    const vp4h = chartData.volume_profile['4h']
    const maxVp4h = Math.max(...vp4h.map((v) => v.volume), 1)
    for (const v of vp4h) {
      const norm = (v.volume / maxVp4h) * 70
      upsert(v.price, norm, v.price < currentPrice ? 'support' : 'resistance', 'VP 4H')
    }

    // L2 买盘墙
    const allL2 = [...chartData.l2_walls.bids.map((b) => b.size), ...chartData.l2_walls.asks.map((a) => a.size)]
    const maxL2 = Math.max(...allL2, 1)
    for (const b of chartData.l2_walls.bids) {
      upsert(b.price, (b.size / maxL2) * 80, 'support', 'L2 盘口')
    }
    for (const a of chartData.l2_walls.asks) {
      upsert(a.price, (a.size / maxL2) * 80, 'resistance', 'L2 盘口')
    }

    // ── 3. 排序（价格从高到低，y 轴顶部是高价） ──
    const sorted = Array.from(map.values()).sort((a, b) => b.price - a.price)
    const am = Math.max(...sorted.map((p) => Math.max(Math.abs(p.support), p.resistance)), 1)

    // ── 4. 参考线 ──
    const lines = [
      { price: currentPrice, color: 'hsl(45, 93%, 58%)', label: `当前价 $${formatPriceShort(currentPrice)}`, width: 2 },
      { price: bollUpper, color: '#818cf8', label: '1H 布林上轨', width: 1 },
      { price: bollLower, color: '#818cf8', label: '1H 布林下轨', width: 1 },
      { price: vegasUpper, color: '#fbbf24', label: '4H Vegas 上', width: 1 },
      { price: vegasLower, color: '#fbbf24', label: '4H Vegas 下', width: 1 },
    ]

    return { points: sorted, absMax: am, refLines: lines }
  }, [chartData, currentPrice, bollUpper, bollLower, vegasUpper, vegasLower])

  if (points.length === 0) return null

  const chartHeight = Math.max(280, points.length * 28 + 40)

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <ShieldAlert className='h-4 w-4' />
          {coin} 挂单墙 & 量能墙
          <div className='flex gap-1 ml-auto flex-wrap'>
            <Badge variant='outline' className='text-xs gap-1'>
              <span className='inline-block w-2 h-2 rounded-sm bg-green-500' />
              支撑
            </Badge>
            <Badge variant='outline' className='text-xs gap-1'>
              <span className='inline-block w-2 h-2 rounded-sm bg-red-500' />
              压力
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={chartHeight}>
          <BarChart
            data={points}
            layout='vertical'
            margin={{ top: 5, right: 80, bottom: 20, left: 5 }}
            barCategoryGap='18%'
          >
            <XAxis
              type='number'
              domain={[-absMax * 1.15, absMax * 1.15]}
              tickFormatter={(v: number) => Math.abs(v).toFixed(0)}
              stroke='#888888'
              fontSize={10}
              axisLine={false}
              tickLine={false}
              label={{ value: '← 支撑强度 | 压力强度 →', position: 'insideBottom', offset: -12, fill: '#a1a1aa', fontSize: 10 }}
            />
            <CartesianGrid horizontal={false} strokeDasharray='3 3' strokeOpacity={0.15} />
            {/* 零轴分隔线 */}
            <ReferenceLine x={0} stroke='#555' strokeWidth={1} />
            <YAxis
              type='category'
              dataKey='label'
              width={70}
              stroke='#888888'
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#a1a1aa' }}
            />
            <Tooltip content={<WallTooltip currentPrice={currentPrice} />} />

            {/* 支撑（向左，绿色） */}
            <Bar dataKey='support' radius={[4, 0, 0, 4]} maxBarSize={22}>
              {points.map((pt, i) => (
                <Cell
                  key={i}
                  fill={pt.sources.includes('L2 盘口') ? 'hsl(142, 76%, 36%)' : 'hsl(142, 71%, 45%)'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>

            {/* 压力（向右，红色） */}
            <Bar dataKey='resistance' radius={[0, 4, 4, 0]} maxBarSize={22}>
              {points.map((pt, i) => (
                <Cell
                  key={i}
                  fill={pt.sources.includes('L2 盘口') ? 'hsl(0, 72%, 51%)' : 'hsl(0, 84%, 60%)'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>

            {/* 参考线 */}
            {refLines.map((rl) => {
              // 只显示价格在数据范围内的参考线
              const priceLabels = points.map((p) => p.label)
              const closest = priceLabels.reduce((prev, curr) =>
                Math.abs(parseFloat(curr) - rl.price) < Math.abs(parseFloat(prev) - rl.price) ? curr : prev
              )
              if (Math.abs(parseFloat(closest) - rl.price) / rl.price > 0.005) return null
              return (
                <ReferenceLine
                  key={rl.label}
                  y={closest}
                  stroke={rl.color}
                  strokeWidth={rl.width}
                  strokeDasharray={rl.price === currentPrice ? '6 3' : '3 3'}
                  strokeOpacity={rl.price === currentPrice ? 1 : 0.6}
                  label={{
                    value: rl.label,
                    position: 'right',
                    fill: rl.color,
                    fontSize: 10,
                  }}
                />
              )
            })}
          </BarChart>
        </ResponsiveContainer>

        {/* 图例 */}
        <div className='flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground justify-center'>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-3 rounded-sm bg-green-600' />
            L2 买盘墙
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-3 rounded-sm bg-green-500' />
            1H/4H 量能支撑
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-3 rounded-sm bg-red-600' />
            L2 卖盘墙
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-3 rounded-sm bg-red-500' />
            1H/4H 量能压力
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t-2 border-dashed' style={{ borderColor: 'hsl(45, 93%, 58%)' }} />
            当前价
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t border-dashed border-indigo-400' />
            1H 布林
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t border-dashed border-amber-400' />
            4H Vegas
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 工具函数
// ============================================

function formatPriceShort(v: number) {
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`
  if (v >= 1000) return v.toFixed(0)
  return v.toFixed(2)
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
  const side = point.price < currentPrice ? '支撑区' : '压力区'

  const supportVal = Math.abs(point.support)
  const resistanceVal = point.resistance

  return (
    <div className='rounded-lg border bg-background p-2.5 shadow-md text-sm space-y-1 min-w-[160px]'>
      <div className='font-medium font-mono'>
        ${point.price.toFixed(2)}
      </div>
      <div className='text-xs text-muted-foreground'>
        距当前价 {dist}% · {side}
      </div>
      {supportVal > 0 && (
        <div className='flex justify-between gap-4'>
          <span className='text-green-500'>支撑强度</span>
          <span className='font-mono'>{supportVal.toFixed(1)}</span>
        </div>
      )}
      {resistanceVal > 0 && (
        <div className='flex justify-between gap-4'>
          <span className='text-red-500'>压力强度</span>
          <span className='font-mono'>{resistanceVal.toFixed(1)}</span>
        </div>
      )}
      {point.sources.length > 0 && (
        <div className='text-xs text-muted-foreground pt-1 border-t'>
          来源: {point.sources.join(' + ')}
        </div>
      )}
    </div>
  )
}
