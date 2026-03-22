import { useState, useEffect } from 'react'
import { useMarketPrices } from './hooks/use-market-prices'
import { usePriceChanges } from './hooks/use-price-changes'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// 观察目标
const ALL_COINS = ['BTC', 'ETH', 'SOL', 'xyz:GOLD', 'xyz:BRENTOIL', 'xyz:SILVER']

const getCoinName = (symbol: string) => {
  const names: Record<string, string> = {
    BTC: '比特币',
    ETH: '以太坊',
    SOL: 'Solana',
    'xyz:GOLD': '黄金',
    'xyz:BRENTOIL': '布伦特原油',
    'xyz:SILVER': '白银',
  }
  return names[symbol] || symbol
}

const formatPrice = (p: number) => {
  if (p >= 1000) {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(p)
  } else if (p >= 1) {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(p)
  } else {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 8,
    }).format(p)
  }
}

function ChangeCell({ value }: { value: number | undefined }) {
  if (value == null) return <span className='text-muted-foreground/40'>-</span>
  const color = value > 0
    ? 'text-green-600 dark:text-green-400'
    : value < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground'
  return (
    <span className={`font-medium tabular-nums ${color}`}>
      {value > 0 ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

export function Macroscopic() {
  const { prices, loading, error, refetch } = useMarketPrices(5000, ALL_COINS)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  // 4 个时间周期并行获取
  const c15m = usePriceChanges(ALL_COINS, '15m', 15000)
  const c1h  = usePriceChanges(ALL_COINS, '1h',  30000)
  const c4h  = usePriceChanges(ALL_COINS, '4h',  60000)
  const c1d  = usePriceChanges(ALL_COINS, '24h', 60000)

  const allLoading = loading || c15m.loading || c1h.loading || c4h.loading || c1d.loading

  useEffect(() => {
    if (Object.keys(prices).length > 0 && !loading) {
      setLastUpdate(new Date())
    }
  }, [prices, loading])

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    await Promise.all([refetch(), c15m.refetch(), c1h.refetch(), c4h.refetch(), c1d.refetch()])
    setLastUpdate(new Date())
    setIsManualRefreshing(false)
  }

  return (
    <div className='flex flex-col space-y-3 h-full'>
      <div className='flex items-center justify-between flex-shrink-0'>
        <div className='flex items-center gap-4'>
          <div className='text-sm text-muted-foreground'>
            最后更新:{' '}
            <span className='font-medium text-foreground'>
              {format(lastUpdate, 'HH:mm:ss', { locale: zhCN })}
            </span>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={handleManualRefresh}
            disabled={isManualRefreshing || allLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isManualRefreshing ? 'animate-spin' : ''}`}
            />
            刷新
          </Button>
        </div>
      </div>

      <div className='flex-1 overflow-auto min-h-0'>
        {error ? (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : (
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[80px]'>币种</TableHead>
                  <TableHead className='w-[100px]'>名称</TableHead>
                  <TableHead className='text-right w-[120px]'>价格</TableHead>
                  <TableHead className='text-right w-[80px]'>15m</TableHead>
                  <TableHead className='text-right w-[80px]'>1H</TableHead>
                  <TableHead className='text-right w-[80px]'>4H</TableHead>
                  <TableHead className='text-right w-[80px]'>1D</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className='text-center text-muted-foreground'>
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : (
                  ALL_COINS.map((symbol) => {
                    const price = prices[symbol] || prices[symbol.replace('xyz:', '')] || 0

                    return (
                      <TableRow key={symbol} className='hover:bg-muted/50'>
                        <TableCell className='font-semibold text-xs'>{symbol.replace('xyz:', '')}</TableCell>
                        <TableCell className='text-muted-foreground text-xs'>{getCoinName(symbol)}</TableCell>
                        <TableCell className='text-right font-mono font-medium text-xs'>
                          {price > 0 ? formatPrice(price) : '-'}
                        </TableCell>
                        <TableCell className='text-right text-xs'>
                          <ChangeCell value={c15m.priceChanges[symbol]?.changePercent} />
                        </TableCell>
                        <TableCell className='text-right text-xs'>
                          <ChangeCell value={c1h.priceChanges[symbol]?.changePercent} />
                        </TableCell>
                        <TableCell className='text-right text-xs'>
                          <ChangeCell value={c4h.priceChanges[symbol]?.changePercent} />
                        </TableCell>
                        <TableCell className='text-right text-xs'>
                          <ChangeCell value={c1d.priceChanges[symbol]?.changePercent} />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
