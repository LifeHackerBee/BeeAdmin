/**
 * CvdPanel — 实时 CVD 趋势图（1m / 5m / 15m）
 * ─────────────────────────────────────────────
 * 风格对标"BTC 5分钟量级变化"：
 *   - 柱图：每桶 CVD 净变化，绿=净主买，红=净主卖
 *   - 异常放量桶高亮（亮绿/亮红）
 *   - 顶部 stats：总 CVD、斜率、放量次数
 *   - 三个周期 Tab 切换
 */
import { useState, useEffect, memo, useMemo } from 'react'
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Zap, TrendingUp, TrendingDown, Minus,
  Wifi, WifiOff, Loader2,
} from 'lucide-react'
import { useCvdStream, type CvdBucket, type CvdBarsData, type CvdInterval } from '../hooks/use-cvd-stream'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtNum(v: number, d = 2): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(d)}M`
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(d)}K`
  return v.toFixed(d)
}

const INTERVALS: { key: CvdInterval; label: string }[] = [
  { key: '1m',  label: '1分钟' },
  { key: '5m',  label: '5分钟' },
  { key: '15m', label: '15分钟' },
]

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CvdTooltip({ active, payload }: { active?: boolean; payload?: { payload: CvdBucket }[] }) {
  if (!active || !payload?.[0]) return null
  const b = payload[0].payload
  return (
    <div className='rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1 min-w-[140px]'>
      <div className='font-medium text-foreground'>{b.timeLabel}</div>
      <div className={b.cvdDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}>
        CVD {b.cvdDelta >= 0 ? '+' : ''}{fmtNum(b.cvdDelta)}
      </div>
      <div className='text-muted-foreground'>成交量 {fmtNum(b.volume)}</div>
      <div className='text-muted-foreground'>
        买 {fmtNum(b.buyVol)} / 卖 {fmtNum(b.sellVol)}
      </div>
      {b.maxVps > 0 && (
        <div className='text-muted-foreground'>峰值 VpS {fmtNum(b.maxVps)}/s</div>
      )}
      <div className='text-muted-foreground'>量比 {b.spikeRatio.toFixed(1)}× 均量</div>
      {b.isSpike && (
        <div className='text-amber-500 font-semibold flex items-center gap-1'>
          <Zap className='h-3 w-3' />
          量能异常 ({b.spikeRatio.toFixed(1)}×)
        </div>
      )}
    </div>
  )
}

// ─── Stat badge ───────────────────────────────────────────────────────────────

const Stat = memo(function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <span className='flex flex-col items-center leading-tight'>
      <span className='text-[9px] text-muted-foreground'>{label}</span>
      <span className={`text-[11px] font-mono font-semibold ${accent ?? 'text-foreground'}`}>{value}</span>
    </span>
  )
})

// ─── Status indicator ─────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  if (status === 'connected')   return <span className='inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
  if (status === 'connecting')  return <Loader2 className='h-3 w-3 animate-spin text-yellow-500' />
  if (status === 'loading')     return <Loader2 className='h-3 w-3 animate-spin text-blue-400' />
  if (status === 'error')       return <WifiOff className='h-3 w-3 text-red-500' />
  return <Wifi className='h-3 w-3 text-muted-foreground/40' />
}

// ─── Chart (memoized) ─────────────────────────────────────────────────────────

const CvdChart = memo(function CvdChart({ barsData, xInterval }: { barsData: CvdBarsData; xInterval: number }) {
  const { bars } = barsData

  // 预计算颜色数组避免 Cell render 内闭包
  const colors = useMemo(() =>
    bars.map((b) => {
      const pos = b.cvdDelta >= 0
      return b.isSpike
        ? pos ? '#10b981' : '#ef4444'
        : pos ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)'
    }),
    [bars],
  )

  return (
    <ResponsiveContainer width='100%' height='100%'>
      <BarChart
        data={bars}
        margin={{ top: 4, right: 8, bottom: 0, left: 40 }}
        barCategoryGap='3%'
      >
        <XAxis
          dataKey='timeLabel'
          tick={{ fontSize: 9, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          interval={xInterval}
        />
        <YAxis
          tick={{ fontSize: 9, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmtNum(v, 1)}
          width={40}
        />
        <ReferenceLine y={0} stroke='rgba(156,163,175,0.5)' strokeWidth={1} />
        <Tooltip content={<CvdTooltip />} />

        <Bar dataKey='cvdDelta' radius={[2, 2, 0, 0]} maxBarSize={14} isAnimationActive={false}>
          {bars.map((_, i) => (
            <Cell key={i} fill={colors[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
})

// ─── Main ─────────────────────────────────────────────────────────────────────

interface CvdPanelProps {
  coin:   string
  active: boolean
}

export function CvdPanel({ coin, active }: CvdPanelProps) {
  const { data, status, error, connect, disconnect, liveCvd, liveVps, monitorEnabled, toggleMonitor } = useCvdStream()
  const [interval, setInterval] = useState<CvdInterval>('1m')
  const [toggling, setToggling] = useState(false)

  const handleToggleMonitor = async (enabled: boolean) => {
    setToggling(true)
    await toggleMonitor(enabled).catch(() => {})
    setToggling(false)
  }

  useEffect(() => {
    if (active) connect(coin)
    else        disconnect()
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (active) connect(coin)
  }, [coin]) // eslint-disable-line react-hooks/exhaustive-deps

  const barsData    = data[interval]
  const { bars, avgVolume, totalCvd, spikeCount, slope } = barsData

  const totalCvdDir = totalCvd > 0 ? 'long' : totalCvd < 0 ? 'short' : 'neutral'
  const slopeDir    = slope > 0.001 ? 'up' : slope < -0.001 ? 'down' : 'flat'

  const xInterval = interval === '1m' ? 9 : interval === '5m' ? 5 : 2

  return (
    <Card className='flex flex-col'>
      <CardHeader className='pb-2 flex-shrink-0'>
        <CardTitle className='text-sm flex items-center justify-between flex-wrap gap-2'>
          {/* 左：标题 + 状态 + 监控开关 */}
          <div className='flex items-center gap-2'>
            <StatusDot status={status} />
            <span>{coin} 实时 CVD 趋势</span>
            {error && <span className='text-[10px] text-red-500'>{error}</span>}
            {monitorEnabled !== null && (
              <div className='flex items-center gap-1.5 ml-1'>
                <Switch
                  checked={monitorEnabled}
                  onCheckedChange={handleToggleMonitor}
                  disabled={toggling}
                  className='scale-75 origin-left'
                />
                <span className={`text-[10px] ${monitorEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {toggling ? '...' : monitorEnabled ? '后台监控中' : '监控已关闭'}
                </span>
              </div>
            )}
          </div>

          {/* 右：Stats + 周期切换 */}
          <div className='flex items-center gap-4'>
            {bars.length > 0 && (
              <div className='flex items-center gap-4 mr-1'>
                <Stat
                  label='累计CVD'
                  value={(totalCvd >= 0 ? '+' : '') + fmtNum(totalCvd)}
                  accent={totalCvdDir === 'long' ? 'text-emerald-500' : totalCvdDir === 'short' ? 'text-red-500' : undefined}
                />
                <Stat
                  label='斜率'
                  value={`${slopeDir === 'up' ? '↗' : slopeDir === 'down' ? '↘' : '→'} ${Math.abs(slope).toFixed(2)}`}
                  accent={slopeDir === 'up' ? 'text-emerald-500' : slopeDir === 'down' ? 'text-red-500' : undefined}
                />
                {spikeCount > 0 && (
                  <Stat label='异常次数' value={`${spikeCount} 次`} accent='text-amber-500' />
                )}
                {status === 'connected' && (
                  <Stat
                    label='当前桶'
                    value={(liveCvd >= 0 ? '+' : '') + fmtNum(liveCvd)}
                    accent={liveCvd > 0 ? 'text-emerald-500' : liveCvd < 0 ? 'text-red-500' : undefined}
                  />
                )}
                {liveVps > 0 && liveVps >= avgVolume / 60 * 2 && (
                  <span className='flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold'>
                    <Zap className='h-3 w-3' />
                    放量
                  </span>
                )}
              </div>
            )}

            {/* 周期 Tab */}
            <div className='flex rounded-md border overflow-hidden text-[11px]'>
              {INTERVALS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setInterval(key)}
                  className={`px-2 py-0.5 transition-colors ${
                    interval === key
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className='p-2 pt-0' style={{ height: 200 }}>
        {status === 'error' ? (
          <div className='flex items-center justify-center h-full text-destructive text-sm'>
            {error ?? 'WebSocket 连接失败'}
          </div>
        ) : status !== 'connected' || bars.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2'>
            {status === 'connecting'
              ? <><Loader2 className='h-4 w-4 animate-spin' />正在连接，等待数据积累中...</>
              : status === 'disconnected'
                ? '未连接'
                : <><Loader2 className='h-4 w-4 animate-spin' />等待数据积累（每满1分钟更新一次）...</>
            }
          </div>
        ) : (
          <CvdChart barsData={barsData} xInterval={xInterval} />
        )}
      </CardContent>

      {/* 图例 + 偏向 Badge */}
      <div className='flex items-center justify-between px-3 pb-2 flex-shrink-0 flex-wrap gap-1'>
        <div className='flex gap-4 text-[9px] text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-2.5 h-2 rounded-sm' style={{ background: 'rgba(16,185,129,0.55)' }} />
            净主买
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-2.5 h-2 rounded-sm' style={{ background: 'rgba(239,68,68,0.55)' }} />
            净主卖
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-2.5 h-2 rounded-sm' style={{ background: '#10b981' }} />
            异常放量（买）
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-2.5 h-2 rounded-sm' style={{ background: '#ef4444' }} />
            异常放量（卖）
          </span>
        </div>

        {bars.length > 0 && (
          <Badge
            variant={totalCvdDir === 'long' ? 'default' : totalCvdDir === 'short' ? 'destructive' : 'secondary'}
            className='text-[10px] px-2 py-0 h-4 gap-0.5'
          >
            {totalCvdDir === 'long'
              ? <><TrendingUp  className='h-2.5 w-2.5' />净主买偏多</>
              : totalCvdDir === 'short'
                ? <><TrendingDown className='h-2.5 w-2.5' />净主卖偏空</>
                : <><Minus       className='h-2.5 w-2.5' />均衡</>}
          </Badge>
        )}
      </div>
    </Card>
  )
}
