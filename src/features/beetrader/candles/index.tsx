import { useState, useMemo, useEffect } from 'react'
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
import { useOrderRadar } from '../signals/hooks/use-order-radar'

const COINS = ['BTC', 'ETH', 'SOL'] as const
type Coin = (typeof COINS)[number]

const INTERVALS: CandleInterval[] = ['15m', '1h', '4h', '1d']

// 根据时间间隔确定合适的历史数据范围
const INTERVAL_RANGES: Partial<Record<CandleInterval, number>> = {
  '15m': 3 * 24 * 60 * 60 * 1000,   // 3 天 → 约 288 根蜡烛
  '1h':  7 * 24 * 60 * 60 * 1000,   // 7 天 → 约 168 根蜡烛
  '4h':  30 * 24 * 60 * 60 * 1000,  // 30 天 → 约 180 根蜡烛
  '1d':  90 * 24 * 60 * 60 * 1000,  // 90 天 → 约  90 根蜡烛
}

export function Candles() {
  const [selectedCoin, setSelectedCoin] = useState<Coin>('BTC')
  const [selectedInterval, setSelectedInterval] = useState<CandleInterval>('4h')
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  // 时间范围随间隔动态调整
  const { startTime, endTime } = useMemo(() => {
    const now = Date.now()
    const range = INTERVAL_RANGES[selectedInterval] ?? 24 * 60 * 60 * 1000
    return { startTime: now - range, endTime: now }
  }, [selectedInterval])

  const { data, loading, error, refetch } = useCandleData(
    selectedCoin,
    selectedInterval,
    startTime,
    endTime
  )

  const { analyze, data: radarData } = useOrderRadar()

  // 切换币种时自动拉取挂单 & 关键位数据（overlay 可选，失败不影响K线）
  useEffect(() => {
    analyze(selectedCoin).catch(() => {})
  }, [selectedCoin, analyze])

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    await Promise.all([
      refetch(),
      analyze(selectedCoin).catch(() => {}),
    ])
    setIsManualRefreshing(false)
  }

  return (
    <div className='flex flex-col space-y-4 h-full'>
      <div className='flex items-center justify-between flex-shrink-0'>
        <div className='flex items-center gap-4'>
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
            <span className='text-sm text-muted-foreground'>间隔:</span>
            <Select
              value={selectedInterval}
              onValueChange={(value) => setSelectedInterval(value as CandleInterval)}
            >
              <SelectTrigger className='w-[100px]'>
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

      <div className='flex-1 overflow-hidden min-h-0'>
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
            keyLevels={radarData?.key_levels}
            currentPrice={radarData?.current_price}
          />
        )}
      </div>
    </div>
  )
}
