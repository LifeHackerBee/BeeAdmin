import { useMemo, useRef, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'
import type { ChartData } from '../hooks/use-order-radar'

interface WallChartProps {
  chartData: ChartData
  currentPrice: number
  coin: string
}

interface ChartPoint {
  label: string
  price: number
  l2Support: number
  vpSupport: number
  l2Resistance: number
  vpResistance: number
}

interface RefLine {
  price: number
  color: string
  label: string
  width: number
  dash: string
  bucketKey: string
}

// 颜色方案
const COLORS = {
  currentPrice: 'hsl(45, 93%, 58%)',
  // 柱状图 — 4 类颜色明确区分
  l2Buy: '#3b82f6',        // 蓝色 - L2 买盘墙
  vpSupport: '#22c55e',    // 绿色 - 量能支撑
  l2Sell: '#f59e0b',       // 琥珀色 - L2 卖盘墙
  vpResistance: '#ef4444', // 红色 - 量能压力
  // 布林参考线
  boll1h: '#818cf8',
  boll4h: '#c084fc',
  boll1d: '#f472b6',
  // Vegas 参考线
  vegas1h: '#34d399',
  vegas4h: '#fbbf24',
  vegas1d: '#fb923c',
}

/**
 * 挂单墙 & 量能墙图表 — 水平双向柱状图
 *
 * Y 轴: 价格（从高到低）
 * X 轴: 强度（左 = 支撑，右 = 压力）
 * 柱状图: L2(蓝/琥珀) 和 量能(绿/红) 分别堆叠，清晰区分
 * 参考线: 多时段布林、Vegas 水平线
 */
export function WallChart({ chartData, currentPrice, coin }: WallChartProps) {
  const { points, absMax, refLines } = useMemo(() => {
    const bollinger = chartData.bollinger ?? {}
    const vegas = chartData.vegas ?? {}

    // ── 1. 收集参考价确定可视范围 ──
    const refPrices: number[] = [currentPrice]
    for (const tf of ['1h', '4h', '1d'] as const) {
      const b = (bollinger as Record<string, { upper: number; lower: number } | null>)[tf]
      if (b) refPrices.push(b.upper, b.lower)
      const v = (vegas as Record<string, { upper: number; lower: number } | null>)[tf]
      if (v) refPrices.push(v.upper, v.lower)
    }
    const rangeMin = Math.min(...refPrices) * 0.99
    const rangeMax = Math.max(...refPrices) * 1.01

    // ── 2. 构建参考线（先构建，后面插入占位点保证必定能画） ──
    const bucketSize = currentPrice * 0.001
    const toBucket = (price: number) =>
      (Math.round(price / bucketSize) * bucketSize).toFixed(2)

    type RawLine = Omit<RefLine, 'bucketKey'>
    const rawLines: RawLine[] = [
      { price: currentPrice, color: COLORS.currentPrice, label: `当前价 $${formatPriceShort(currentPrice)}`, width: 2, dash: '6 3' },
    ]
    if (bollinger['1h']) {
      rawLines.push({ price: bollinger['1h'].upper, color: COLORS.boll1h, label: '1H 布林上轨', width: 1, dash: '3 3' })
      rawLines.push({ price: bollinger['1h'].lower, color: COLORS.boll1h, label: '1H 布林下轨', width: 1, dash: '3 3' })
    }
    if (bollinger['4h']) {
      rawLines.push({ price: bollinger['4h'].upper, color: COLORS.boll4h, label: '4H 布林上轨', width: 1.5, dash: '6 2' })
      rawLines.push({ price: bollinger['4h'].lower, color: COLORS.boll4h, label: '4H 布林下轨', width: 1.5, dash: '6 2' })
    }
    if (bollinger['1d']) {
      rawLines.push({ price: bollinger['1d'].upper, color: COLORS.boll1d, label: '1D 布林上轨', width: 2, dash: '8 3' })
      rawLines.push({ price: bollinger['1d'].lower, color: COLORS.boll1d, label: '1D 布林下轨', width: 2, dash: '8 3' })
    }
    if (vegas['1h']) {
      rawLines.push({ price: vegas['1h'].upper, color: COLORS.vegas1h, label: '1H Vegas 上', width: 1, dash: '3 3' })
      rawLines.push({ price: vegas['1h'].lower, color: COLORS.vegas1h, label: '1H Vegas 下', width: 1, dash: '3 3' })
    }
    if (vegas['4h']) {
      rawLines.push({ price: vegas['4h'].upper, color: COLORS.vegas4h, label: '4H Vegas 上', width: 1.5, dash: '6 2' })
      rawLines.push({ price: vegas['4h'].lower, color: COLORS.vegas4h, label: '4H Vegas 下', width: 1.5, dash: '6 2' })
    }
    if (vegas['1d']) {
      rawLines.push({ price: vegas['1d'].upper, color: COLORS.vegas1d, label: '1D Vegas 上', width: 2, dash: '8 3' })
      rawLines.push({ price: vegas['1d'].lower, color: COLORS.vegas1d, label: '1D Vegas 下', width: 2, dash: '8 3' })
    }

    // ── 3. 收集数据点 ──
    const map = new Map<string, ChartPoint>()
    const getOrCreate = (price: number): ChartPoint | null => {
      if (price < rangeMin || price > rangeMax) return null
      const key = toBucket(price)
      if (!map.has(key)) {
        map.set(key, {
          label: key,
          price: parseFloat(key),
          l2Support: 0,
          vpSupport: 0,
          l2Resistance: 0,
          vpResistance: 0,
        })
      }
      return map.get(key)!
    }

    // Volume profile 1H
    const vp1h = chartData.volume_profile['1h']
    const maxVp1h = Math.max(...vp1h.map((v) => v.volume), 1)
    for (const v of vp1h) {
      const pt = getOrCreate(v.price)
      if (!pt) continue
      const norm = (v.volume / maxVp1h) * 100
      if (v.price < currentPrice) pt.vpSupport -= norm
      else pt.vpResistance += norm
    }

    // Volume profile 4H
    const vp4h = chartData.volume_profile['4h']
    const maxVp4h = Math.max(...vp4h.map((v) => v.volume), 1)
    for (const v of vp4h) {
      const pt = getOrCreate(v.price)
      if (!pt) continue
      const norm = (v.volume / maxVp4h) * 70
      if (v.price < currentPrice) pt.vpSupport -= norm
      else pt.vpResistance += norm
    }

    // Volume profile 1D
    const vp1d = chartData.volume_profile['1d'] ?? []
    if (vp1d.length > 0) {
      const maxVp1d = Math.max(...vp1d.map((v) => v.volume), 1)
      for (const v of vp1d) {
        const pt = getOrCreate(v.price)
        if (!pt) continue
        const norm = (v.volume / maxVp1d) * 50
        if (v.price < currentPrice) pt.vpSupport -= norm
        else pt.vpResistance += norm
      }
    }

    // L2 盘口 — 买卖盘分别归一化，避免一方过大压缩另一方
    const maxL2Bid = Math.max(...chartData.l2_walls.bids.map((b) => b.size), 1)
    const maxL2Ask = Math.max(...chartData.l2_walls.asks.map((a) => a.size), 1)
    for (const b of chartData.l2_walls.bids) {
      const pt = getOrCreate(b.price)
      if (!pt) continue
      pt.l2Support -= (b.size / maxL2Bid) * 100
    }
    for (const a of chartData.l2_walls.asks) {
      const pt = getOrCreate(a.price)
      if (!pt) continue
      pt.l2Resistance += (a.size / maxL2Ask) * 100
    }

    // ── 4. 在参考线价格插入占位数据点（保证参考线一定能画） ──
    for (const rl of rawLines) {
      getOrCreate(rl.price)
    }

    // ── 5. 排序（价格从高到低） ──
    const sorted = Array.from(map.values()).sort((a, b) => b.price - a.price)
    const am = Math.max(
      ...sorted.map((p) =>
        Math.max(
          Math.abs(p.l2Support + p.vpSupport),
          p.l2Resistance + p.vpResistance,
        ),
      ),
      1,
    )

    // ── 6. 参考线映射 bucket key ──
    const lines = rawLines.map((rl) => ({
      ...rl,
      bucketKey: toBucket(rl.price),
    }))

    return { points: sorted, absMax: am, refLines: lines }
  }, [chartData, currentPrice])

  const chartHeight = Math.max(280, points.length * 28 + 40)
  const maxVisibleHeight = 500
  const isScrollable = chartHeight > maxVisibleHeight

  const scrollRef = useRef<HTMLDivElement>(null)

  // 自动滚动到当前价格附近
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isScrollable) return
    // 找到当前价在 points 中的大致位置（points 已从高到低排序）
    const cpIdx = points.findIndex((p) => p.price <= currentPrice)
    if (cpIdx >= 0) {
      const ratio = cpIdx / points.length
      const scrollTo = ratio * chartHeight - maxVisibleHeight / 2
      el.scrollTop = Math.max(0, scrollTo)
    }
  }, [points, currentPrice, chartHeight, isScrollable, maxVisibleHeight])

  if (points.length === 0) return null

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <ShieldAlert className='h-4 w-4' />
          {coin} 挂单墙 & 量能墙
          {isScrollable && (
            <span className='text-[10px] text-muted-foreground font-normal ml-auto'>
              上下滚动查看完整图表
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 可滚动的图表容器 */}
        <div
          ref={scrollRef}
          className='relative'
          style={{
            maxHeight: maxVisibleHeight,
            overflowY: isScrollable ? 'auto' : 'hidden',
          }}
        >
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart
                data={points}
                layout='vertical'
                margin={{ top: 5, right: 100, bottom: 20, left: 5 }}
                barCategoryGap='12%'
              >
                <XAxis
                  type='number'
                  domain={[-absMax * 1.15, absMax * 1.15]}
                  tickFormatter={(v: number) => Math.abs(v).toFixed(0)}
                  stroke='#888888'
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: '← 支撑强度 | 压力强度 →',
                    position: 'insideBottom',
                    offset: -12,
                    fill: '#a1a1aa',
                    fontSize: 10,
                  }}
                />
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray='3 3'
                  strokeOpacity={0.15}
                />
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

                {/* 支撑（向左）— 独立 stackId 避免正负混叠 */}
                <Bar dataKey='l2Support' stackId='left' fill={COLORS.l2Buy} fillOpacity={0.9} maxBarSize={16} />
                <Bar dataKey='vpSupport' stackId='left' fill={COLORS.vpSupport} fillOpacity={0.85} radius={[4, 0, 0, 4]} maxBarSize={16} />

                {/* 压力（向右） */}
                <Bar dataKey='l2Resistance' stackId='right' fill={COLORS.l2Sell} fillOpacity={0.9} maxBarSize={16} />
                <Bar dataKey='vpResistance' stackId='right' fill={COLORS.vpResistance} fillOpacity={0.85} radius={[0, 4, 4, 0]} maxBarSize={16} />

                {/* 多时段参考线 — 直接用 bucketKey，不再 snap + threshold */}
                {refLines.map((rl) => (
                  <ReferenceLine
                    key={rl.label}
                    y={rl.bucketKey}
                    stroke={rl.color}
                    strokeWidth={rl.width}
                    strokeDasharray={rl.dash}
                    strokeOpacity={rl.label.startsWith('当前价') ? 1 : 0.7}
                    label={{
                      value: rl.label,
                      position: 'right',
                      fill: rl.color,
                      fontSize: 9,
                    }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 图例 */}
        <div className='flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs text-muted-foreground justify-center'>
          {/* 柱状图 */}
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-3 rounded-sm' style={{ background: COLORS.l2Buy }} />
            L2 买盘墙
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-3 rounded-sm' style={{ background: COLORS.vpSupport }} />
            量能支撑
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-3 rounded-sm' style={{ background: COLORS.l2Sell }} />
            L2 卖盘墙
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-3 h-3 rounded-sm' style={{ background: COLORS.vpResistance }} />
            量能压力
          </span>
          {/* 当前价 */}
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t-2 border-dashed' style={{ borderColor: COLORS.currentPrice }} />
            当前价
          </span>
          {/* 布林线 */}
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t border-dashed' style={{ borderColor: COLORS.boll1h }} />
            1H 布林
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t-[1.5px] border-dashed' style={{ borderColor: COLORS.boll4h }} />
            4H 布林
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t-2 border-dashed' style={{ borderColor: COLORS.boll1d }} />
            1D 布林
          </span>
          {/* Vegas */}
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t border-dashed' style={{ borderColor: COLORS.vegas1h }} />
            1H Vegas
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t-[1.5px] border-dashed' style={{ borderColor: COLORS.vegas4h }} />
            4H Vegas
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-4 border-t-2 border-dashed' style={{ borderColor: COLORS.vegas1d }} />
            1D Vegas
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

function WallTooltip({
  active,
  payload,
  currentPrice,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number; payload: ChartPoint }[]
  currentPrice: number
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const dist = (((point.price - currentPrice) / currentPrice) * 100).toFixed(2)
  const side = point.price < currentPrice ? '支撑区' : '压力区'

  const l2s = Math.abs(point.l2Support)
  const vps = Math.abs(point.vpSupport)
  const l2r = point.l2Resistance
  const vpr = point.vpResistance

  if (l2s === 0 && vps === 0 && l2r === 0 && vpr === 0) return null

  return (
    <div className='rounded-lg border bg-background p-2.5 shadow-md text-sm space-y-1 min-w-[180px]'>
      <div className='font-medium font-mono'>${point.price.toFixed(2)}</div>
      <div className='text-xs text-muted-foreground'>
        距当前价 {dist}% · {side}
      </div>
      {l2s > 0 && (
        <div className='flex justify-between gap-4'>
          <span style={{ color: COLORS.l2Buy }}>L2 买盘</span>
          <span className='font-mono'>{l2s.toFixed(1)}</span>
        </div>
      )}
      {vps > 0 && (
        <div className='flex justify-between gap-4'>
          <span style={{ color: COLORS.vpSupport }}>量能支撑</span>
          <span className='font-mono'>{vps.toFixed(1)}</span>
        </div>
      )}
      {l2r > 0 && (
        <div className='flex justify-between gap-4'>
          <span style={{ color: COLORS.l2Sell }}>L2 卖盘</span>
          <span className='font-mono'>{l2r.toFixed(1)}</span>
        </div>
      )}
      {vpr > 0 && (
        <div className='flex justify-between gap-4'>
          <span style={{ color: COLORS.vpResistance }}>量能压力</span>
          <span className='font-mono'>{vpr.toFixed(1)}</span>
        </div>
      )}
    </div>
  )
}
