import { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  ColorType,
  LineStyle,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
  type LineWidth,
} from 'lightweight-charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CandleData } from '../hooks/use-candle-data'

// ─── Overlay types ────────────────────────────────────────────────────────────

export interface KeyLevelOverlay {
  name: string
  price: number
  is_resistance: boolean
  dist_pct?: number
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CandlestickChartProps {
  data: CandleData[]
  loading?: boolean
  coin: string
  interval: string
  keyLevels?: KeyLevelOverlay[]
  currentPrice?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_HEIGHT = 420

// ─── Component ────────────────────────────────────────────────────────────────

export function CandlestickChart({
  data,
  loading,
  coin,
  interval,
  keyLevels,
  currentPrice,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])

  // ── Create chart ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const isDark = document.documentElement.classList.contains('dark')
    const textColor = isDark ? '#9ca3af' : '#6b7280'
    const gridColor = isDark ? 'rgba(156,163,175,0.08)' : 'rgba(107,114,128,0.10)'
    const borderColor = isDark ? '#374151' : '#d1d5db'

    const chart = createChart(container, {
      autoSize: true,
      height: CHART_HEIGHT,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor },
      timeScale: { borderColor, timeVisible: true, secondsVisible: false },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    seriesRef.current = series

    return () => {
      priceLinesRef.current = []
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // ── Update candle data ────────────────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart || data.length === 0) return

    const formatted = [...data]
      .sort((a, b) => a.t - b.t)
      .map((d) => ({
        time: Math.floor(d.t / 1000) as UTCTimestamp,
        open: parseFloat(d.o),
        high: parseFloat(d.h),
        low: parseFloat(d.l),
        close: parseFloat(d.c),
      }))
      .filter((item, i, arr) => i === 0 || item.time !== arr[i - 1].time)

    series.setData(formatted)
    chart.timeScale().fitContent()
  }, [data])

  // ── Update price lines (key levels + current price) ───────────────────────
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return

    for (const line of priceLinesRef.current) {
      try {
        series.removePriceLine(line)
      } catch {
        /* ignore */
      }
    }
    priceLinesRef.current = []

    const newLines: IPriceLine[] = []

    // Current price — yellow dashed
    if (currentPrice) {
      newLines.push(
        series.createPriceLine({
          price: currentPrice,
          color: '#fbbf24',
          lineWidth: 1 as LineWidth,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '当前价',
        })
      )
    }

    // Key levels — top 10 closest, dashed lines
    const levels = [...(keyLevels ?? [])]
      .sort((a, b) => Math.abs(a.dist_pct ?? 0) - Math.abs(b.dist_pct ?? 0))
      .slice(0, 10)

    for (const level of levels) {
      newLines.push(
        series.createPriceLine({
          price: level.price,
          color: level.is_resistance ? 'rgba(239,68,68,0.65)' : 'rgba(16,185,129,0.65)',
          lineWidth: 1 as LineWidth,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: level.name,
        })
      )
    }

    priceLinesRef.current = newLines
  }, [keyLevels, currentPrice])

  // ── Render ────────────────────────────────────────────────────────────────

  const hasOverlay = !!(currentPrice || (keyLevels && keyLevels.length > 0))

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='flex-shrink-0 pb-2 pt-4 px-4'>
        <CardTitle className='text-base flex items-center justify-between'>
          <span>{coin} K线图</span>
          <span className='text-xs font-normal text-muted-foreground'>
            {interval} · 拖拽平移 / 滚轮缩放
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className='flex-1 min-h-0 px-3 pb-3 pt-0 flex flex-col gap-2'>
        <div className='relative flex-shrink-0' style={{ height: CHART_HEIGHT }}>
          {loading && data.length === 0 && (
            <div className='absolute inset-0 z-10 bg-card'>
              <Skeleton className='w-full h-full rounded-none' />
            </div>
          )}
          <div ref={containerRef} className='w-full h-full' />
        </div>

        {/* ── Legend ── */}
        {hasOverlay && (
          <div className='flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground flex-shrink-0 px-1'>
            {currentPrice && (
              <span className='flex items-center gap-1.5'>
                <span
                  className='inline-block w-4 border-t border-dashed'
                  style={{ borderColor: '#fbbf24' }}
                />
                当前价
              </span>
            )}
            {keyLevels && keyLevels.length > 0 && (
              <>
                <span className='flex items-center gap-1.5'>
                  <span
                    className='inline-block w-4 border-t border-dashed'
                    style={{ borderColor: 'rgba(16,185,129,0.8)' }}
                  />
                  支撑位
                </span>
                <span className='flex items-center gap-1.5'>
                  <span
                    className='inline-block w-4 border-t border-dashed'
                    style={{ borderColor: 'rgba(239,68,68,0.8)' }}
                  />
                  压力位
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
