/**
 * CvdPanel — 实时 CVD + 放量 + 盘口 Imbalance 面板
 * ─────────────────────────────────────────────────
 * 数据来源: /ws/cvd/{coin}  (后端实时 WebSocket 推送)
 *
 * 布局:
 *   ┌─ 头部: 状态指示灯 + CVD 当前值 + 方向 Badge ─────────────────┐
 *   │  AreaChart: CVD 曲线 (rolling 300 点)                        │
 *   │  BarChart : VpS 棒图 + 放量比标注                            │
 *   │  Imbalance: 买/卖盘口深度比 进度条                           │
 *   │  BBO      : 最优买一/卖一 + Spread                           │
 *   └──────────────────────────────────────────────────────────────┘
 */
import { useEffect } from 'react'
import {
  AreaChart, Area,
  BarChart, Bar, Cell,
  XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Zap, TrendingUp, TrendingDown, Minus, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useCvdStream, type CvdPoint } from '../hooks/use-cvd-stream'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtNum(v: number, d = 2): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(d)}M`
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(d)}K`
  return v.toFixed(d)
}

function fmtTs(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function CvdTooltip({ active, payload }: { active?: boolean; payload?: { payload: CvdPoint }[] }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className='rounded-md border bg-background/95 p-2 shadow-md text-[10px] space-y-0.5 min-w-[110px]'>
      <div className='text-muted-foreground'>{fmtTs(d.ts)}</div>
      <div className={d.cvd >= 0 ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}>
        CVD {d.cvd >= 0 ? '+' : ''}{fmtNum(d.cvd)}
      </div>
      <div className='text-muted-foreground'>VpS {fmtNum(d.vps)}/s</div>
    </div>
  )
}

function VpsTooltip({ active, payload }: { active?: boolean; payload?: { payload: CvdPoint }[] }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className='rounded-md border bg-background/95 p-2 shadow-md text-[10px]'>
      <div className='text-muted-foreground'>{fmtTs(d.ts)}</div>
      <div className='font-medium'>{fmtNum(d.vps)}/s</div>
    </div>
  )
}

// ─── Status dot ──────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  if (status === 'connected')   return <span className='inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
  if (status === 'connecting')  return <Loader2 className='h-3 w-3 animate-spin text-yellow-500' />
  if (status === 'error')       return <WifiOff className='h-3 w-3 text-red-500' />
  return <Wifi className='h-3 w-3 text-muted-foreground/40' />
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CvdPanelProps {
  coin: string
  active: boolean  // 只有策略总览可见时才连接
}

export function CvdPanel({ coin, active }: CvdPanelProps) {
  const { snapshot, status, connect, disconnect } = useCvdStream()

  // 根据 active + coin 控制连接生命周期
  useEffect(() => {
    if (active) {
      connect(coin)
    } else {
      disconnect()
    }
  }, [active, coin]) // eslint-disable-line react-hooks/exhaustive-deps

  // coin 变化时重连
  useEffect(() => {
    if (active) connect(coin)
  }, [coin]) // eslint-disable-line react-hooks/exhaustive-deps

  const history    = snapshot?.history ?? []
  const cvd        = snapshot?.cvd ?? 0
  const vps        = snapshot?.vps ?? 0
  const vpsRatio   = snapshot?.vps_ratio ?? 1
  const imbalance  = snapshot?.imbalance ?? 0.5
  const spread     = snapshot?.spread
  const bestBid    = snapshot?.best_bid
  const bestAsk    = snapshot?.best_ask
  const isSpike    = vpsRatio >= 2.0
  const cvdDir     = cvd > 0 ? 'long' : cvd < 0 ? 'short' : 'neutral'

  // CVD 斜率（最后 20 点）
  const slopePoints = history.slice(-20)
  const slope = slopePoints.length >= 2
    ? (slopePoints[slopePoints.length - 1].cvd - slopePoints[0].cvd) / slopePoints.length
    : 0

  // VpS 均值（用于参考线）
  const vpsAvg = history.length > 0
    ? history.slice(-60).reduce((s, p) => s + p.vps, 0) / Math.min(history.length, 60)
    : 0

  return (
    <div className='space-y-2'>
      {/* ── 头部：状态 + CVD 当前值 ── */}
      <div className='flex items-center justify-between flex-wrap gap-2'>
        <div className='flex items-center gap-2'>
          <StatusDot status={status} />
          <span className='text-xs text-muted-foreground'>实时 CVD</span>
          {status === 'connected' && snapshot && (
            <span className='text-[10px] text-muted-foreground/60 tabular-nums'>
              {fmtTs(snapshot.ts)}
            </span>
          )}
        </div>

        <div className='flex items-center gap-2'>
          {/* CVD 值 */}
          <span className={`text-sm font-mono font-semibold tabular-nums ${
            cvdDir === 'long' ? 'text-emerald-500' : cvdDir === 'short' ? 'text-red-500' : 'text-muted-foreground'
          }`}>
            {cvd >= 0 ? '+' : ''}{fmtNum(cvd)}
          </span>

          {/* 方向 Badge */}
          {status === 'connected' && (
            <Badge
              variant={cvdDir === 'long' ? 'default' : cvdDir === 'short' ? 'destructive' : 'secondary'}
              className='text-[10px] px-1.5 py-0 h-4 gap-0.5'
            >
              {cvdDir === 'long'    ? <><TrendingUp  className='h-2.5 w-2.5' />净主买</> :
               cvdDir === 'short'   ? <><TrendingDown className='h-2.5 w-2.5' />净主卖</> :
                                       <><Minus       className='h-2.5 w-2.5' />均衡</>}
            </Badge>
          )}

          {/* 斜率 */}
          {status === 'connected' && Math.abs(slope) > 0.001 && (
            <span className={`text-[10px] ${slope > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              斜率 {slope > 0 ? '↗' : '↘'} {Math.abs(slope).toFixed(3)}/帧
            </span>
          )}

          {/* 放量 spike */}
          {isSpike && (
            <span className='flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold'>
              <Zap className='h-3 w-3' />
              放量 {vpsRatio.toFixed(1)}×
            </span>
          )}
        </div>
      </div>

      {/* ── CVD 曲线 ── */}
      {history.length > 1 ? (
        <div style={{ height: 90 }}>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 36 }}>
              <defs>
                <linearGradient id='cvdGradPos' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%'  stopColor='#10b981' stopOpacity={0.35} />
                  <stop offset='95%' stopColor='#10b981' stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id='cvdGradNeg' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%'  stopColor='#ef4444' stopOpacity={0.35} />
                  <stop offset='95%' stopColor='#ef4444' stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey='ts' hide />
              <YAxis
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                axisLine={false} tickLine={false}
                width={36} tickFormatter={(v) => fmtNum(v, 1)}
              />
              <ReferenceLine y={0} stroke='rgba(156,163,175,0.4)' strokeWidth={1} />
              <Tooltip content={<CvdTooltip />} />
              <Area
                type='monotone' dataKey='cvd' dot={false} isAnimationActive={false}
                stroke={cvd >= 0 ? '#10b981' : '#ef4444'}
                strokeWidth={1.5}
                fill={cvd >= 0 ? 'url(#cvdGradPos)' : 'url(#cvdGradNeg)'}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className='flex items-center justify-center h-[90px] text-xs text-muted-foreground/50'>
          {status === 'connecting' ? '正在连接...' : status === 'disconnected' ? '等待连接' : '等待数据...'}
        </div>
      )}

      {/* ── VpS 棒图 ── */}
      {history.length > 1 && (
        <div style={{ height: 56 }}>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={history.slice(-60)} margin={{ top: 2, right: 4, bottom: 0, left: 36 }} barCategoryGap='2%'>
              <XAxis dataKey='ts' hide />
              <YAxis
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                axisLine={false} tickLine={false}
                width={36} tickFormatter={(v) => fmtNum(v, 1)}
              />
              {vpsAvg > 0 && (
                <ReferenceLine y={vpsAvg} stroke='rgba(156,163,175,0.4)' strokeWidth={1} strokeDasharray='4 3' />
              )}
              <Tooltip content={<VpsTooltip />} />
              <Bar dataKey='vps' radius={[1, 1, 0, 0]} maxBarSize={8} isAnimationActive={false}>
                {history.slice(-60).map((p, i) => {
                  const spike = vpsAvg > 0 && p.vps >= vpsAvg * 2
                  return <Cell key={i} fill={spike ? '#f59e0b' : 'rgba(156,163,175,0.5)'} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 盘口信息行 ── */}
      {status === 'connected' && snapshot && (
        <div className='flex items-center gap-4 text-[11px] flex-wrap'>
          {/* Imbalance 进度条 */}
          <div className='flex items-center gap-1.5 flex-1 min-w-[140px]'>
            <span className='text-muted-foreground shrink-0'>盘口</span>
            <div className='flex-1 h-2 rounded-full overflow-hidden bg-muted'>
              <div
                className='h-full bg-emerald-500 transition-all duration-300'
                style={{ width: `${imbalance * 100}%` }}
              />
            </div>
            <span className={`tabular-nums shrink-0 font-medium ${
              imbalance > 0.55 ? 'text-emerald-500' : imbalance < 0.45 ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {imbalance > 0.55 ? '买压' : imbalance < 0.45 ? '卖压' : '均衡'} {(imbalance * 100).toFixed(0)}%
            </span>
          </div>

          {/* BBO */}
          {bestBid && bestAsk && (
            <div className='flex items-center gap-2 text-[11px]'>
              <span className='text-emerald-600 font-mono'>{bestBid.toFixed(1)}</span>
              <span className='text-muted-foreground/50'>/</span>
              <span className='text-red-500 font-mono'>{bestAsk.toFixed(1)}</span>
              {spread != null && (
                <span className='text-muted-foreground'>差价 ${String(spread.toFixed(1))}</span>
              )}
            </div>
          )}

          {/* VpS 当前值 */}
          <div className='flex items-center gap-1 text-[11px]'>
            <span className='text-muted-foreground'>VpS</span>
            <span className={`font-mono font-medium ${isSpike ? 'text-amber-500' : 'text-foreground'}`}>
              {fmtNum(vps)}/s
            </span>
            {isSpike && <Zap className='h-3 w-3 text-amber-500' />}
          </div>

          {/* 成交笔数 */}
          <span className='text-muted-foreground text-[10px]'>
            {snapshot.trade_cnt.toLocaleString()} 笔
          </span>
        </div>
      )}

      {/* ── 图例 ── */}
      <div className='flex gap-4 text-[9px] text-muted-foreground justify-end flex-wrap'>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-6 h-[2px] bg-emerald-500' />CVD 净主买
        </span>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-6 h-[2px] bg-red-500' />CVD 净主卖
        </span>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-2 h-2 rounded-sm bg-amber-400' />放量 ≥2×
        </span>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-3 border-t border-dashed' style={{ borderColor: 'rgba(156,163,175,0.6)' }} />均量
        </span>
      </div>
    </div>
  )
}
