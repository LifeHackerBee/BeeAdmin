import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVolumeFlow, type VolumeBar } from '../hooks/use-volume-flow'
import { coinLabel } from '../coins'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toFixed(2)
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function VolumeTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: VolumeBar }[]
}) {
  if (!active || !payload?.[0]) return null
  const bar = payload[0].payload
  const pct = ((bar.close - bar.open) / bar.open) * 100

  return (
    <div className='rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1 min-w-[150px]'>
      <div className='font-medium text-foreground'>{bar.timeLabel}</div>
      <div className='text-muted-foreground'>成交量 {fmtVol(bar.volume)}</div>
      <div className={bar.isBullish ? 'text-emerald-500' : 'text-red-500'}>
        {bar.isBullish ? '▲ 多方' : '▼ 空方'}{' '}
        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
      </div>
      <div className='text-muted-foreground'>
        量比 {bar.spikeRatio.toFixed(1)}× 均量
      </div>
      {bar.isSpike && (
        <div className='text-amber-500 font-semibold flex items-center gap-1'>
          <Zap className='h-3 w-3' />
          量能异常 ({bar.spikeRatio.toFixed(1)}× 均量)
        </div>
      )}
    </div>
  )
}

// ─── Stats badge ──────────────────────────────────────────────────────────────

interface StatProps {
  label: string
  value: string
  accent?: string
}
function Stat({ label, value, accent }: StatProps) {
  return (
    <span className='flex flex-col items-center leading-tight'>
      <span className='text-[9px] text-muted-foreground'>{label}</span>
      <span className={`text-[11px] font-mono font-semibold ${accent ?? 'text-foreground'}`}>
        {value}
      </span>
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface VolumeFlowChartProps {
  coin: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VolumeFlowChart({ coin }: VolumeFlowChartProps) {
  const { data, loading, error, refetch } = useVolumeFlow(coin)

  // Volume ratio of latest bar vs average
  const currentRatio = useMemo(() => {
    if (!data || data.avgVolume === 0) return null
    return data.currentVolume / data.avgVolume
  }, [data])

  // Show X-axis label only every 12 bars (≈ 1 hour)
  const xAxisInterval = 11

  return (
    <Card className='flex flex-col'>
      <CardHeader className='pb-2 flex-shrink-0'>
        <CardTitle className='text-sm flex items-center justify-between'>
          <span>{coinLabel(coin)} 5分钟量级变化</span>
          <div className='flex items-center gap-3'>
            {/* Stats */}
            {data && (
              <div className='flex items-center gap-4 mr-1'>
                <Stat label='均量' value={fmtVol(data.avgVolume)} />
                <Stat
                  label='最新'
                  value={fmtVol(data.currentVolume)}
                  accent={
                    currentRatio && currentRatio >= 2
                      ? 'text-amber-500'
                      : 'text-foreground'
                  }
                />
                <Stat
                  label='量比'
                  value={currentRatio ? `${currentRatio.toFixed(1)}×` : '-'}
                  accent={
                    currentRatio && currentRatio >= 2
                      ? 'text-amber-500'
                      : currentRatio && currentRatio >= 1.5
                        ? 'text-yellow-500'
                        : 'text-foreground'
                  }
                />
                {data.spikeCount > 0 && (
                  <Stat
                    label='异常次数'
                    value={`${data.spikeCount} 次`}
                    accent='text-amber-500'
                  />
                )}
                {currentRatio !== null && currentRatio >= 2 && (
                  <span className='flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold'>
                    <Zap className='h-3 w-3' />
                    放量 {currentRatio.toFixed(1)}×
                  </span>
                )}
              </div>
            )}
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

      <CardContent className='p-2 pt-0' style={{ height: 200 }}>
        {error ? (
          <div className='flex items-center justify-center h-full text-destructive text-sm'>
            {error.message}
          </div>
        ) : loading && !data ? (
          <div className='flex items-center justify-center h-full text-muted-foreground text-sm'>
            加载中...
          </div>
        ) : !data || data.bars.length === 0 ? (
          <div className='flex items-center justify-center h-full text-muted-foreground text-sm'>
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={data.bars}
              margin={{ top: 4, right: 8, bottom: 0, left: 36 }}
              barCategoryGap='3%'
            >
              <XAxis
                dataKey='timeLabel'
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                interval={xAxisInterval}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtVol}
                width={36}
              />
              <Tooltip content={<VolumeTooltip />} />

              {/* Average volume reference line */}
              <ReferenceLine
                y={data.avgVolume}
                stroke='rgba(156,163,175,0.45)'
                strokeWidth={1}
                strokeDasharray='4 3'
              />

              <Bar dataKey='volume' radius={[2, 2, 0, 0]} maxBarSize={14}>
                {data.bars.map((bar, i) => (
                  <Cell
                    key={i}
                    fill={
                      bar.isSpike
                        ? bar.isBullish
                          ? '#10b981'        // spike + bullish → vivid green
                          : '#ef4444'        // spike + bearish → vivid red
                        : bar.isBullish
                          ? 'rgba(16,185,129,0.45)'   // normal bullish
                          : 'rgba(239,68,68,0.45)'    // normal bearish
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>

      {/* Legend */}
      <div className='flex gap-4 text-[9px] text-muted-foreground pb-2 px-3 justify-center flex-shrink-0'>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-2.5 h-2 rounded-sm' style={{ background: 'rgba(16,185,129,0.55)' }} />
          多方
        </span>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-2.5 h-2 rounded-sm' style={{ background: 'rgba(239,68,68,0.55)' }} />
          空方
        </span>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-2.5 h-2 rounded-sm' style={{ background: '#10b981' }} />
          异常放量（多）
        </span>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-2.5 h-2 rounded-sm' style={{ background: '#ef4444' }} />
          异常放量（空）
        </span>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-3 border-t border-dashed' style={{ borderColor: 'rgba(156,163,175,0.6)' }} />
          均量线
        </span>
      </div>
    </Card>
  )
}
