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
  Globe,
} from 'lucide-react'
import { useUnifiedAnalysis } from '../hooks/use-unified-analysis'
import { useAiStrategy } from '../../strategies/hooks/use-ai-strategy'
import { useLiquidationMap } from '../hooks/use-liquidation-map'
import { useStrategyPrompts } from '../hooks/use-strategy-prompts'
import { AiStrategyPanel } from './ai-comparison'
import { PromptManager } from './prompt-manager'
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
import { MovingAveragesPanel, StaircasePatternPanel } from '../../strategies/components/moving-averages-panel'
import { hyperliquidApiGet, hyperliquidApiPost } from '@/lib/hyperliquid-api-client'
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
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyRecords, setHistoryRecords] = useState<{ id: number; coin: string; source?: string; ai_signal?: unknown; created_at: string }[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 统一分析引擎（共享 K 线数据，一次请求）
  const unified = useUnifiedAnalysis()
  const radar = { data: unified.radarData, loading: unified.loading, error: unified.error }
  const strategy = { data: unified.strategyData, loading: unified.loading, error: unified.error }

  // 大镖客 AI 策略（手动触发）
  const aiStrategy = useAiStrategy()

  // 策略 Prompt 模板库
  const promptLib = useStrategyPrompts()

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

  // 页面加载时从缓存加载最新分析记录（不自动发起实时分析）
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [usingCache, setUsingCache] = useState(false)
  useEffect(() => {
    if (historyLoaded) return
    setHistoryLoaded(true)
    hyperliquidApiGet<{ success: boolean; record: {
      coin: string
      strategy_data: BeeTraderStrategyData
      ai_strategy_sections?: { key: string; title: string; content: string }[]
      created_at: string
    } | null }>(
      '/api/beetrader_strategy/history/latest'
    ).then((res) => {
      if (res.record) {
        setCoin(res.record.coin)
        unified.setStrategy(res.record.strategy_data)
        setLastUpdated(new Date(res.record.created_at))
        setUsingCache(true)
        // 缓存模式下不自动触发 AI 生成
        aiAutoTriggered.current = true
        // 恢复缓存的 AI 策略（如果有）
        if (res.record.ai_strategy_sections) {
          const cached = res.record.ai_strategy_sections as unknown
          aiStrategy.setResult({
            content: JSON.stringify(cached, null, 2),
            structured: cached as import('../../strategies/hooks/use-ai-strategy').AiStrategyResult,
          })
        }
      }
    }).catch(() => {})
  }, [historyLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = () => {
    if (!coin.trim()) return
    unified.reset()
    aiStrategy.reset()
    aiAutoTriggered.current = false
    setUsingCache(false)
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

  // 生成 AI 策略并保存到 Supabase
  const doGenerateAI = async (targetCoin: string, strategyData: BeeTraderStrategyData) => {
    const output = await aiStrategy.generate(strategyData, promptLib.selectedPrompt?.system_prompt)
    if (output?.structured) {
      hyperliquidApiPost('/api/beetrader_strategy/history/ai-strategy', {
        coin: targetCoin,
        sections: output.structured,
      }).catch(() => {})
    }
  }

  // AI 手动触发
  const handleGenerateAI = () => {
    if (!strategy.data) return
    aiStrategy.reset()
    doGenerateAI(coin, strategy.data).catch(() => {})
  }

  // 策略数据就绪后自动触发 AI 分析
  const aiAutoTriggered = useRef(false)
  useEffect(() => {
    if (strategy.data && !aiStrategy.result && !aiStrategy.loading && !aiAutoTriggered.current) {
      aiAutoTriggered.current = true
      doGenerateAI(coin, strategy.data)
    }
  }, [strategy.data, aiStrategy.result, aiStrategy.loading]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── 左侧导航定义 ──
  const NAV_SECTIONS = [
    { id: 'macro', label: '宏观市场', icon: Globe },
    { id: 'technical', label: '技术指标', icon: BarChart3 },
    { id: 'strategy', label: '策略总览', icon: Brain },
  ] as const

  const scrollToSection = (id: string) => {
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className='flex gap-4'>
      {/* ════════════════════════════════════
           左侧导航栏
         ════════════════════════════════════ */}
      <nav className='hidden lg:flex flex-col gap-1 w-36 flex-shrink-0 sticky top-4 self-start'>
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type='button'
            onClick={() => scrollToSection(id)}
            className='flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors text-left'
          >
            <Icon className='h-3.5 w-3.5 flex-shrink-0' />
            {label}
          </button>
        ))}
      </nav>

      {/* ════════════════════════════════════
           主内容区
         ════════════════════════════════════ */}
      <div className='flex-1 min-w-0 space-y-3'>
        {/* ── 币种选择与操作 ── */}
        <Card>
          <CardContent className='py-3 px-4 space-y-3'>
            {/* 币种快捷按钮 */}
            <div className='flex items-center gap-1.5 flex-wrap'>
              {POPULAR_COINS.map((c) => (
                <Button
                  key={c}
                  variant={coin === c ? 'default' : 'ghost'}
                  size='sm'
                  className={`text-sm h-8 px-3 ${coin === c ? '' : 'text-muted-foreground'}`}
                  onClick={() => {
                    setCoin(c)
                    unified.reset()
                    aiStrategy.reset()
                    aiAutoTriggered.current = false
                    doAnalyze(c)
                    setCountdown(AUTO_REFRESH_INTERVAL)
                  }}
                  disabled={loading}
                >
                  {c}
                </Button>
              ))}
            </div>

            {/* 操作栏 */}
            <div className='flex items-center gap-2 flex-wrap'>
              <Input
                value={coin}
                onChange={(e) => setCoin(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder='自定义币种'
                className='w-32 h-8 text-sm'
              />
              <Button size='sm' onClick={handleAnalyze} disabled={loading || !coin.trim()}>
                {loading ? (
                  <>
                    <RefreshCw className='h-3.5 w-3.5 mr-1 animate-spin' />
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
                  <><TimerOff className='h-3.5 w-3.5' />停止</>
                ) : (
                  <><Timer className='h-3.5 w-3.5' />自动刷新</>
                )}
              </Button>
              {autoRefresh && hasAnyData && (
                <Badge variant='secondary' className='text-xs tabular-nums'>
                  {countdown}s
                </Badge>
              )}
              {lastUpdated && (
                <span className='text-xs text-muted-foreground ml-auto'>
                  {usingCache && (
                    <Badge variant='outline' className='text-[10px] mr-1.5 px-1.5 py-0 h-4 font-normal'>缓存</Badge>
                  )}
                  {lastUpdated.toLocaleTimeString()}
                  {usingCache && <span className='ml-1'>· 点击刷新获取最新</span>}
                </span>
              )}
              <Button
                variant='ghost'
                size='sm'
                className='text-xs gap-1'
                onClick={() => setHistoryOpen(!historyOpen)}
              >
                <Timer className='h-3.5 w-3.5' />
                历史分析
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 历史分析记录 */}
        {historyOpen && (
          <AnalysisHistoryPanel
            coin={coin}
            loading={historyLoading}
            records={historyRecords}
            onSearch={async (searchCoin, startTime, endTime) => {
              setHistoryLoading(true)
              try {
                const params = new URLSearchParams({ limit: '50', fields: 'id,coin,source,ai_signal,created_at' })
                if (searchCoin) params.set('coin', searchCoin)
                if (startTime) params.set('start_time', startTime)
                if (endTime) params.set('end_time', endTime)
                params.set('source', 'scheduled')
                const res = await hyperliquidApiGet<{ success: boolean; records: typeof historyRecords }>(
                  `/api/beetrader_strategy/history?${params.toString()}`
                )
                setHistoryRecords(res.records || [])
              } catch { setHistoryRecords([]) } finally { setHistoryLoading(false) }
            }}
            onLoadRecord={async (_recordId) => {
              try {
                const res = await hyperliquidApiGet<{ success: boolean; records: { strategy_data: BeeTraderStrategyData; ai_strategy_sections?: unknown; created_at: string }[] }>(
                  `/api/beetrader_strategy/history?limit=1&fields=strategy_data,ai_strategy_sections,created_at&source=scheduled&coin=${coin}`
                )
                // Use the full history endpoint with id filter isn't available, so fetch by latest for now
                // For a proper implementation, we'd need a GET /history/:id endpoint
                const rec = res.records?.[0]
                if (rec?.strategy_data) {
                  unified.setStrategy(rec.strategy_data)
                  setLastUpdated(new Date(rec.created_at))
                  setUsingCache(true)
                  if (rec.ai_strategy_sections) {
                    aiStrategy.setResult({
                      content: JSON.stringify(rec.ai_strategy_sections, null, 2),
                      structured: rec.ai_strategy_sections as import('../../strategies/hooks/use-ai-strategy').AiStrategyResult,
                    })
                  }
                }
              } catch { /* ignore */ }
            }}
          />
        )}

        {/* 错误提示 */}
        {hasError && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>分析失败</AlertTitle>
            <AlertDescription>{unified.error?.message}</AlertDescription>
          </Alert>
        )}

        {/* ══════════════════════════════════════
             Section 1: 宏观市场（含 K 线图）
           ══════════════════════════════════════ */}
        <div id='section-macro' className='scroll-mt-4 space-y-3'>
          <div className='flex flex-col bg-card rounded-lg border p-6 shadow-sm'>
            <div className='mb-4'>
              <h3 className='text-xl font-semibold flex items-center gap-2'>
                <Globe className='h-5 w-5' />
                宏观市场
              </h3>
            </div>
            <Macroscopic />
          </div>

          {/* K线观察 */}
          <div
            className='flex flex-col bg-card rounded-lg border p-6 shadow-sm'
            style={{ height: '560px', minHeight: '480px' }}
          >
            <div className='flex-1 min-h-0 overflow-hidden'>
              <Candles
                coin={coin}
                keyLevels={chartKeyLevels}
                currentPrice={currentPrice}
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
             Section 2: 技术指标（含成交量）
           ══════════════════════════════════════ */}
        <div id='section-technical' className='scroll-mt-4'>
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
                {/* S/R 战术双线 + OI */}
                {radar.data ? (
                  <>
                    <SrLevelsCard srLevels={radar.data.entry_trigger.sr_levels} />
                    <OiFundingCard oi={radar.data.entry_trigger.oi} />
                  </>
                ) : loading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-24 w-full' />
                    <Skeleton className='h-20 w-full' />
                  </div>
                ) : null}

                {/* MACD / 布林带 / RSI / KDJ */}
                {strategy.data ? (
                  <>
                    <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'>
                      <MacdPanel data={strategy.data.indicators.macd} />
                      <BollingerPanel data={strategy.data.indicators.bollinger} />
                      <RsiPanel data={strategy.data.indicators.rsi} />
                      <KdjPanel data={strategy.data.indicators.kdj} />
                    </div>
                    <MovingAveragesPanel data={strategy.data.indicators.moving_averages} currentPrice={strategy.data.current_price} />
                    <FibonacciPanel data={strategy.data.indicators.fibonacci} currentPrice={strategy.data.current_price} />
                  </>
                ) : loading ? (
                  <div className='space-y-3'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                      <Skeleton className='h-40' />
                      <Skeleton className='h-40' />
                    </div>
                    <Skeleton className='h-32 w-full' />
                  </div>
                ) : null}

                {/* 5分钟量级变化 */}
                <MarketDepth coin={coin} />

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
        </div>

        {/* ══════════════════════════════════════
             Section 3: 策略总览（结构化数据 → 交易机器人）
           ══════════════════════════════════════ */}
        <div id='section-strategy' className='scroll-mt-4 space-y-3'>
          {(radar.data || strategy.data || (loading && !hasAnyData)) && (
            <Card>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle className='text-base flex items-center gap-2'>
                      <Brain className='h-5 w-5' />
                      策略总览
                      {loading && <RefreshCw className='h-3.5 w-3.5 animate-spin text-muted-foreground' />}
                    </CardTitle>
                    <p className='text-xs text-muted-foreground mt-1'>
                      以下结构化数据将作为交易机器人的决策依据，可通过策略模板自定义分析规则
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* 趋势过滤 */}
                {radar.data ? (
                  <TrendFilterCard
                    trendFilter={radar.data.trend_filter}
                    coin={radar.data.coin}
                    currentPrice={radar.data.current_price}
                  />
                ) : loading ? (
                  <Skeleton className='h-20 w-full' />
                ) : null}

                {/* 多周期状态 + 多空分界线 + 阶梯 + 策略建议 */}
                {strategy.data ? (
                  <>
                    <TimeframeStatusCards data={strategy.data.timeframe_status} />
                    <BullBearLineCard data={strategy.data.bull_bear_line} currentPrice={strategy.data.current_price} />
                    <StaircasePatternPanel data={strategy.data.staircase_pattern} />
                    <StrategyRecommendation data={strategy.data.strategy} currentPrice={strategy.data.current_price} />
                  </>
                ) : loading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-24 w-full' />
                    <Skeleton className='h-16 w-full' />
                  </div>
                ) : null}

                {/* ── AI 策略 (策略模板 + 生成) ── */}
                {strategy.data && (
                  <>
                    <div className='border-t pt-4'>
                      <div className='flex items-center justify-between flex-wrap gap-2'>
                        <div className='flex items-center gap-2'>
                          <Sparkles className='h-4 w-4 text-purple-500' />
                          <span className='text-sm font-medium'>AI 策略生成</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <PromptManager
                            prompts={promptLib.prompts}
                            selectedId={promptLib.selectedId}
                            onSelect={promptLib.setSelectedId}
                            onCreate={promptLib.createPrompt}
                            onUpdate={promptLib.updatePrompt}
                            onDelete={promptLib.deletePrompt}
                            onSetDefault={promptLib.setDefault}
                          />
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={handleGenerateAI}
                            disabled={aiStrategy.loading}
                            className='gap-1.5'
                          >
                            <Sparkles className='h-4 w-4' />
                            {aiStrategy.loading ? '生成中...' : '生成 AI 策略'}
                          </Button>
                        </div>
                      </div>
                      <p className='text-[10px] text-muted-foreground mt-1'>
                        基于上方结构化数据，使用选中的策略模板调用 AI 生成交易信号。交易机器人使用相同的流程自动执行。
                      </p>
                    </div>

                    {(aiStrategy.loading || aiStrategy.result || aiStrategy.error) && (
                      <>
                        <AiStrategyPanel
                          coin={coin}
                          result={aiStrategy.result}
                          loading={aiStrategy.loading}
                        />
                        {aiStrategy.error && (
                          <Alert variant='destructive'>
                            <AlertCircle className='h-4 w-4' />
                            <AlertDescription className='text-xs'>
                              AI 策略生成失败: {aiStrategy.error.message}
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
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
    </div>
  )
}

// ── 历史分析记录面板 ──

function AnalysisHistoryPanel({
  coin,
  loading,
  records,
  onSearch,
  onLoadRecord,
}: {
  coin: string
  loading: boolean
  records: { id: number; coin: string; source?: string; ai_signal?: unknown; created_at: string }[]
  onSearch: (coin: string, startTime?: string, endTime?: string) => void
  onLoadRecord: (id: number) => void
}) {
  const [searchDate, setSearchDate] = useState(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  })
  const mounted = useRef(false)

  // 首次展开自动搜索
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    onSearch(coin)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    // 北京时间该日 8:00 到次日 8:00
    const startBJ = `${searchDate}T08:00:00+08:00`
    const endDate = new Date(new Date(searchDate).getTime() + 86400000)
    const endBJ = `${endDate.toISOString().split('T')[0]}T08:00:00+08:00`
    onSearch(coin, startBJ, endBJ)
  }

  return (
    <Card>
      <CardContent className='py-3 px-4 space-y-2'>
        <div className='flex items-center gap-2'>
          <Timer className='h-3.5 w-3.5 text-muted-foreground' />
          <span className='text-xs font-medium'>定时分析历史</span>
          <Badge variant='secondary' className='text-[10px] px-1.5 py-0 h-4'>
            每小时 · 北京 8:00 起
          </Badge>
          <div className='ml-auto flex items-center gap-1.5'>
            <input
              type='date'
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className='h-7 text-[10px] border rounded px-1.5 bg-background'
            />
            <Button variant='outline' size='sm' className='h-7 text-[10px]' onClick={handleSearch} disabled={loading}>
              {loading ? '搜索中...' : '搜索'}
            </Button>
          </div>
        </div>
        {records.length === 0 ? (
          <p className='text-[10px] text-muted-foreground py-2 text-center'>
            {loading ? '加载中...' : '暂无记录 — 定时分析每整点自动运行'}
          </p>
        ) : (
          <div className='max-h-48 overflow-y-auto'>
            <div className='grid gap-1'>
              {records.map((rec) => {
                const signal = rec.ai_signal as { direction?: string; confidence?: number } | null
                const time = new Date(rec.created_at)
                return (
                  <button
                    key={rec.id}
                    className='flex items-center gap-2 text-left px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-[10px]'
                    onClick={() => onLoadRecord(rec.id)}
                  >
                    <span className='font-mono text-muted-foreground w-14 shrink-0'>
                      {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })}
                    </span>
                    <Badge variant='outline' className='text-[10px] px-1 py-0 h-4 shrink-0'>
                      {rec.coin}
                    </Badge>
                    {signal?.direction && (
                      <Badge className={`text-[10px] px-1.5 py-0 h-4 ${
                        signal.direction === 'long' ? 'bg-green-500' :
                        signal.direction === 'short' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`}>
                        {signal.direction} {signal.confidence && `(${signal.confidence})`}
                      </Badge>
                    )}
                    <span className='text-muted-foreground truncate'>
                      {time.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai' })}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
