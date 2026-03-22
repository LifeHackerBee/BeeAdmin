import { useState, useMemo, useCallback } from 'react'
import { useCandleData, type CandleInterval } from './hooks/use-candle-data'
import { CandlestickChart, type KeyLevelOverlay } from './components/candlestick-chart'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

// 根据时间间隔确定合适的历史数据范围
const INTERVAL_RANGES: Partial<Record<CandleInterval, number>> = {
  '15m': 3 * 24 * 60 * 60 * 1000,   // 3 天 → 约 288 根蜡烛
  '1h':  7 * 24 * 60 * 60 * 1000,   // 7 天 → 约 168 根蜡烛
  '4h':  30 * 24 * 60 * 60 * 1000,  // 30 天 → 约 180 根蜡烛
  '1d':  90 * 24 * 60 * 60 * 1000,  // 90 天 → 约  90 根蜡烛
}

interface CandlesProps {
  /** 外部传入的币种，若提供则隐藏内部币种选择器 */
  coin?: string
  /** 外部传入的 S/R 关键位 + 多空分界线等叠加线 */
  keyLevels?: KeyLevelOverlay[]
  /** 外部传入的当前价格 */
  currentPrice?: number
}

export function Candles({ coin: externalCoin, keyLevels: externalLevels, currentPrice: externalPrice }: CandlesProps) {
  const activeCoin = externalCoin || 'BTC'
  const [selectedInterval, setSelectedInterval] = useState<CandleInterval>('4h')
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  // 时间范围随间隔动态调整
  const { startTime, endTime } = useMemo(() => {
    const now = Date.now()
    const range = INTERVAL_RANGES[selectedInterval] ?? 24 * 60 * 60 * 1000
    return { startTime: now - range, endTime: now }
  }, [selectedInterval])

  const { data, loading, error, refetch } = useCandleData(
    activeCoin,
    selectedInterval,
    startTime,
    endTime
  )

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true)
    await refetch()
    setIsManualRefreshing(false)
  }, [refetch])

  return (
    <div className='flex flex-col h-full'>
      {/* K 线图 */}
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
            coin={activeCoin}
            interval={selectedInterval}
            keyLevels={externalLevels}
            currentPrice={externalPrice}
            onIntervalChange={setSelectedInterval}
            onRefresh={handleRefresh}
            refreshing={isManualRefreshing}
          />
        )}
      </div>
    </div>
  )
}
