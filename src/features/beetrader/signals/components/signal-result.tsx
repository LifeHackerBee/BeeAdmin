import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  Activity,
  BarChart3,
  Layers,
  AlertTriangle,
  Target,
  ShieldAlert,
  ArrowUpCircle,
  ArrowDownCircle,
  Minus,
  Clock,
  Flame,
} from 'lucide-react'
import type { OrderRadarData, ChartData } from '../hooks/use-order-radar'
import { useLiquidationMap } from '../hooks/use-liquidation-map'
import { WallChart } from './wall-chart'
import { LiquidationMapChart } from './liquidation-map-chart'
import { AIAnalysis } from './ai-analysis'

// ============================================
// 向后兼容：旧 API 没有 chart_data.bollinger / vegas 时，从顶层字段构造
// ============================================

function patchChartData(data: OrderRadarData): ChartData {
  const cd = data.chart_data

  // 如果后端已返回新格式，直接使用
  if (cd.bollinger && cd.vegas) return cd

  return {
    ...cd,
    volume_profile: {
      '1h': cd.volume_profile?.['1h'] ?? [],
      '4h': cd.volume_profile?.['4h'] ?? [],
      '1d': cd.volume_profile?.['1d'] ?? [],
    },
    bollinger: cd.bollinger ?? {
      '1h': data.l2_bollinger,           // 1H 布林（始终存在）
      '4h': null,
      '1d': null,
    },
    vegas: cd.vegas ?? {
      '1h': null,
      '4h': data.l1_trend.vegas,         // 4H Vegas（始终存在）
      '1d': null,
    },
  }
}

// ============================================
// 子组件
// ============================================

function ResonanceDots({ layers, icon }: { layers: { l1: boolean; l2: boolean; l3: boolean; l4: boolean; count: number }; icon: 'long' | 'short' }) {
  const labels = ['EMA', '共振', 'RSI', 'CVD']
  const keys = ['l1', 'l2', 'l3', 'l4'] as const
  const activeColor = icon === 'long' ? 'bg-green-500' : 'bg-red-500'
  return (
    <div className='flex items-center gap-2'>
      {keys.map((k, i) => (
        <div key={k} className='flex items-center gap-1'>
          <div className={`w-2.5 h-2.5 rounded-full ${layers[k] ? activeColor : 'bg-muted-foreground/30'}`} />
          <span className='text-xs text-muted-foreground'>{labels[i]}</span>
        </div>
      ))}
      <Badge variant='outline' className='ml-1 text-xs'>
        {layers.count}/4
      </Badge>
    </div>
  )
}

function PriceField({ label, value, basis }: { label: string; value: number | null; basis?: string }) {
  if (value == null) return null
  return (
    <div className='flex items-center justify-between text-sm'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='font-mono font-medium'>
        {value.toFixed(2)}
        {basis && <span className='text-xs text-muted-foreground ml-1'>({basis})</span>}
      </span>
    </div>
  )
}

// ============================================
// 主组件
// ============================================

export function SignalResult({ data, autoAnalyze }: { data: OrderRadarData; autoAnalyze?: boolean }) {
  const { strategy, l1_trend, l2_bollinger, l3_rsi, l4_cvd, volume, vwap, consolidation, walls, key_levels } = data
  const cp = data.current_price
  const liqMap = useLiquidationMap()

  const vegasPositionLabel: Record<string, string> = { above: '通道上方', below: '通道下方', inside: '通道内部' }
  const vegasTrendLabel: Record<string, string> = { expanding: '扩张', contracting: '收缩', stable: '平稳', insufficient_data: '数据不足' }

  return (
    <div className='space-y-4'>
      {/* 价格 & 总览 */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between flex-wrap gap-2'>
            <CardTitle className='text-xl flex items-center gap-2'>
              <Activity className='h-5 w-5' />
              {data.coin} 分析报告
            </CardTitle>
            <div className='flex items-center gap-2'>
              <span className='font-mono text-2xl font-bold'>${cp.toFixed(2)}</span>
              {data.boll_pct != null && (
                <Badge variant='outline' className='text-xs'>
                  布林 {data.boll_pct}%
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 策略建议 */}
      <StrategyCard strategy={strategy} volume={volume} consolidation={consolidation} vegas={l1_trend.vegas} />

      {/* AI 交易建议 */}
      <AIAnalysis data={data} autoAnalyze={autoAnalyze} />

      {/* 四层共振 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* L1: 趋势 */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <TrendingUp className='h-4 w-4' />
              L1: 4H EMA + Vegas
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>趋势方向</span>
              <Badge className={l1_trend.is_bullish ? 'bg-green-500' : 'bg-red-500'}>
                {l1_trend.is_bullish ? '多头' : '空头'}
              </Badge>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>EMA12</span>
              <span className='font-mono'>{l1_trend.ema12.toFixed(2)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>EMA144</span>
              <span className='font-mono'>{l1_trend.ema144.toFixed(2)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Vegas 通道</span>
              <span className='font-mono text-xs'>
                {l1_trend.vegas.lower.toFixed(2)} ~ {l1_trend.vegas.upper.toFixed(2)}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>通道宽度</span>
              <span>{l1_trend.vegas.width_pct}%</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>价格位置</span>
              <span>{vegasPositionLabel[l1_trend.vegas.position] ?? l1_trend.vegas.position}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>通道趋势</span>
              <span>{vegasTrendLabel[l1_trend.vegas.trend] ?? l1_trend.vegas.trend}</span>
            </div>
          </CardContent>
        </Card>

        {/* L2: 布林 */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <BarChart3 className='h-4 w-4' />
              L2: 1H 布林带
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>上轨</span>
              <span className='font-mono'>{l2_bollinger.upper.toFixed(2)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>下轨</span>
              <span className='font-mono'>{l2_bollinger.lower.toFixed(2)}</span>
            </div>
            {data.boll_pct != null && (
              <div className='mt-2'>
                <div className='flex justify-between text-xs text-muted-foreground mb-1'>
                  <span>下轨 0%</span>
                  <span>上轨 100%</span>
                </div>
                <div className='h-2 bg-muted rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-blue-500 rounded-full transition-all'
                    style={{ width: `${Math.max(0, Math.min(100, data.boll_pct))}%` }}
                  />
                </div>
                <div className='text-center text-xs text-muted-foreground mt-1'>
                  当前: {data.boll_pct}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* L3: RSI */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Activity className='h-4 w-4' />
              L3: 15m RSI
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            {l3_rsi.rsi != null ? (
              <>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>RSI(14)</span>
                  <span className='font-mono font-medium'>{l3_rsi.rsi.toFixed(1)}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>状态</span>
                  <Badge className={l3_rsi.oversold ? 'bg-green-500' : l3_rsi.overbought ? 'bg-red-500' : 'bg-gray-500'}>
                    {l3_rsi.oversold ? '超卖' : l3_rsi.overbought ? '超买' : '中性'}
                  </Badge>
                </div>
                {l3_rsi.bull_divergence && (
                  <div className='flex items-center gap-2 text-green-500'>
                    <ArrowUpCircle className='h-4 w-4' />
                    <span>底背离（做多信号）</span>
                  </div>
                )}
                {l3_rsi.bear_divergence && (
                  <div className='flex items-center gap-2 text-red-500'>
                    <ArrowDownCircle className='h-4 w-4' />
                    <span>顶背离（做空信号）</span>
                  </div>
                )}
              </>
            ) : (
              <span className='text-muted-foreground'>RSI 数据不足</span>
            )}
          </CardContent>
        </Card>

        {/* L4: CVD */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Layers className='h-4 w-4' />
              L4: CVD 盘口
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>CVD 趋势</span>
              <span>{l4_cvd.cvd_trend}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>买盘确认</span>
              <Badge variant='outline' className={l4_cvd.cvd_confirmed ? 'border-green-500 text-green-500' : ''}>
                {l4_cvd.cvd_confirmed ? '是' : '否'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 成交量 & VWAP */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <BarChart3 className='h-4 w-4' />
              成交量
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>最新量</span>
              <span className='font-mono'>{volume.recent.toFixed(1)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>20 期均量</span>
              <span className='font-mono'>{volume.ma20.toFixed(1)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>量比</span>
              <span className={volume.low_volume ? 'text-yellow-500 font-medium' : ''}>
                {(volume.ratio * 100).toFixed(0)}%
                {volume.low_volume && ' (薄盘)'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Target className='h-4 w-4' />
              VWAP
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            {vwap.value != null ? (
              <>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>{vwap.intraday ? '当日 VWAP' : 'VWAP (多日)'}</span>
                  <span className='font-mono'>{vwap.value.toFixed(2)}</span>
                </div>
                {vwap.dist_pct != null && (
                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground'>距价格</span>
                    <span className={`font-mono ${vwap.dist_pct > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {vwap.dist_pct > 0 ? '+' : ''}{vwap.dist_pct.toFixed(2)}%
                    </span>
                  </div>
                )}
              </>
            ) : (
              <span className='text-muted-foreground'>VWAP 数据不可用</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 挂单墙 & 量能墙图表 */}
      <WallChart
        chartData={patchChartData(data)}
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
              <div className='space-y-3'>
                <div className='text-sm text-muted-foreground'>正在从 CoinGlass 抓取清算数据，约需 10-30 秒...</div>
                <Skeleton className='h-[280px] w-full' />
              </div>
            ) : liqMap.error ? (
              <div className='text-sm text-red-500'>{liqMap.error.message}</div>
            ) : (
              <div className='flex flex-col items-center py-6 gap-3'>
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

      {/* 墙位明细 */}
      {walls.length > 0 && (
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <ShieldAlert className='h-4 w-4' />
              墙位明细
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-1.5'>
              {walls.map((w, i) => (
                <div key={i} className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>{w.label}</span>
                  <span className='font-mono'>
                    {w.price.toFixed(2)}{' '}
                    <span className='text-xs text-muted-foreground'>
                      ({w.dist_pct > 0 ? '+' : ''}{w.dist_pct.toFixed(2)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 盘整检测 */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm flex items-center gap-2'>
            <AlertTriangle className='h-4 w-4' />
            盘整检测
            <Badge variant='outline' className='ml-1'>
              {consolidation.signal_count}/4
            </Badge>
            {consolidation.is_consolidation && (
              <Badge className='bg-yellow-500 ml-1'>盘整确认</Badge>
            )}
            {!consolidation.is_consolidation && consolidation.signal_count >= 3 && (
              <Badge className='bg-yellow-500/70 ml-1'>盘整预警</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-1.5'>
            {(
              [
                ['ema_twist', 'EMA 拧麻花'],
                ['bb_squeeze', '布林收缩'],
                ['rsi_deadzone', 'RSI 死区'],
                ['wall_sandwich', '墙夹 + 缩量'],
              ] as const
            ).map(([key, label]) => {
              const sig = consolidation.signals[key]
              return (
                <div key={key} className='flex items-start gap-2 text-sm'>
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${sig.active ? 'bg-yellow-500' : 'bg-muted-foreground/30'}`} />
                  <span className='text-muted-foreground min-w-[80px]'>{label}</span>
                  <span className='text-xs'>{sig.reason}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 关键位置 */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm flex items-center gap-2'>
            <Layers className='h-4 w-4' />
            关键位置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <KeyLevelsTable levels={key_levels} currentPrice={cp} />
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// 策略卡片
// ============================================

function StrategyCard({
  strategy,
  volume,
  consolidation,
  vegas,
}: {
  strategy: OrderRadarData['strategy']
  volume: OrderRadarData['volume']
  consolidation: OrderRadarData['consolidation']
  vegas: OrderRadarData['l1_trend']['vegas']
}) {
  const rec = strategy.recommendation

  const recConfig = {
    long: { label: '做多', icon: ArrowUpCircle, color: 'border-green-500 bg-green-500/5' },
    short: { label: '做空', icon: ArrowDownCircle, color: 'border-red-500 bg-red-500/5' },
    neutral: { label: '多空胶着', icon: Minus, color: 'border-yellow-500 bg-yellow-500/5' },
    wait: { label: '观望', icon: Clock, color: 'border-muted-foreground/50 bg-muted/30' },
  }

  const cfg = recConfig[rec]
  const Icon = cfg.icon

  return (
    <Card className={`border-2 ${cfg.color}`}>
      <CardHeader className='pb-3'>
        <CardTitle className='text-lg flex items-center gap-2'>
          <Icon className='h-5 w-5' />
          策略建议: {cfg.label}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* 共振亮灯 */}
        <div className='space-y-2'>
          <div className='flex items-center gap-3'>
            <span className='text-sm text-muted-foreground min-w-[40px]'>做多</span>
            <ResonanceDots layers={strategy.long} icon='long' />
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-sm text-muted-foreground min-w-[40px]'>做空</span>
            <ResonanceDots layers={strategy.short} icon='short' />
          </div>
        </div>

        {/* 警告信息 */}
        {volume.low_volume && (
          <Alert>
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription>薄盘环境，信号可靠性降低</AlertDescription>
          </Alert>
        )}
        {consolidation.signal_count >= 3 && (
          <Alert>
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription>
              盘整{consolidation.is_consolidation ? '确认' : '预警'} ({consolidation.signal_count}/4)
              {consolidation.is_consolidation && '，共振阈值提升至 4/4'}
            </AlertDescription>
          </Alert>
        )}

        {/* 做多/做空建议 */}
        {strategy.long_advice && (
          <AdviceBlock direction='long' advice={strategy.long_advice} layers={strategy.long} vegas={vegas} />
        )}
        {strategy.short_advice && (
          <AdviceBlock direction='short' advice={strategy.short_advice} layers={strategy.short} vegas={vegas} />
        )}

        {rec === 'wait' && (
          <div className='text-sm text-muted-foreground'>信号不充分，建议观望</div>
        )}
      </CardContent>
    </Card>
  )
}

function AdviceBlock({
  direction,
  advice,
  layers,
  vegas,
}: {
  direction: 'long' | 'short'
  advice: NonNullable<OrderRadarData['strategy']['long_advice']>
  layers: OrderRadarData['strategy']['long']
  vegas: OrderRadarData['l1_trend']['vegas']
}) {
  const isLong = direction === 'long'
  const strength = layers.count === 4 ? '强烈' : '较强'
  const label = isLong ? '做多' : '做空'

  const vegasConfirmed = isLong
    ? vegas.signal_bullish || vegas.position === 'above'
    : vegas.signal_bearish || vegas.position === 'below'

  const missing: string[] = []
  const names: Record<string, string> = { l1: 'EMA', l2: '共振', l3: 'RSI', l4: 'CVD' }
  for (const [k, n] of Object.entries(names)) {
    if (!layers[k as keyof typeof layers]) missing.push(n)
  }

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${isLong ? 'border-green-500/30' : 'border-red-500/30'}`}>
      <div className='flex items-center gap-2'>
        <span className='font-medium'>{strength}{label}信号 ({layers.count}/4)</span>
        {missing.length > 0 && (
          <span className='text-xs text-muted-foreground'>等待: {missing.join('/')}</span>
        )}
      </div>
      {vegasConfirmed && (
        <div className='text-xs text-green-500'>Vegas 验证趋势，可信度高</div>
      )}
      {vegas.position === 'inside' && (
        <div className='text-xs text-yellow-500'>价格在 Vegas 通道内部</div>
      )}
      <div className='space-y-1'>
        <PriceField label='入场' value={advice.entry} basis={advice.entry_basis} />
        <PriceField label='止损' value={advice.stop} />
        <PriceField label='止盈' value={advice.take_profit} basis={advice.tp_basis} />
        {!advice.take_profit && (
          <div className='text-xs text-muted-foreground'>{advice.tp_basis}，按盈亏比自行设定</div>
        )}
      </div>
    </div>
  )
}

// ============================================
// 关键位置表
// ============================================

function KeyLevelsTable({ levels, currentPrice }: { levels: OrderRadarData['key_levels']; currentPrice: number }) {
  let priceInserted = false

  return (
    <div className='space-y-0.5 text-sm'>
      {levels.map((lv, i) => {
        const rows: React.ReactNode[] = []

        if (!priceInserted && lv.price < currentPrice) {
          priceInserted = true
          rows.push(
            <div key='price-line' className='flex items-center gap-2 py-1.5 border-y border-dashed border-muted-foreground/40'>
              <span className='text-xs text-muted-foreground'>当前价</span>
              <span className='font-mono font-bold'>{currentPrice.toFixed(2)}</span>
            </div>
          )
        }

        const statusIcon = lv.status === 'broken' ? ' (已突破)' : lv.status === 'near' ? ' (临近)' : ''

        rows.push(
          <div key={i} className='flex items-center justify-between py-0.5'>
            <div className='flex items-center gap-1.5'>
              <span className='text-xs'>{lv.is_resistance ? '▲' : '▼'}</span>
              <span className='text-muted-foreground'>{lv.name}</span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='font-mono'>{lv.price.toFixed(2)}</span>
              <span className={`text-xs ${lv.dist_pct > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {lv.dist_pct > 0 ? '+' : ''}{lv.dist_pct.toFixed(2)}%
              </span>
              {statusIcon && <span className='text-xs text-yellow-500'>{statusIcon}</span>}
            </div>
          </div>
        )

        return rows
      })}
      {!priceInserted && (
        <div className='flex items-center gap-2 py-1.5 border-t border-dashed border-muted-foreground/40'>
          <span className='text-xs text-muted-foreground'>当前价</span>
          <span className='font-mono font-bold'>{currentPrice.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}
