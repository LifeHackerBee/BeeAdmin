import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Layers,
  Flame,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
} from 'lucide-react'
import type { OrderRadarData } from '../hooks/use-order-radar'
import { useLiquidationMap } from '../hooks/use-liquidation-map'
import { WallChart } from './wall-chart'
import { LiquidationMapChart } from './liquidation-map-chart'
import { AIAnalysis } from './ai-analysis'

// ============================================
// 辅助函数
// ============================================

function fmtPrice(v: number): string {
  if (v >= 10_000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (v >= 100) return `$${v.toFixed(2)}`
  return `$${v.toFixed(4)}`
}

function fmtLargeNum(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

function fmtPct(v: number | null | undefined, signed = true): string {
  if (v == null) return '-'
  const prefix = signed && v > 0 ? '+' : ''
  return `${prefix}${v.toFixed(2)}%`
}

function HintText({ text }: { text: string }) {
  return <p className='text-[11px] text-muted-foreground/70 mt-1.5 leading-relaxed'>{text}</p>
}

// ============================================
// 主组件
// ============================================

export function SignalResult({ data, autoAnalyze }: { data: OrderRadarData; autoAnalyze?: boolean }) {
  const { entry_trigger, trend_filter, tp_sl_reference } = data
  const cp = data.current_price
  const liqMap = useLiquidationMap()

  return (
    <div className='space-y-3'>
      {/* 价格 & 总览 */}
      <Card>
        <CardHeader className='pb-2'>
          <div className='flex items-center justify-between flex-wrap gap-2'>
            <CardTitle className='text-base flex items-center gap-2'>
              <Activity className='h-4 w-4' />
              {data.coin} 分析报告
            </CardTitle>
            <span className='font-mono text-xl font-bold'>{fmtPrice(cp)}</span>
          </div>
        </CardHeader>
      </Card>

      {/* ── 趋势过滤 ── */}
      <TrendFilterCard trendFilter={trend_filter} />

      {/* AI 交易建议 */}
      <AIAnalysis data={data} autoAnalyze={autoAnalyze} />

      {/* ── 入场触发 ── */}

      {/* S/R 位 — 三档展示 */}
      <SrLevelsCard srLevels={entry_trigger.sr_levels} currentPrice={cp} />

      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
        {/* 订单块 */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Layers className='h-4 w-4' />
              订单块
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            {entry_trigger.order_blocks.bullish.length > 0 && (
              <div>
                <div className='text-xs text-muted-foreground mb-1'>看涨订单块</div>
                {entry_trigger.order_blocks.bullish.map((ob, i) => (
                  <div key={i} className='flex items-center justify-between py-0.5'>
                    <span className='font-mono text-green-500'>
                      {fmtPrice(ob.low)} – {fmtPrice(ob.high)}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      强度 {(ob.strength * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
            {entry_trigger.order_blocks.bearish.length > 0 && (
              <div>
                <div className='text-xs text-muted-foreground mb-1'>看跌订单块</div>
                {entry_trigger.order_blocks.bearish.map((ob, i) => (
                  <div key={i} className='flex items-center justify-between py-0.5'>
                    <span className='font-mono text-red-500'>
                      {fmtPrice(ob.low)} – {fmtPrice(ob.high)}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      强度 {(ob.strength * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
            {entry_trigger.order_blocks.bullish.length === 0 &&
              entry_trigger.order_blocks.bearish.length === 0 && (
                <span className='text-muted-foreground'>暂无明显订单块</span>
              )}
            <HintText text={entry_trigger.order_blocks.hint} />
          </CardContent>
        </Card>

        {/* CVD 背离 */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <BarChart3 className='h-4 w-4' />
              CVD 背离
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>CVD 趋势</span>
              <span>{entry_trigger.cvd.trend}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>CVD 值</span>
              <span className='font-mono'>{entry_trigger.cvd.value.toFixed(1)}</span>
            </div>
            {entry_trigger.cvd.bull_divergence && (
              <div className='flex items-center gap-2 text-green-500'>
                <ArrowUpCircle className='h-4 w-4' />
                <span>底背离（多头信号）</span>
              </div>
            )}
            {entry_trigger.cvd.bear_divergence && (
              <div className='flex items-center gap-2 text-red-500'>
                <ArrowDownCircle className='h-4 w-4' />
                <span>顶背离（空头信号）</span>
              </div>
            )}
            {!entry_trigger.cvd.bull_divergence && !entry_trigger.cvd.bear_divergence && (
              <div className='text-muted-foreground text-xs'>无背离信号</div>
            )}
            <HintText text={entry_trigger.cvd.hint} />
          </CardContent>
        </Card>

        {/* OI & 资金费率 */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <ShieldAlert className='h-4 w-4' />
              OI & 资金费率
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>持仓量 (OI)</span>
              <span className='font-mono'>
                {entry_trigger.oi.open_interest != null
                  ? fmtLargeNum(entry_trigger.oi.open_interest)
                  : '-'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>当前费率</span>
              <span className={`font-mono ${
                (entry_trigger.oi.funding_rate ?? 0) > 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {entry_trigger.oi.funding_rate != null
                  ? `${(entry_trigger.oi.funding_rate * 100).toFixed(4)}%`
                  : '-'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>费率趋势 (8h)</span>
              <FundingTrendBadge trend={entry_trigger.oi.funding_trend} />
            </div>
            <HintText text={entry_trigger.oi.hint} />
          </CardContent>
        </Card>
      </div>

      {/* ── 止盈止损参考 ── */}
      <TpSlCard tpSl={tp_sl_reference} />

      {/* 挂单墙 & 量能墙图表 */}
      <WallChart
        chartData={data.chart_data}
        currentPrice={cp}
        coin={data.coin}
      />

      {/* 清算热力图 */}
      {liqMap.data ? (
        <LiquidationMapChart data={liqMap.data} coin={data.coin} />
      ) : (
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Flame className='h-4 w-4' />
              {data.coin} 清算热力图
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liqMap.loading ? (
              <div className='space-y-2'>
                <div className='text-sm text-muted-foreground'>正在从 CoinGlass 抓取清算数据，约需 10-30 秒...</div>
                <Skeleton className='h-[280px] w-full' />
              </div>
            ) : liqMap.error ? (
              <div className='text-sm text-red-500'>{liqMap.error.message}</div>
            ) : (
              <div className='flex flex-col items-center py-4 gap-2'>
                <span className='text-sm text-muted-foreground'>点击加载清算热力图（数据来源: CoinGlass，约需 10-30 秒）</span>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => liqMap.fetch(data.coin)}
                  className='gap-1'
                >
                  <Flame className='h-4 w-4' />
                  加载清算图
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// S/R 位卡片 — 短期/中期/长期三档
// ============================================

function SrLevelsCard({
  srLevels,
  currentPrice,
}: {
  srLevels: OrderRadarData['entry_trigger']['sr_levels']
  currentPrice: number
}) {
  const tiers = [
    { key: 'short_term' as const, label: '短期 (±5%)', data: srLevels.short_term },
    { key: 'medium_term' as const, label: '中期 (5%~10%)', data: srLevels.medium_term },
    { key: 'long_term' as const, label: '长期 (10%~20%)', data: srLevels.long_term },
  ]

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <Target className='h-4 w-4' />
          S/R 支撑压力位
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3 text-sm'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          {tiers.map(({ key, label, data }) => {
            if (!data) return null
            const supports = data.supports ?? []
            const resistances = data.resistances ?? []
            const hasData = supports.length > 0 || resistances.length > 0
            return (
              <div key={key} className='space-y-1.5'>
                <div className='text-xs font-medium text-muted-foreground border-b pb-1'>{label}</div>
                {!hasData && (
                  <div className='text-xs text-muted-foreground/50 py-1'>暂无数据</div>
                )}
                {supports.map((s, i) => (
                  <div key={`s-${i}`} className='flex items-center justify-between py-0.5'>
                    <div className='flex items-center gap-1'>
                      <span className='text-green-500 text-xs'>▼</span>
                      <span className='text-[10px] text-muted-foreground'>{s.source}</span>
                      <StrengthBadge strength={s.strength} />
                    </div>
                    <div className='text-right'>
                      <span className='font-mono text-xs'>{fmtPrice(s.price)}</span>
                      <span className='text-[10px] text-muted-foreground ml-1'>
                        {fmtPct((s.price - currentPrice) / currentPrice * 100)}
                      </span>
                    </div>
                  </div>
                ))}
                {resistances.map((r, i) => (
                  <div key={`r-${i}`} className='flex items-center justify-between py-0.5'>
                    <div className='flex items-center gap-1'>
                      <span className='text-red-500 text-xs'>▲</span>
                      <span className='text-[10px] text-muted-foreground'>{r.source}</span>
                      <StrengthBadge strength={r.strength} />
                    </div>
                    <div className='text-right'>
                      <span className='font-mono text-xs'>{fmtPrice(r.price)}</span>
                      <span className='text-[10px] text-muted-foreground ml-1'>
                        {fmtPct((r.price - currentPrice) / currentPrice * 100)}
                      </span>
                    </div>
                  </div>
                ))}
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

function TrendFilterCard({
  trendFilter,
}: {
  trendFilter: OrderRadarData['trend_filter']
}) {
  const { vwap, ema } = trendFilter
  const isBullish = ema.slope === 'up' && ema.price_vs_ema === 'above'
  const isBearish = ema.slope === 'down' && ema.price_vs_ema === 'below'
  const borderColor = isBullish
    ? 'border-green-500/40 bg-green-500/5'
    : isBearish
      ? 'border-red-500/40 bg-red-500/5'
      : 'border-yellow-500/40 bg-yellow-500/5'

  const dirLabel = isBullish ? '多头有利，逢低做多' : isBearish ? '空头有利，逢高做空' : '方向不明，谨慎操作'
  const DirIcon = isBullish ? TrendingUp : isBearish ? TrendingDown : AlertTriangle

  return (
    <Card className={`border-2 ${borderColor}`}>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <DirIcon className='h-4 w-4' />
          趋势过滤
          <Badge variant='outline' className='ml-1 text-xs'>
            {dirLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2 text-sm'>
        <div className='grid grid-cols-2 gap-4'>
          {/* VWAP */}
          <div className='space-y-1'>
            <div className='text-xs text-muted-foreground'>VWAP {vwap.intraday ? '(当日)' : '(多日)'}</div>
            <div className='font-mono font-medium'>
              {vwap.value != null ? fmtPrice(vwap.value) : '-'}
            </div>
            {vwap.dist_pct != null && (
              <div className={`text-xs ${vwap.dist_pct > 0 ? 'text-green-500' : 'text-red-500'}`}>
                价格在VWAP{vwap.dist_pct > 0 ? '上方' : '下方'} {fmtPct(vwap.dist_pct)}
              </div>
            )}
          </div>
          {/* EMA */}
          <div className='space-y-1'>
            <div className='text-xs text-muted-foreground'>EMA12 (4H)</div>
            <div className='font-mono font-medium'>{fmtPrice(ema.ema12)}</div>
            <div className='text-xs'>
              <span className={ema.slope === 'up' ? 'text-green-500' : ema.slope === 'down' ? 'text-red-500' : 'text-muted-foreground'}>
                {ema.slope === 'up' ? '↑ 上行' : ema.slope === 'down' ? '↓ 下行' : '→ 横盘'}
              </span>
              <span className='text-muted-foreground ml-2'>
                价格在EMA{ema.price_vs_ema === 'above' ? '上方' : '下方'}
              </span>
            </div>
          </div>
        </div>
        <HintText text={vwap.hint} />
      </CardContent>
    </Card>
  )
}

// ============================================
// 止盈止损参考卡片
// ============================================

function TpSlCard({
  tpSl,
}: {
  tpSl: OrderRadarData['tp_sl_reference']
}) {
  const { bollinger, macd } = tpSl

  const macdColor = macd.cross === 'golden' ? 'text-green-500' : macd.cross === 'death' ? 'text-red-500' : 'text-muted-foreground'
  const macdCrossLabel = macd.cross === 'golden' ? '金叉' : macd.cross === 'death' ? '死叉' : '无交叉'
  const histLabel = macd.histogram_trend === 'expanding' ? '扩张' : '收缩'

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <ShieldAlert className='h-4 w-4' />
          止盈止损参考
          <Badge variant='outline' className='text-xs ml-1'>R:R ≥ 1.5:1</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3 text-sm'>
        {/* 布林带 */}
        <div>
          <div className='text-xs text-muted-foreground mb-1'>布林带</div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>1H 上轨</span>
                <span className='font-mono'>{fmtPrice(bollinger.upper)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>1H 下轨</span>
                <span className='font-mono'>{fmtPrice(bollinger.lower)}</span>
              </div>
            </div>
            <div className='space-y-1'>
              {bollinger.upper_4h != null && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>4H 上轨</span>
                  <span className='font-mono'>{fmtPrice(bollinger.upper_4h)}</span>
                </div>
              )}
              {bollinger.lower_4h != null && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>4H 下轨</span>
                  <span className='font-mono'>{fmtPrice(bollinger.lower_4h)}</span>
                </div>
              )}
            </div>
          </div>
          {bollinger.pct != null && (
            <div className='mt-1.5'>
              <div className='flex justify-between text-xs text-muted-foreground mb-0.5'>
                <span>下轨 0%</span>
                <span>上轨 100%</span>
              </div>
              <div className='h-2 bg-muted rounded-full overflow-hidden'>
                <div
                  className='h-full bg-blue-500 rounded-full transition-all'
                  style={{ width: `${Math.max(0, Math.min(100, bollinger.pct))}%` }}
                />
              </div>
              <div className='text-center text-xs text-muted-foreground mt-0.5'>
                当前: {bollinger.pct}%
              </div>
            </div>
          )}
        </div>

        {/* MACD */}
        <div>
          <div className='text-xs text-muted-foreground mb-1'>MACD (4H)</div>
          <div className='flex items-center gap-4 flex-wrap'>
            <span className={`font-medium ${macdColor}`}>{macdCrossLabel}</span>
            <span className='text-xs text-muted-foreground'>
              MACD: <span className='font-mono'>{macd.macd.toFixed(2)}</span>
            </span>
            <span className='text-xs text-muted-foreground'>
              Signal: <span className='font-mono'>{macd.signal.toFixed(2)}</span>
            </span>
            <span className='text-xs text-muted-foreground'>
              柱状图: <span className={`font-mono ${macd.histogram >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {macd.histogram >= 0 ? '+' : ''}{macd.histogram.toFixed(2)}
              </span> ({histLabel})
            </span>
          </div>
        </div>

        <HintText text={bollinger.hint} />
        <HintText text={macd.hint} />
      </CardContent>
    </Card>
  )
}

// ============================================
// 小组件
// ============================================

function StrengthBadge({ strength }: { strength: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    strong: { label: '强', cls: 'bg-green-500/20 text-green-600 dark:text-green-400' },
    moderate: { label: '中', cls: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
    weak: { label: '弱', cls: 'bg-gray-500/20 text-gray-500' },
  }
  const c = config[strength] ?? config.weak
  return <Badge variant='outline' className={`text-[10px] px-1 py-0 h-4 ${c.cls}`}>{c.label}</Badge>
}

function FundingTrendBadge({ trend }: { trend: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    positive: { label: '正向（多头付费）', cls: 'text-green-500' },
    negative: { label: '负向（空头付费）', cls: 'text-red-500' },
    neutral: { label: '中性', cls: 'text-muted-foreground' },
  }
  const c = config[trend] ?? config.neutral
  return <span className={`text-xs ${c.cls}`}>{c.label}</span>
}
