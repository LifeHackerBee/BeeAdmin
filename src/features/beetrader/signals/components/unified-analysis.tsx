import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useOrderRadar } from '../hooks/use-order-radar'
import { useBeeTraderStrategy } from '../../strategies/hooks/use-beetrader-strategy'
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

const POPULAR_COINS = ['BTC', 'ETH', 'SOL', 'HYPE', 'SUI', 'DOGE', 'xyz:GOLD', 'xyz:BRENTOIL', 'xyz:SILVER']
const AUTO_REFRESH_INTERVAL = 60 // 秒

export function UnifiedAnalysis() {
  const [coin, setCoin] = useState('BTC')
  const [enableAI, setEnableAI] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 两套数据引擎 — 始终并行调用
  const radar = useOrderRadar()
  const strategy = useBeeTraderStrategy()

  // 大镖客 AI 策略
  const aiStrategy = useAiStrategy()

  // 清算热力图
  const liqMap = useLiquidationMap()

  // 页面加载时获取最新分析记录
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
        strategy.setData(res.record.strategy_data)
        setHistoryTime(res.record.created_at)
        setLastUpdated(new Date(res.record.created_at))
      }
    }).catch(() => {})
  }, [historyLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = radar.loading || strategy.loading
  const loadingRef = useRef(loading)
  loadingRef.current = loading

  const doAnalyze = useCallback(async (targetCoin: string) => {
    if (loadingRef.current) return
    await Promise.all([
      radar.analyze(targetCoin.trim()).catch(() => {}),
      strategy.analyze(targetCoin.trim()).catch(() => {}),
    ])
    setLastUpdated(new Date())
  }, [radar.analyze, strategy.analyze])

  const handleAnalyze = () => {
    if (!coin.trim()) return
    radar.reset()
    strategy.reset()
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

  // enableAI 开启时，大镖客数据到达后自动触发 AI
  const prevStrategyDataRef = useRef(strategy.data)
  useEffect(() => {
    if (!enableAI) {
      prevStrategyDataRef.current = strategy.data
      return
    }
    if (strategy.data && strategy.data !== prevStrategyDataRef.current) {
      prevStrategyDataRef.current = strategy.data
      aiStrategy.reset()
      aiStrategy.generate(strategy.data)
    }
  }, [strategy.data, enableAI]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleAutoRefresh = () => {
    if (!radar.data && !strategy.data) {
      handleAnalyze()
      setAutoRefresh(true)
    } else {
      setAutoRefresh((v) => !v)
    }
  }

  const hasAnyData = radar.data || strategy.data
  const hasError = radar.error || strategy.error

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
            '分析'
          )}
        </Button>

        {/* AI 开关 */}
        <div className='flex items-center gap-3 border rounded-md px-3 py-1.5'>
          <div className='flex items-center gap-1.5'>
            <Checkbox
              id='enable-ai'
              checked={enableAI}
              onCheckedChange={(checked) => setEnableAI(!!checked)}
            />
            <Label htmlFor='enable-ai' className='text-xs cursor-pointer flex items-center gap-1'>
              <Sparkles className='h-3 w-3' />
              AI 策略分析
            </Label>
          </div>
        </div>

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
            {historyTime && !radar.data && !strategy.loading ? '历史记录 · ' : ''}
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
              radar.reset()
              strategy.reset()
              aiStrategy.reset()
              Promise.all([
                radar.analyze(c).catch(() => {}),
                strategy.analyze(c).catch(() => {}),
              ]).then(() => setLastUpdated(new Date()))
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
        <div className='space-y-2'>
          {radar.error && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>订单流数据获取失败</AlertTitle>
              <AlertDescription>{radar.error.message}</AlertDescription>
            </Alert>
          )}
          {strategy.error && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>技术指标数据获取失败</AlertTitle>
              <AlertDescription>{strategy.error.message}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

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
           模块二：AI 策略（LLM 异步加载）
         ══════════════════════════════════════ */}
      {enableAI && (strategy.data || aiStrategy.loading || aiStrategy.result) && (
        <AiStrategyPanel
          coin={coin}
          result={aiStrategy.result}
          loading={aiStrategy.loading}
        />
      )}

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

      {/* 空状态 */}
      {!loading && !hasAnyData && !hasError && (
        <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
          <Radar className='h-12 w-12 mb-3 opacity-30' />
          <p className='text-lg font-medium mb-1'>交易分析</p>
          <p className='text-sm'>选择币种，点击分析获取全量技术指标</p>
        </div>
      )}
    </div>
  )
}
