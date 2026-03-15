import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertCircle,
  Crosshair,
  RefreshCw,
  Timer,
  TimerOff,
} from 'lucide-react'
import { useBeeTraderStrategy } from './hooks/use-beetrader-strategy'
import { TimeframeStatusCards } from './components/timeframe-status-cards'
import { BullBearLineCard } from './components/bull-bear-line'
import { StrategyRecommendation } from './components/strategy-recommendation'
import {
  MacdPanel,
  BollingerPanel,
  RsiPanel,
  KdjPanel,
} from './components/indicator-panels'
import { FibonacciPanel } from './components/fibonacci-panel'
import { VolumeAnalysisPanel } from './components/volume-analysis'
import { AiStrategyCard } from './components/ai-strategy-card'
import { useAiStrategy } from './hooks/use-ai-strategy'

const POPULAR_COINS = ['BTC', 'ETH', 'SOL', 'HYPE', 'SUI', 'DOGE', 'xyz:GOLD', 'xyz:BRENTOIL', 'xyz:SILVER']
const AUTO_REFRESH_INTERVAL = 120 // 秒 (策略分析较重, 2分钟刷新)

export function TradingStrategies() {
  const [coin, setCoin] = useState('BTC')
  const { analyze, loading, error, data, reset } = useBeeTraderStrategy()
  const aiStrategy = useAiStrategy()
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loadingRef = useRef(loading)
  loadingRef.current = loading

  const doAnalyze = useCallback(
    async (targetCoin: string) => {
      if (loadingRef.current) return
      try {
        await analyze(targetCoin.trim())
        setLastUpdated(new Date())
      } catch {
        // error 已由 hook 处理
      }
    },
    [analyze]
  )

  const handleAnalyze = () => {
    if (!coin.trim()) return
    reset()
    aiStrategy.reset()
    doAnalyze(coin)
    setCountdown(AUTO_REFRESH_INTERVAL)
  }

  // 自动刷新定时器
  useEffect(() => {
    if (autoRefresh && data) {
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
  }, [autoRefresh, coin, data, doAnalyze])

  const toggleAutoRefresh = () => {
    if (!data) {
      handleAnalyze()
      setAutoRefresh(true)
    } else {
      setAutoRefresh((v) => !v)
    }
  }

  return (
    <div className='flex flex-col space-y-3'>
      {/* 头部 */}
      <div className='flex-shrink-0 space-y-1'>
        <div className='flex items-center gap-2'>
          <Crosshair className='h-5 w-5' />
          <h1 className='text-xl font-bold'>大镖客策略模拟</h1>
          <span className='text-sm text-muted-foreground'>
            多级别周期分析 · 指标共振策略
          </span>
          {lastUpdated && (
            <span className='text-xs text-muted-foreground ml-auto'>
              更新于 {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

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
        <Button
          variant={autoRefresh ? 'default' : 'outline'}
          size='sm'
          onClick={toggleAutoRefresh}
          className='gap-1'
        >
          {autoRefresh ? (
            <>
              <TimerOff className='h-4 w-4' />
              停止刷新
            </>
          ) : (
            <>
              <Timer className='h-4 w-4' />
              自动刷新
            </>
          )}
        </Button>
        {autoRefresh && data && (
          <Badge variant='secondary' className='text-xs tabular-nums'>
            {countdown}s 后刷新
          </Badge>
        )}
        <div className='flex items-center gap-1'>
          {POPULAR_COINS.map((c) => (
            <Button
              key={c}
              variant={coin === c ? 'default' : 'outline'}
              size='sm'
              className='text-xs h-7 px-2'
              onClick={() => {
                setCoin(c)
                reset()
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
      </div>

      {/* 内容区 */}
      <div className='flex-1 min-h-0 overflow-y-auto space-y-3'>
        {error && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>分析失败</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {loading && !data && (
          <div className='space-y-3'>
            <div className='grid grid-cols-3 gap-3'>
              <Skeleton className='h-24' />
              <Skeleton className='h-24' />
              <Skeleton className='h-24' />
            </div>
            <Skeleton className='h-14' />
            <Skeleton className='h-40' />
            <div className='grid grid-cols-2 gap-3'>
              <Skeleton className='h-48' />
              <Skeleton className='h-48' />
            </div>
          </div>
        )}

        {data && (
          <>
            {/* 多周期状态卡片 */}
            <TimeframeStatusCards data={data.timeframe_status} />

            {/* 多空分界线 */}
            <BullBearLineCard
              data={data.bull_bear_line}
              currentPrice={data.current_price}
            />

            {/* 策略建议 */}
            <StrategyRecommendation
              data={data.strategy}
              currentPrice={data.current_price}
            />

            {/* AI 策略判断 */}
            <AiStrategyCard
              result={aiStrategy.result}
              loading={aiStrategy.loading}
              error={aiStrategy.error}
              onGenerate={() => {
                if (data) aiStrategy.generate(data)
              }}
              hasData={!!data}
              coin={data.coin}
            />

            {/* 详细指标 Tabs */}
            <Tabs defaultValue='indicators'>
              <TabsList>
                <TabsTrigger value='indicators'>技术指标</TabsTrigger>
                <TabsTrigger value='fibonacci'>斐波那契</TabsTrigger>
                <TabsTrigger value='volume'>成交量</TabsTrigger>
              </TabsList>

              <TabsContent value='indicators' className='space-y-3 mt-3'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  <MacdPanel data={data.indicators.macd} />
                  <BollingerPanel
                    data={data.indicators.bollinger}
                  />
                  <RsiPanel data={data.indicators.rsi} />
                  <KdjPanel data={data.indicators.kdj} />
                </div>
              </TabsContent>

              <TabsContent value='fibonacci' className='mt-3'>
                <FibonacciPanel
                  data={data.indicators.fibonacci}
                  currentPrice={data.current_price}
                />
              </TabsContent>

              <TabsContent value='volume' className='mt-3'>
                <VolumeAnalysisPanel data={data.volume_analysis} />
              </TabsContent>
            </Tabs>
          </>
        )}

        {!loading && !data && !error && (
          <div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
            <Crosshair className='h-12 w-12 mb-3 opacity-30' />
            <p className='text-lg font-medium mb-1'>大镖客策略模拟</p>
            <p className='text-sm'>
              选择币种并点击分析，获取多周期策略建议
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
