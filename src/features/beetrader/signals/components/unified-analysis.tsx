import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { KeyLevelOverlay } from '../../candles/components/candlestick-chart'
import {
  AlertCircle,
  Radar,
  RefreshCw,
  Timer,
  TimerOff,
  Sparkles,
  Flame,
  Brain,
  BarChart3,
} from 'lucide-react'
import { useUnifiedAnalysis } from '../hooks/use-unified-analysis'
import { useAiStrategy } from '../../strategies/hooks/use-ai-strategy'
import { useLiquidationMap } from '../hooks/use-liquidation-map'
import { AiStrategyPanel } from './ai-comparison'
import {
  TrendFilterCard,
  SrLevelsCard,
  OiFundingCard,
} from './signal-result'
import { LiquidationMapChart } from './liquidation-map-chart'
import { TimeframeStatusCards } from '../../strategies/components/timeframe-status-cards'
import { BullBearLineCard } from '../../strategies/components/bull-bear-line'
import { StrategyRecommendation } from '../../strategies/components/strategy-recommendation'
import {
  MacdPanel,
  BollingerPanel,
  RsiPanel,
  KdjPanel,
} from '../../strategies/components/indicator-panels'
import { FibonacciPanel } from '../../strategies/components/fibonacci-panel'
import { VolumeAnalysisPanel } from '../../strategies/components/volume-analysis'
import { MovingAveragesPanel, StaircasePatternPanel } from '../../strategies/components/moving-averages-panel'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import type { BeeTraderStrategyData } from '../../strategies/types'
import { Macroscopic } from '../../macroscopic'
import { Candles } from '../../candles'
import { MarketDepth } from '../../market/components/market-depth'

const POPULAR_COINS = ['BTC', 'ETH', 'SOL', 'HYPE', 'SUI', 'DOGE', 'xyz:GOLD', 'xyz:BRENTOIL', 'xyz:SILVER']
const AUTO_REFRESH_INTERVAL = 60 // 秒

export function UnifiedAnalysis() {
  const [coin, setCoin] = useState('BTC')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 统一分析引擎（共享 K 线数据，一次请求）
  const unified = useUnifiedAnalysis()
  const radar = { data: unified.radarData, loading: unified.loading, error: unified.error }
  const strategy = { data: unified.strategyData, loading: unified.loading, error: unified.error }

  // 大镖客 AI 策略（手动触发）
  const aiStrategy = useAiStrategy()

  // 清算热力图
  const liqMap = useLiquidationMap()

  const loading = unified.loading
  const loadingRef = useRef(loading)
  loadingRef.current = loading

  const doAnalyze = useCallback(async (targetCoin: string) => {
    if (loadingRef.current) return
    await unified.analyze(targetCoin.trim()).catch(() => {})
    setLastUpdated(new Date())
  }, [unified.analyze])

  // 页面加载时获取最新历史记录，然后自动触发实时分析
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [historyTime, setHistoryTime] = useState<string | null>(null)
  useEffect(() => {
    if (historyLoaded) return
    setHistoryLoaded(true)
    hyperliquidApiGet<{ success: boolean; record: { coin: string; strategy_data: BeeTraderStrategyData; created_at: string } | null }>(
      '/api/beetrader_strategy/history/latest'
    ).then((res) => {
      if (res.record) {
        setCoin(res.record.coin)
        unified.setStrategy(res.record.strategy_data)
        setHistoryTime(res.record.created_at)
        setLastUpdated(new Date(res.record.created_at))
        // 历史记录加载后，自动发起实时分析（覆盖历史数据）
        doAnalyze(res.record.coin)
      } else {
        // 无历史记录，直接分析默认币种
        doAnalyze('BTC')
      }
    }).catch(() => {
      doAnalyze('BTC')
    })
  }, [historyLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = () => {
    if (!coin.trim()) return
    unified.reset()
    aiStrategy.reset()
    setHistoryTime(null)
    doAnalyze(coin)
    setCountdown(AUTO_REFRESH_INTERVAL)
  }

  // 自动刷新
  useEffect(() => {
    if (autoRefresh && (radar.data || strategy.data)) {
      intervalRef.current = setInterval(() => {
        doAnalyze(coin)
        setCountdown(AUTO_REFRESH_INTERVAL)
      }, AUTO_REFRESH_INTERVAL * 1000)

      setCountdown(AUTO_REFRESH_INTERVAL)
      countdownRef.current = setInterval(() => {
        setCountdown((c) => (c > 0 ? c - 1 : AUTO_REFRESH_INTERVAL))
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [autoRefresh, coin, radar.data, strategy.data, doAnalyze])

  // AI 手动触发
  const handleGenerateAI = () => {
    if (!strategy.data) return
    aiStrategy.reset()
    aiStrategy.generate(strategy.data)
  }

  const toggleAutoRefresh = () => {
    if (!radar.data && !strategy.data) {
      handleAnalyze()
      setAutoRefresh(true)
    } else {
      setAutoRefresh((v) => !v)
    }
  }

  const hasAnyData = radar.data || strategy.data
  const hasError = unified.error

  // ── 从 radar + strategy 数据构建 K 线图叠加线 ──
  const chartKeyLevels = useMemo<KeyLevelOverlay[]>(() => {
    const levels: KeyLevelOverlay[] = []

    // 1. S/R 战术双线 (来自 radar)
    if (radar.data) {
      const tactical = radar.data.entry_trigger.sr_levels.tactical
      const cp = radar.data.current_price
      if (cp > 0 && tactical) {
        const { R1, R2 } = tactical.resistances
        const { S1, S2 } = tactical.supports

        if (R1) levels.push({ name: `R1 压力`, price: R1.price, is_resistance: true, dist_pct: ((R1.price - cp) / cp) * 100 })
        if (R2) levels.push({ name: `R2 压力`, price: R2.price, is_resistance: true, dist_pct: ((R2.price - cp) / cp) * 100 })
        if (S1) levels.push({ name: `S1 支撑`, price: S1.price, is_resistance: false, dist_pct: ((S1.price - cp) / cp) * 100 })
        if (S2) levels.push({ name: `S2 支撑`, price: S2.price, is_resistance: false, dist_pct: ((S2.price - cp) / cp) * 100 })
      }
    }

    // 2. 多空分界线 (来自 strategy)
    if (strategy.data?.bull_bear_line) {
      const bb = strategy.data.bull_bear_line
      const cp = strategy.data.current_price
      levels.push({
        name: `分界线(${bb.status === 'above' ? '多' : bb.status === 'below' ? '空' : '震荡'})`,
        price: bb.price,
        is_resistance: cp < bb.price,
        dist_pct: ((bb.price - cp) / cp) * 100,
      })
    }

    return levels
  }, [radar.data, strategy.data])

  const currentPrice = radar.data?.current_price ?? strategy.data?.current_price

  return (
    <div className='space-y-3'>
      {/* 控制区 */}
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          value={coin}
          onChange={(e) => setCoin(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          placeholder='输入币种，如 BTC'
          className='w-32'
        />
        <Button onClick={handleAnalyze} disabled={loading || !coin.trim()}>
          {loading ? (
            <>
              <RefreshCw className='h-4 w-4 mr-1 animate-spin' />
              分析中...
            </>
          ) : (
            '刷新分析'
          )}
        </Button>

        <Button
          variant={autoRefresh ? 'default' : 'outline'}
          size='sm'
          onClick={toggleAutoRefresh}
          className='gap-1'
        >
          {autoRefresh ? (
            <><TimerOff className='h-4 w-4' />停止刷新</>
          ) : (
            <><Timer className='h-4 w-4' />自动刷新</>
          )}
        </Button>
        {autoRefresh && hasAnyData && (
          <Badge variant='secondary' className='text-xs tabular-nums'>
            {countdown}s 后刷新
          </Badge>
        )}
        {lastUpdated && (
          <span className='text-xs text-muted-foreground ml-auto'>
            {historyTime && !radar.data && !loading ? '历史记录 · ' : ''}
            更新于 {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* 币种快捷按钮 */}
      <div className='flex items-center gap-1 flex-wrap'>
        {POPULAR_COINS.map((c) => (
          <Button
            key={c}
            variant={coin === c ? 'default' : 'outline'}
            size='sm'
            className='text-xs h-7 px-2'
            onClick={() => {
              setCoin(c)
              unified.reset()
              aiStrategy.reset()
              doAnalyze(c)
              setCountdown(AUTO_REFRESH_INTERVAL)
            }}
            disabled={loading}
          >
            {c}
          </Button>
        ))}
      </div>

      {/* 错误提示 */}
      {hasError && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>分析失败</AlertTitle>
          <AlertDescription>{unified.error?.message}</AlertDescription>
        </Alert>
      )}

      {/* ══════════════════════════════════════
           宏观市场
         ══════════════════════════════════════ */}
      <div className='flex flex-col bg-card rounded-lg border p-6 shadow-sm'>
        <div className='mb-4'>
          <h3 className='text-xl font-semibold'>宏观市场</h3>
        </div>
        <Macroscopic />
      </div>

      {/* ══════════════════════════════════════
           模块一：策略概览（数据到达即显示）
         ══════════════════════════════════════ */}
      {(radar.data || strategy.data || (loading && !hasAnyData)) && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base flex items-center gap-2'>
              <Brain className='h-5 w-5' />
              策略概览
              {loading && <RefreshCw className='h-3.5 w-3.5 animate-spin text-muted-foreground' />}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* 趋势过滤 — radar 先到就先展示 */}
            {radar.data ? (
              <TrendFilterCard
                trendFilter={radar.data.trend_filter}
                coin={radar.data.coin}
                currentPrice={radar.data.current_price}
              />
            ) : radar.loading ? (
              <Skeleton className='h-20 w-full' />
            ) : null}

            {/* 多周期状态 + 多空分水岭 + 策略建议 — strategy 先到就先展示 */}
            {strategy.data ? (
              <>
                <TimeframeStatusCards data={strategy.data.timeframe_status} />
                <BullBearLineCard data={strategy.data.bull_bear_line} currentPrice={strategy.data.current_price} />
                <StaircasePatternPanel data={strategy.data.staircase_pattern} />
                <StrategyRecommendation data={strategy.data.strategy} currentPrice={strategy.data.current_price} />
              </>
            ) : strategy.loading ? (
              <div className='space-y-3'>
                <Skeleton className='h-24 w-full' />
                <Skeleton className='h-16 w-full' />
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════
           模块二：AI 策略（手动触发）
         ══════════════════════════════════════ */}
      {(aiStrategy.loading || aiStrategy.result) ? (
        <AiStrategyPanel
          coin={coin}
          result={aiStrategy.result}
          loading={aiStrategy.loading}
        />
      ) : strategy.data ? (
        <div className='flex items-center justify-center py-3'>
          <Button
            variant='outline'
            onClick={handleGenerateAI}
            className='gap-1.5'
          >
            <Sparkles className='h-4 w-4' />
            生成 AI 策略分析
          </Button>
        </div>
      ) : null}

      {/* ══════════════════════════════════════
           K线观察（叠加支撑压力位 + 多空分界线）
         ══════════════════════════════════════ */}
      <div
        className='flex flex-col bg-card rounded-lg border p-6 shadow-sm'
        style={{ height: '560px', minHeight: '480px' }}
      >
        <div className='mb-4 flex-shrink-0'>
          <h3 className='text-xl font-semibold'>K线观察</h3>
        </div>
        <div className='flex-1 min-h-0 overflow-hidden'>
          <Candles
            coin={coin}
            keyLevels={chartKeyLevels}
            currentPrice={currentPrice}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════
           模块三：技术指标（数据到达即显示）
         ══════════════════════════════════════ */}
      {(radar.data || strategy.data || (loading && !hasAnyData)) && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base flex items-center gap-2'>
              <BarChart3 className='h-5 w-5' />
              技术指标
              {loading && <RefreshCw className='h-3.5 w-3.5 animate-spin text-muted-foreground' />}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* 订单流指标 — radar 数据 */}
            {radar.data ? (
              <>
                <SrLevelsCard srLevels={radar.data.entry_trigger.sr_levels} />
                <OiFundingCard oi={radar.data.entry_trigger.oi} />
              </>
            ) : radar.loading ? (
              <div className='space-y-3'>
                <Skeleton className='h-24 w-full' />
                <Skeleton className='h-20 w-full' />
              </div>
            ) : null}

            {/* 技术指标 — strategy 数据 */}
            {strategy.data ? (
              <>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  <MacdPanel data={strategy.data.indicators.macd} />
                  <BollingerPanel data={strategy.data.indicators.bollinger} />
                  <RsiPanel data={strategy.data.indicators.rsi} />
                  <KdjPanel data={strategy.data.indicators.kdj} />
                </div>
                <MovingAveragesPanel data={strategy.data.indicators.moving_averages} currentPrice={strategy.data.current_price} />
                <FibonacciPanel data={strategy.data.indicators.fibonacci} currentPrice={strategy.data.current_price} />
                <VolumeAnalysisPanel data={strategy.data.volume_analysis} />
              </>
            ) : strategy.loading ? (
              <div className='space-y-3'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  <Skeleton className='h-40' />
                  <Skeleton className='h-40' />
                </div>
                <Skeleton className='h-32 w-full' />
              </div>
            ) : null}

            {/* 清算热力图 */}
            {radar.data && (
              liqMap.data ? (
                <LiquidationMapChart data={liqMap.data} coin={radar.data.coin} />
              ) : (
                <div className='flex flex-col items-center py-4 gap-2 border rounded-lg'>
                  {liqMap.loading ? (
                    <>
                      <div className='text-sm text-muted-foreground'>正在从 CoinGlass 抓取清算数据，约需 10-30 秒...</div>
                      <Skeleton className='h-[280px] w-full' />
                    </>
                  ) : liqMap.error ? (
                    <div className='text-sm text-red-500'>{liqMap.error.message}</div>
                  ) : (
                    <>
                      <span className='text-sm text-muted-foreground'>点击加载清算热力图（数据来源: CoinGlass，约需 10-30 秒）</span>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => liqMap.fetch(radar.data!.coin)}
                        className='gap-1'
                      >
                        <Flame className='h-4 w-4' />
                        加载清算图
                      </Button>
                    </>
                  )}
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════
           市场深度分析
         ══════════════════════════════════════ */}
      <div className='flex flex-col bg-card rounded-lg border p-6 shadow-sm'>
        <MarketDepth />
      </div>

      {/* 空状态 */}
      {!loading && !hasAnyData && !hasError && (
        <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
          <Radar className='h-12 w-12 mb-3 opacity-30' />
          <p className='text-lg font-medium mb-1'>交易分析</p>
          <p className='text-sm'>正在加载分析数据...</p>
        </div>
      )}
    </div>
  )
}
