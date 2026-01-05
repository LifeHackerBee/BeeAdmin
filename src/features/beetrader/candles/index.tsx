import { useState, useMemo } from 'react'
import { useCandleData, type CandleInterval } from './hooks/use-candle-data'
import { CandlestickChart } from './components/candlestick-chart'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

const COINS = ['BTC', 'ETH', 'SOL'] as const
type Coin = (typeof COINS)[number]

const INTERVALS: CandleInterval[] = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
  '1M',
]

export function Candles() {
  const [selectedCoin, setSelectedCoin] = useState<Coin>('BTC')
  const [selectedInterval, setSelectedInterval] = useState<CandleInterval>('15m')
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  // 使用 useMemo 稳定时间范围，避免每次渲染都创建新值
  const { startTime, endTime } = useMemo(() => {
    const now = Date.now()
    return {
      startTime: now - 24 * 60 * 60 * 1000, // 24小时前
      endTime: now,
    }
  }, [])

  const { data, loading, error, refetch } = useCandleData(
    selectedCoin,
    selectedInterval,
    startTime,
    endTime
  )

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    await refetch()
    setIsManualRefreshing(false)
  }

  return (
    <div className='flex h-full flex-col space-y-6 overflow-hidden'>
      <div className='flex items-center justify-between flex-shrink-0'>
        <div>
          <h2 className='text-xl font-semibold'>K线观察</h2>
          <p className='text-sm text-muted-foreground'>
            观察 BTC、ETH、SOL 的实时K线图，数据来自 Hyperliquid
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={handleManualRefresh}
          disabled={isManualRefreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isManualRefreshing ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <div className='flex-shrink-0 flex items-center gap-4'>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>币种:</span>
          <Select value={selectedCoin} onValueChange={(value) => setSelectedCoin(value as Coin)}>
            <SelectTrigger className='w-[120px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COINS.map((coin) => (
                <SelectItem key={coin} value={coin}>
                  {coin}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>时间间隔:</span>
          <Select
            value={selectedInterval}
            onValueChange={(value) => setSelectedInterval(value as CandleInterval)}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVALS.map((interval) => (
                <SelectItem key={interval} value={interval}>
                  {interval}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='flex-1 overflow-auto'>
        {error ? (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : (
          <CandlestickChart
            data={data}
            loading={loading}
            coin={selectedCoin}
            interval={selectedInterval}
          />
        )}
      </div>
    </div>
  )
}

