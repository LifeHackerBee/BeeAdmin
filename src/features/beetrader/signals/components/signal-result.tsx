import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Layers,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
} from 'lucide-react'
import type { OrderRadarData } from '../hooks/use-order-radar'

// ============================================
// 辅助函数（导出供其他模块使用）
// ============================================

export function fmtPrice(v: number): string {
  if (v >= 10_000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (v >= 100) return `$${v.toFixed(2)}`
  return `$${v.toFixed(4)}`
}

export function fmtLargeNum(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

export function fmtPct(v: number | null | undefined, signed = true): string {
  if (v == null) return '-'
  const prefix = signed && v > 0 ? '+' : ''
  return `${prefix}${v.toFixed(2)}%`
}

function HintText({ text }: { text: string }) {
  return <p className='text-[11px] text-muted-foreground/70 mt-1.5 leading-relaxed'>{text}</p>
}

// ============================================
// S/R 支撑压力区间
// ============================================

export function SrLevelsCard({
  srLevels,
}: {
  srLevels: OrderRadarData['entry_trigger']['sr_levels']
}) {
  const tiers = [
    { key: 'short_term' as const, label: '短期', timeframe: '15m', data: srLevels.short_term },
    { key: 'medium_term' as const, label: '中期', timeframe: '1h', data: srLevels.medium_term },
    { key: 'long_term' as const, label: '长期', timeframe: '4h', data: srLevels.long_term },
  ]

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm flex items-center gap-2'>
            <Target className='h-4 w-4' />
            S/R 支撑压力区间
          </CardTitle>
          <span className='text-[10px] text-muted-foreground'>
            各周期成交量聚类 + 摆动点 + L2挂单墙
          </span>
        </div>
      </CardHeader>
      <CardContent className='text-sm'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          {tiers.map(({ key, label, timeframe, data }) => {
            if (!data) return null
            const supports = data.supports ?? []
            const resistances = data.resistances ?? []
            const hasSupport = supports.length > 0
            const hasResistance = resistances.length > 0

            const sMin = hasSupport ? Math.min(...supports.map((s) => s.price)) : null
            const sMax = hasSupport ? Math.max(...supports.map((s) => s.price)) : null
            const rMin = hasResistance ? Math.min(...resistances.map((r) => r.price)) : null
            const rMax = hasResistance ? Math.max(...resistances.map((r) => r.price)) : null

            return (
              <div key={key} className='rounded-md border p-2.5 space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold'>{label}</span>
                  <span className='text-[10px] text-muted-foreground'>{timeframe} K线</span>
                </div>
                {hasSupport && sMin != null && sMax != null ? (
                  <div className='flex items-center justify-between'>
                    <span className='text-green-500 text-xs'>支撑</span>
                    <span className='font-mono text-xs text-green-600 dark:text-green-400'>
                      {fmtPrice(sMin)}{sMin !== sMax ? ` – ${fmtPrice(sMax)}` : ''}
                    </span>
                  </div>
                ) : (
                  <div className='flex items-center justify-between'>
                    <span className='text-green-500 text-xs'>支撑</span>
                    <span className='text-xs text-muted-foreground/50'>—</span>
                  </div>
                )}
                {hasResistance && rMin != null && rMax != null ? (
                  <div className='flex items-center justify-between'>
                    <span className='text-red-500 text-xs'>压力</span>
                    <span className='font-mono text-xs text-red-600 dark:text-red-400'>
                      {fmtPrice(rMin)}{rMin !== rMax ? ` – ${fmtPrice(rMax)}` : ''}
                    </span>
                  </div>
                ) : (
                  <div className='flex items-center justify-between'>
                    <span className='text-red-500 text-xs'>压力</span>
                    <span className='text-xs text-muted-foreground/50'>—</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <HintText text={srLevels.hint} />
      </CardContent>
    </Card>
  )
}

// ============================================
// 趋势过滤卡片
// ============================================

export function TrendFilterCard({
  trendFilter,
  coin,
  currentPrice,
}: {
  trendFilter: OrderRadarData['trend_filter']
  coin: string
  currentPrice: number
}) {
  const { vwap, ema } = trendFilter
  const isBullish = ema.slope === 'up' && ema.price_vs_ema === 'above'
  const isBearish = ema.slope === 'down' && ema.price_vs_ema === 'below'
  const borderColor = isBullish
    ? 'border-green-500/40 bg-green-500/5'
    : isBearish
      ? 'border-red-500/40 bg-red-500/5'
      : 'border-yellow-500/40 bg-yellow-500/5'

  const dirLabel = isBullish ? '逢低做多' : isBearish ? '逢高做空' : '谨慎操作'
  const DirIcon = isBullish ? TrendingUp : isBearish ? TrendingDown : AlertTriangle

  return (
    <Card className={`border-2 ${borderColor}`}>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between flex-wrap gap-2'>
          <CardTitle className='text-sm flex items-center gap-2'>
            <DirIcon className='h-4 w-4' />
            {coin} 趋势过滤
            <Badge variant='outline' className='ml-1 text-xs'>{dirLabel}</Badge>
          </CardTitle>
          <span className='font-mono text-lg font-bold'>{fmtPrice(currentPrice)}</span>
        </div>
      </CardHeader>
      <CardContent className='text-sm'>
        <div className='flex items-center gap-6 flex-wrap'>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-muted-foreground'>VWAP</span>
            <span className='font-mono text-xs'>{vwap.value != null ? fmtPrice(vwap.value) : '-'}</span>
            {vwap.dist_pct != null && (
              <span className={`text-xs ${vwap.dist_pct > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {fmtPct(vwap.dist_pct)}
              </span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-muted-foreground'>EMA12</span>
            <span className='font-mono text-xs'>{fmtPrice(ema.ema12)}</span>
            <span className={`text-xs ${ema.slope === 'up' ? 'text-green-500' : ema.slope === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
              {ema.slope === 'up' ? '↑' : ema.slope === 'down' ? '↓' : '→'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 订单块卡片
// ============================================

export function OrderBlocksCard({
  orderBlocks,
}: {
  orderBlocks: OrderRadarData['entry_trigger']['order_blocks']
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <Layers className='h-4 w-4' />
          订单块
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-1 text-sm'>
        {orderBlocks.bullish.map((ob, i) => (
          <div key={`b-${i}`} className='flex items-center justify-between'>
            <span className='font-mono text-xs text-green-500'>
              {fmtPrice(ob.low)} – {fmtPrice(ob.high)}
            </span>
            <span className='text-[10px] text-muted-foreground'>
              {(ob.strength * 100).toFixed(0)}%
            </span>
          </div>
        ))}
        {orderBlocks.bearish.map((ob, i) => (
          <div key={`s-${i}`} className='flex items-center justify-between'>
            <span className='font-mono text-xs text-red-500'>
              {fmtPrice(ob.low)} – {fmtPrice(ob.high)}
            </span>
            <span className='text-[10px] text-muted-foreground'>
              {(ob.strength * 100).toFixed(0)}%
            </span>
          </div>
        ))}
        {orderBlocks.bullish.length === 0 &&
          orderBlocks.bearish.length === 0 && (
            <span className='text-xs text-muted-foreground'>暂无</span>
          )}
      </CardContent>
    </Card>
  )
}

// ============================================
// CVD 背离卡片
// ============================================

export function CvdCard({
  cvd,
}: {
  cvd: OrderRadarData['entry_trigger']['cvd']
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <BarChart3 className='h-4 w-4' />
          CVD 背离
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-1 text-sm'>
        <div className='flex items-center justify-between'>
          <span className='text-xs text-muted-foreground'>趋势</span>
          <span className='text-xs'>{cvd.trend}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-xs text-muted-foreground'>CVD</span>
          <span className='font-mono text-xs'>{cvd.value.toFixed(1)}</span>
        </div>
        {cvd.bull_divergence && (
          <div className='flex items-center gap-1 text-green-500 text-xs'>
            <ArrowUpCircle className='h-3 w-3' />
            底背离
          </div>
        )}
        {cvd.bear_divergence && (
          <div className='flex items-center gap-1 text-red-500 text-xs'>
            <ArrowDownCircle className='h-3 w-3' />
            顶背离
          </div>
        )}
        {!cvd.bull_divergence && !cvd.bear_divergence && (
          <div className='text-xs text-muted-foreground'>无背离</div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// OI & 费率卡片
// ============================================

export function OiFundingCard({
  oi,
}: {
  oi: OrderRadarData['entry_trigger']['oi']
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <ShieldAlert className='h-4 w-4' />
          OI & 费率
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-1 text-sm'>
        <div className='flex items-center justify-between'>
          <span className='text-xs text-muted-foreground'>OI</span>
          <span className='font-mono text-xs'>
            {oi.open_interest != null ? fmtLargeNum(oi.open_interest) : '-'}
          </span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-xs text-muted-foreground'>费率</span>
          <span className={`font-mono text-xs ${
            (oi.funding_rate ?? 0) > 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {oi.funding_rate != null
              ? `${(oi.funding_rate * 100).toFixed(4)}%`
              : '-'}
          </span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-xs text-muted-foreground'>趋势</span>
          <FundingTrendBadge trend={oi.funding_trend} />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 止盈止损参考卡片
// ============================================

export function TpSlCard({
  tpSl,
}: {
  tpSl: OrderRadarData['tp_sl_reference']
}) {
  const { bollinger, macd } = tpSl

  const macdColor = macd.cross === 'golden' ? 'text-green-500' : macd.cross === 'death' ? 'text-red-500' : 'text-muted-foreground'
  const macdCrossLabel = macd.cross === 'golden' ? '金叉' : macd.cross === 'death' ? '死叉' : '无交叉'

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <ShieldAlert className='h-4 w-4' />
          止盈止损参考
        </CardTitle>
      </CardHeader>
      <CardContent className='text-sm'>
        <div className='flex items-center gap-6 flex-wrap text-xs'>
          <span className='text-muted-foreground'>1H 布林</span>
          <span className='font-mono'>{fmtPrice(bollinger.lower)} – {fmtPrice(bollinger.upper)}</span>
          {bollinger.upper_4h != null && bollinger.lower_4h != null && (
            <>
              <span className='text-muted-foreground'>4H 布林</span>
              <span className='font-mono'>{fmtPrice(bollinger.lower_4h)} – {fmtPrice(bollinger.upper_4h)}</span>
            </>
          )}
          {bollinger.pct != null && (
            <span className='text-muted-foreground'>位置 <span className='font-mono'>{bollinger.pct}%</span></span>
          )}
          <span className='text-muted-foreground'>MACD 4H</span>
          <span className={macdColor}>{macdCrossLabel}</span>
          <span className={`font-mono ${macd.histogram >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {macd.histogram >= 0 ? '+' : ''}{macd.histogram.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 小组件
// ============================================

function FundingTrendBadge({ trend }: { trend: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    positive: { label: '正向（多头付费）', cls: 'text-green-500' },
    negative: { label: '负向（空头付费）', cls: 'text-red-500' },
    neutral: { label: '中性', cls: 'text-muted-foreground' },
  }
  const c = config[trend] ?? config.neutral
  return <span className={`text-xs ${c.cls}`}>{c.label}</span>
}
