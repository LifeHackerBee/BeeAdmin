import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { CandleData } from '../hooks/use-candle-data'

interface CandlestickChartProps {
  data: CandleData[]
  loading?: boolean
  coin: string
  interval: string
}

interface ChartDataPoint {
  time: number
  timeLabel: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  isUp: boolean
}

function formatChartData(candles: CandleData[]): ChartDataPoint[] {
  return candles.map((candle) => ({
    time: candle.t,
    timeLabel: format(new Date(candle.t), 'MM-dd HH:mm', { locale: zhCN }),
    open: parseFloat(candle.o),
    high: parseFloat(candle.h),
    low: parseFloat(candle.l),
    close: parseFloat(candle.c),
    volume: parseFloat(candle.v),
    isUp: parseFloat(candle.c) >= parseFloat(candle.o),
  }))
}

export function CandlestickChart({ data, loading, coin, interval }: CandlestickChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipData, setTooltipData] = useState<ChartDataPoint | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  const chartData = useMemo(() => formatChartData(data), [data])

  const { minPrice, maxPrice, priceRange, padding } = useMemo(() => {
    if (chartData.length === 0) {
      return { minPrice: 0, maxPrice: 0, priceRange: 0, padding: 0 }
    }
    const min = Math.min(...chartData.map((d) => d.low))
    const max = Math.max(...chartData.map((d) => d.high))
    const range = max - min
    const pad = range * 0.1
    return { minPrice: min, maxPrice: max, priceRange: range, padding: pad }
  }, [chartData])

  // 生成 Y 轴刻度 - 必须在条件返回之前调用
  const yTicks = useMemo(() => {
    const ticks = []
    const numTicks = 8
    for (let i = 0; i <= numTicks; i++) {
      const price = minPrice - padding + (priceRange + padding * 2) * (i / numTicks)
      ticks.push(price)
    }
    return ticks
  }, [minPrice, maxPrice, priceRange, padding])

  // 生成 X 轴刻度标签 - 必须在条件返回之前调用
  const xTicks = useMemo(() => {
    if (chartData.length === 0) return []
    const numTicks = Math.min(10, chartData.length)
    const step = Math.floor(chartData.length / numTicks)
    return chartData
      .map((d, i) => ({ label: d.timeLabel, index: i }))
      .filter((_, i) => i % step === 0 || i === chartData.length - 1)
  }, [chartData])

  const chartHeight = 400
  const chartWidth = 800
  const margin = { top: 20, right: 50, bottom: 60, left: 80 }
  const innerWidth = chartWidth - margin.left - margin.right
  const innerHeight = chartHeight - margin.top - margin.bottom

  const priceScale = (price: number) => {
    const range = maxPrice - minPrice + padding * 2
    return innerHeight - ((price - (minPrice - padding)) / range) * innerHeight
  }

  const xScale = (index: number) => {
    return (index / (chartData.length - 1 || 1)) * innerWidth
  }

  const candleWidth = Math.max(2, Math.min(8, innerWidth / (chartData.length || 1) - 2))

  const handleMouseMove = (e: React.MouseEvent<SVGElement>, index: number) => {
    const svgElement = e.currentTarget.closest('svg')
    if (!svgElement) return
    const rect = svgElement.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setHoveredIndex(index)
    setTooltipData(chartData[index])
    setTooltipPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
    setTooltipData(null)
    setTooltipPosition(null)
  }

  // 只在首次加载且没有数据时显示 loading
  if (loading && chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{coin} K线图</CardTitle>
          <CardDescription>时间间隔: {interval}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className='h-[400px] w-full' />
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{coin} K线图</CardTitle>
          <CardDescription>时间间隔: {interval}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-[400px] items-center justify-center text-muted-foreground'>
            暂无数据
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{coin} K线图</CardTitle>
        <CardDescription>时间间隔: {interval}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='relative w-full overflow-x-auto'>
          <svg
            width={chartWidth}
            height={chartHeight}
            className='overflow-visible'
            onMouseLeave={handleMouseLeave}
          >
            <g transform={`translate(${margin.left},${margin.top})`}>
              {/* Y 轴网格线 */}
              {yTicks.map((tick, i) => {
                const y = priceScale(tick)
                return (
                  <g key={i}>
                    <line
                      x1={0}
                      y1={y}
                      x2={innerWidth}
                      y2={y}
                      stroke='#e5e7eb'
                      strokeWidth={1}
                      strokeDasharray='2,2'
                    />
                  </g>
                )
              })}

              {/* 绘制 K 线 */}
              {chartData.map((item, index) => {
                const x = xScale(index)
                const openY = priceScale(item.open)
                const closeY = priceScale(item.close)
                const highY = priceScale(item.high)
                const lowY = priceScale(item.low)
                const isUp = item.isUp
                const color = isUp ? '#10b981' : '#ef4444'
                const isHovered = hoveredIndex === index

                return (
                  <g
                    key={index}
                    onMouseMove={(e) => handleMouseMove(e, index)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* 上影线 */}
                    <line
                      x1={x}
                      y1={highY}
                      x2={x}
                      y2={Math.max(openY, closeY)}
                      stroke={color}
                      strokeWidth={isHovered ? 2 : 1}
                    />
                    {/* K线实体 */}
                    <rect
                      x={x - candleWidth / 2}
                      y={Math.min(openY, closeY)}
                      width={candleWidth}
                      height={Math.max(Math.abs(closeY - openY), 1)}
                      fill={color}
                      stroke={color}
                      strokeWidth={isHovered ? 2 : 1}
                    />
                    {/* 下影线 */}
                    <line
                      x1={x}
                      y1={Math.min(openY, closeY)}
                      x2={x}
                      y2={lowY}
                      stroke={color}
                      strokeWidth={isHovered ? 2 : 1}
                    />
                  </g>
                )
              })}

              {/* Y 轴 */}
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke='#374151' strokeWidth={2} />
              {/* Y 轴刻度 */}
              {yTicks.map((tick, i) => {
                const y = priceScale(tick)
                return (
                  <g key={i}>
                    <line x1={-5} y1={y} x2={0} y2={y} stroke='#374151' strokeWidth={1} />
                    <text
                      x={-10}
                      y={y}
                      textAnchor='end'
                      dominantBaseline='middle'
                      fontSize={12}
                      fill='#6b7280'
                    >
                      ${tick.toFixed(2)}
                    </text>
                  </g>
                )
              })}

              {/* X 轴 */}
              <line
                x1={0}
                y1={innerHeight}
                x2={innerWidth}
                y2={innerHeight}
                stroke='#374151'
                strokeWidth={2}
              />
              {/* X 轴刻度 */}
              {xTicks.map((tick, i) => {
                const x = xScale(tick.index)
                return (
                  <g key={i}>
                    <line
                      x1={x}
                      y1={innerHeight}
                      x2={x}
                      y2={innerHeight + 5}
                      stroke='#374151'
                      strokeWidth={1}
                    />
                    <text
                      x={x}
                      y={innerHeight + 20}
                      textAnchor='middle'
                      fontSize={10}
                      fill='#6b7280'
                      transform={`rotate(-45 ${x} ${innerHeight + 20})`}
                    >
                      {tick.label}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Tooltip */}
          {tooltipData && tooltipPosition && (
            <div
              className='absolute bg-background border rounded-lg p-3 shadow-lg pointer-events-none z-10'
              style={{
                left: `${tooltipPosition.x + 10}px`,
                top: `${tooltipPosition.y - 10}px`,
                transform: 'translateY(-100%)',
              }}
            >
              <p className='font-semibold mb-2'>{tooltipData.timeLabel}</p>
              <div className='space-y-1 text-sm'>
                <p>
                  <span className='text-muted-foreground'>开盘: </span>
                  <span className='font-medium'>${tooltipData.open.toFixed(2)}</span>
                </p>
                <p>
                  <span className='text-muted-foreground'>最高: </span>
                  <span className='font-medium text-green-600'>${tooltipData.high.toFixed(2)}</span>
                </p>
                <p>
                  <span className='text-muted-foreground'>最低: </span>
                  <span className='font-medium text-red-600'>${tooltipData.low.toFixed(2)}</span>
                </p>
                <p>
                  <span className='text-muted-foreground'>收盘: </span>
                  <span
                    className={`font-medium ${tooltipData.isUp ? 'text-green-600' : 'text-red-600'}`}
                  >
                    ${tooltipData.close.toFixed(2)}
                  </span>
                </p>
                <p>
                  <span className='text-muted-foreground'>成交量: </span>
                  <span className='font-medium'>{tooltipData.volume.toFixed(4)}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
