import { useCallback, useEffect, useRef, useState } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Crosshair,
  Magnet,
  Maximize2,
  Camera,
  RotateCcw,
} from 'lucide-react'
import type { CandleData } from '../hooks/use-candle-data'
import type { CandleInterval } from '../hooks/use-candle-data'

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
  onIntervalChange?: (interval: CandleInterval) => void
  onRefresh?: () => void
  refreshing?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_HEIGHT = 420
const INTERVALS: CandleInterval[] = ['15m', '1h', '4h', '1d']

// ─── Toolbar button ───────────────────────────────────────────────────────────

function ToolbarBtn({
  tooltip,
  active,
  onClick,
  children,
}: {
  tooltip: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          onClick={onClick}
          className={`inline-flex items-center justify-center h-7 w-7 rounded-sm transition-colors
            ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side='bottom' className='text-xs'>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CandlestickChart({
  data,
  loading,
  coin,
  interval,
  keyLevels,
  currentPrice,
  onIntervalChange,
  onRefresh,
  refreshing,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])

  const [crosshairMagnet, setCrosshairMagnet] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

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
      lastValueVisible: false,      // 隐藏内置的最后收盘价标签（用"当前价"线替代）
      priceLineVisible: false,      // 隐藏内置的最后价格水平线
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
    if (!series || data.length === 0) return

    for (const line of priceLinesRef.current) {
      try {
        series.removePriceLine(line)
      } catch {
        /* ignore */
      }
    }
    priceLinesRef.current = []

    const newLines: IPriceLine[] = []

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
  }, [keyLevels, currentPrice, data.length])

  // ── Toolbar actions ─────────────────────────────────────────────────────────

  const handleToggleCrosshair = useCallback(() => {
    const chart = chartRef.current
    if (!chart) return
    const next = !crosshairMagnet
    chart.applyOptions({
      crosshair: { mode: next ? CrosshairMode.Magnet : CrosshairMode.Normal },
    })
    setCrosshairMagnet(next)
  }, [crosshairMagnet])

  const handleFitContent = useCallback(() => {
    chartRef.current?.timeScale().fitContent()
  }, [])

  const handleScreenshot = useCallback(() => {
    const chart = chartRef.current
    if (!chart) return
    const canvas = chart.takeScreenshot()
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${coin}_${interval}_${new Date().toISOString().slice(0, 10)}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
  }, [coin, interval])

  const handleToggleFullscreen = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  // Listen for fullscreen exit via Escape
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  const hasOverlay = !!(currentPrice || (keyLevels && keyLevels.length > 0))

  return (
    <Card ref={cardRef} className={`flex flex-col ${isFullscreen ? 'h-screen' : 'h-full'}`}>
      {/* ── Toolbar ── */}
      <div className='flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0'>
        {/* Left: coin + interval pills */}
        <div className='flex items-center gap-3'>
          <span className='text-sm font-medium'>{coin}</span>
          <div className='flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5'>
            {INTERVALS.map((iv) => (
              <button
                key={iv}
                type='button'
                onClick={() => onIntervalChange?.(iv)}
                className={`px-2 py-0.5 text-xs rounded transition-colors
                  ${iv === interval
                    ? 'bg-background text-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {iv}
              </button>
            ))}
          </div>
        </div>

        {/* Right: tools */}
        <div className='flex items-center gap-0.5'>
          <ToolbarBtn
            tooltip={crosshairMagnet ? '十字线: 磁吸模式' : '十字线: 普通模式'}
            active={crosshairMagnet}
            onClick={handleToggleCrosshair}
          >
            {crosshairMagnet ? <Magnet className='h-3.5 w-3.5' /> : <Crosshair className='h-3.5 w-3.5' />}
          </ToolbarBtn>

          <ToolbarBtn tooltip='自适应' onClick={handleFitContent}>
            <RotateCcw className='h-3.5 w-3.5' />
          </ToolbarBtn>

          <ToolbarBtn tooltip='截图' onClick={handleScreenshot}>
            <Camera className='h-3.5 w-3.5' />
          </ToolbarBtn>

          <ToolbarBtn
            tooltip={isFullscreen ? '退出全屏' : '全屏'}
            active={isFullscreen}
            onClick={handleToggleFullscreen}
          >
            <Maximize2 className='h-3.5 w-3.5' />
          </ToolbarBtn>

          <div className='w-px h-4 bg-border mx-1' />

          {onRefresh && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 px-2 text-xs'
              onClick={onRefresh}
              disabled={refreshing || loading}
            >
              <RotateCcw className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          )}
        </div>
      </div>

      {/* ── Chart ── */}
      <CardContent className={`flex-1 min-h-0 px-3 pb-3 pt-2 flex flex-col gap-2 ${isFullscreen ? '' : ''}`}>
        <div className='relative flex-1 min-h-0' style={isFullscreen ? undefined : { height: CHART_HEIGHT }}>
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
