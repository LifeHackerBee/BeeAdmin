import { useState, useEffect } from 'react'
import { useMarketPrices } from './hooks/use-market-prices'
import { usePriceChanges, type TimeFrame } from './hooks/use-price-changes'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// 所有币种列表
const ALL_COINS = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'MATIC', 'ADA', 'DOT', 'LINK', 'UNI', 'ATOM']

const getCoinName = (symbol: string) => {
  const names: Record<string, string> = {
    BTC: '比特币',
    ETH: '以太坊',
    SOL: 'Solana',
    BNB: '币安币',
    AVAX: 'Avalanche',
    MATIC: 'Polygon',
    ADA: 'Cardano',
    DOT: 'Polkadot',
    LINK: 'Chainlink',
    UNI: 'Uniswap',
    ATOM: 'Cosmos',
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

export function Macroscopic() {
  const { prices, loading, error, refetch } = useMarketPrices(5000) // 每5秒刷新一次
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('15m')

  // 获取所有币种的价格变化（每10秒刷新一次）
  const { priceChanges, loading: changesLoading, refetch: refetchChanges } = usePriceChanges(ALL_COINS, timeFrame, 10000)

  // 当价格更新时，更新最后更新时间
  useEffect(() => {
    if (Object.keys(prices).length > 0 && !loading) {
      setLastUpdate(new Date())
    }
  }, [prices, loading])

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    await Promise.all([refetch(), refetchChanges()])
    setLastUpdate(new Date())
    setIsManualRefreshing(false)
  }

  return (
    <div className='flex flex-col space-y-4 h-full'>
      <div className='flex items-center justify-between flex-shrink-0'>
        <div className='flex items-center gap-4'>
          <div className='text-sm text-muted-foreground'>
            最后更新:{' '}
            <span className='font-medium text-foreground'>
              {format(lastUpdate, 'HH:mm:ss', { locale: zhCN })}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-sm text-muted-foreground'>趋势:</span>
            <Select value={timeFrame} onValueChange={(value) => setTimeFrame(value as TimeFrame)}>
              <SelectTrigger className='w-[110px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='15m'>15分钟</SelectItem>
                <SelectItem value='1h'>1小时</SelectItem>
                <SelectItem value='4h'>4小时</SelectItem>
                <SelectItem value='24h'>24小时</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={handleManualRefresh}
            disabled={isManualRefreshing || loading}
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
                  <TableHead className='w-[100px]'>币种</TableHead>
                  <TableHead className='w-[150px]'>名称</TableHead>
                  <TableHead className='text-right w-[150px]'>价格</TableHead>
                  <TableHead className='text-right w-[120px]'>涨跌幅</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || changesLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className='text-center text-muted-foreground'>
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : (
                  ALL_COINS.map((symbol) => {
                    const price = prices[symbol] || 0
                    const priceChange = priceChanges[symbol]
                    const isPositive = priceChange && priceChange.changePercent > 0
                    const isNegative = priceChange && priceChange.changePercent < 0
                    const changeColor = isPositive 
                      ? 'text-green-600 dark:text-green-400' 
                      : isNegative 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-muted-foreground'

                    return (
                      <TableRow key={symbol} className='hover:bg-muted/50'>
                        <TableCell className='font-semibold'>{symbol}</TableCell>
                        <TableCell className='text-muted-foreground'>{getCoinName(symbol)}</TableCell>
                        <TableCell className='text-right font-mono font-medium'>
                          {price > 0 ? formatPrice(price) : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${changeColor}`}>
                          {priceChange ? (
                            <div className='flex items-center justify-end gap-1'>
                              {isPositive && <ArrowUp className='h-3 w-3' />}
                              {isNegative && <ArrowDown className='h-3 w-3' />}
                              <span>
                                {isPositive && '+'}
                                {priceChange.changePercent.toFixed(2)}%
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
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

