import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Radar, RefreshCw, Timer, TimerOff } from 'lucide-react'
import { useOrderRadar } from './hooks/use-order-radar'
import { SignalResult } from './components/signal-result'

const POPULAR_COINS = ['BTC', 'ETH', 'SOL', 'HYPE', 'SUI', 'DOGE']
const AUTO_REFRESH_INTERVAL = 60 // 秒

export function TradingSignals() {
  const [coin, setCoin] = useState('BTC')
  const { analyze, loading, error, data, reset } = useOrderRadar()
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loadingRef = useRef(loading)
  loadingRef.current = loading

  const doAnalyze = useCallback(async (targetCoin: string) => {
    if (loadingRef.current) return
    try {
      await analyze(targetCoin.trim())
      setLastUpdated(new Date())
    } catch {
      // error 已由 hook 处理
    }
  }, [analyze])

  const handleAnalyze = () => {
    if (!coin.trim()) return
    reset()
    doAnalyze(coin)
    setCountdown(AUTO_REFRESH_INTERVAL)
  }

  // 自动刷新定时器
  useEffect(() => {
    if (autoRefresh && data) {
      // 主刷新定时器
      intervalRef.current = setInterval(() => {
        doAnalyze(coin)
        setCountdown(AUTO_REFRESH_INTERVAL)
      }, AUTO_REFRESH_INTERVAL * 1000)

      // 倒计时定时器
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
      // 如果还没有数据，先执行一次分析再开启自动刷新
      handleAnalyze()
      setAutoRefresh(true)
    } else {
      setAutoRefresh((v) => !v)
    }
  }

  return (
    <div className='flex flex-col space-y-6'>
      {/* 头部 */}
      <div className='flex-shrink-0 space-y-4'>
        <div className='flex items-center gap-2'>
          <Radar className='h-6 w-6' />
          <h1 className='text-2xl font-bold'>Order Radar</h1>
          <span className='text-sm text-muted-foreground'>多层共振分析</span>
          {lastUpdated && (
            <span className='text-xs text-muted-foreground ml-auto'>
              更新于 {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* 输入区 */}
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
      </div>

      {/* 内容区 */}
      <div className='flex-1 min-h-0 overflow-y-auto'>
        {error && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>分析失败</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {loading && !data && (
          <div className='space-y-4'>
            <Skeleton className='h-20 w-full' />
            <Skeleton className='h-40 w-full' />
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Skeleton className='h-48' />
              <Skeleton className='h-48' />
              <Skeleton className='h-48' />
              <Skeleton className='h-48' />
            </div>
          </div>
        )}

        {data && <SignalResult data={data} />}

        {!loading && !data && !error && (
          <div className='flex flex-col items-center justify-center py-20 text-muted-foreground'>
            <Radar className='h-16 w-16 mb-4 opacity-30' />
            <p>选择币种并点击分析</p>
          </div>
        )}
      </div>
    </div>
  )
}
