import { useState, useMemo, useEffect, useCallback } from 'react'
import { useCandleData, type CandleInterval } from './hooks/use-candle-data'
import { CandlestickChart } from './components/candlestick-chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useOrderRadar } from '../signals/hooks/use-order-radar'

const COINS = ['BTC', 'ETH', 'SOL'] as const
type Coin = (typeof COINS)[number]

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

  // 每个时间级别取最近的一条支撑 + 一条压力，共 6 条线
  const keyLevels = useMemo(() => {
    if (!radarData) return undefined
    const sr = radarData.entry_trigger.sr_levels
    const cp = radarData.current_price
    if (cp <= 0) return undefined

    let all: { price: number; source: string }[] = []
    if (sr.short_term || sr.medium_term || sr.long_term) {
      for (const tier of [sr.short_term, sr.medium_term, sr.long_term]) {
        all.push(...(tier?.supports ?? []), ...(tier?.resistances ?? []))
      }
    } else {
      const srAny = sr as unknown as { supports?: { price: number; source: string }[]; resistances?: { price: number; source: string }[] }
      all = [...(srAny.supports ?? []), ...(srAny.resistances ?? [])]
    }

    const getTf = (source: string) => {
      const m = source.match(/(15m|1h|4h)/)
      return m ? m[1] : null
    }

    const TFS = ['15m', '1h', '4h'] as const
    const labels: Record<string, { sup: string; res: string }> = {
      '15m': { sup: '支撑(15m)', res: '压力(15m)' },
      '1h':  { sup: '支撑(1h)',  res: '压力(1h)' },
      '4h':  { sup: '支撑(4h)',  res: '压力(4h)' },
    }

    type Pick = { price: number; dist: number }
    const closest: Record<string, { sup: Pick | null; res: Pick | null }> = {}
    for (const tf of TFS) closest[tf] = { sup: null, res: null }

    for (const lv of all) {
      const tf = getTf(lv.source)
      if (!tf) continue
      const dist = Math.abs(lv.price - cp)
      if (lv.price < cp) {
        if (!closest[tf].sup || dist < closest[tf].sup!.dist)
          closest[tf].sup = { price: lv.price, dist }
      } else {
        if (!closest[tf].res || dist < closest[tf].res!.dist)
          closest[tf].res = { price: lv.price, dist }
      }
    }

    const levels: { name: string; price: number; is_resistance: boolean; dist_pct: number }[] = []
    for (const tf of TFS) {
      const c = closest[tf]
      if (c.res) levels.push({ name: labels[tf].res, price: c.res.price, is_resistance: true, dist_pct: ((c.res.price - cp) / cp) * 100 })
      if (c.sup) levels.push({ name: labels[tf].sup, price: c.sup.price, is_resistance: false, dist_pct: ((c.sup.price - cp) / cp) * 100 })
    }
    return levels.length > 0 ? levels : undefined
  }, [radarData])

  // 切换币种时自动拉取挂单 & 关键位数据
  useEffect(() => {
    analyze(selectedCoin).catch(() => {})
  }, [selectedCoin, analyze])

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true)
    await Promise.all([
      refetch(),
      analyze(selectedCoin).catch(() => {}),
    ])
    setIsManualRefreshing(false)
  }, [refetch, analyze, selectedCoin])

  return (
    <div className='flex flex-col space-y-3 h-full'>
      {/* 币种选择器 */}
      <div className='flex items-center gap-2 flex-shrink-0'>
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
            coin={selectedCoin}
            interval={selectedInterval}
            keyLevels={keyLevels}
            currentPrice={radarData?.current_price}
            onIntervalChange={setSelectedInterval}
            onRefresh={handleRefresh}
            refreshing={isManualRefreshing}
          />
        )}
      </div>
    </div>
  )
}
