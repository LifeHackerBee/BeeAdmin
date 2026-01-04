import { useState, useEffect } from 'react'
import { useMarketPrices, getPricesForSymbols } from './hooks/use-market-prices'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 主流币种列表
const MAIN_COINS = ['BTC', 'ETH', 'SOL']

// 其他关注的币种
const OTHER_COINS = ['BNB', 'AVAX', 'MATIC', 'ADA', 'DOT', 'LINK', 'UNI', 'ATOM']

interface CoinPriceCardProps {
  symbol: string
  price: number
  isLoading?: boolean
}

function CoinPriceCard({ symbol, price, isLoading }: CoinPriceCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>
            <Skeleton className='h-6 w-20' />
          </CardTitle>
          <CardDescription>
            <Skeleton className='h-4 w-32 mt-2' />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className='h-8 w-40' />
        </CardContent>
      </Card>
    )
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg flex items-center justify-between'>
          <span>{symbol}</span>
          <Badge variant='outline' className='text-xs'>
            实时
          </Badge>
        </CardTitle>
        <CardDescription>
          {symbol === 'BTC' && '比特币'}
          {symbol === 'ETH' && '以太坊'}
          {symbol === 'SOL' && 'Solana'}
          {symbol === 'BNB' && '币安币'}
          {symbol === 'AVAX' && 'Avalanche'}
          {symbol === 'MATIC' && 'Polygon'}
          {symbol === 'ADA' && 'Cardano'}
          {symbol === 'DOT' && 'Polkadot'}
          {symbol === 'LINK' && 'Chainlink'}
          {symbol === 'UNI' && 'Uniswap'}
          {symbol === 'ATOM' && 'Cosmos'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{formatPrice(price)}</div>
      </CardContent>
    </Card>
  )
}

export function Macroscopic() {
  const { prices, loading, error, refetch } = useMarketPrices(5000) // 每5秒刷新一次
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  // 当价格更新时，更新最后更新时间
  useEffect(() => {
    if (Object.keys(prices).length > 0 && !loading) {
      setLastUpdate(new Date())
    }
  }, [prices, loading])

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    await refetch()
    setLastUpdate(new Date())
    setIsManualRefreshing(false)
  }

  const otherCoinPrices = getPricesForSymbols(prices, OTHER_COINS)

  return (
    <div className='flex h-full flex-col space-y-6 overflow-hidden'>
      <div className='flex items-center justify-between flex-shrink-0'>
        <div>
          <h2 className='text-xl font-semibold'>宏观市场</h2>
          <p className='text-sm text-muted-foreground'>
            实时监控主流加密货币价格，数据来自 Hyperliquid
          </p>
        </div>
        <div className='flex items-center gap-4'>
          <div className='text-sm text-muted-foreground'>
            最后更新:{' '}
            {format(lastUpdate, 'HH:mm:ss', { locale: zhCN })}
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

      <div className='flex-1 overflow-auto'>
        {error ? (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : (
          <div className='space-y-6'>
            {/* 主流币种 */}
            <div>
              <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                <TrendingUp className='h-5 w-5' />
                主流币种
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {MAIN_COINS.map((symbol) => (
                  <CoinPriceCard
                    key={symbol}
                    symbol={symbol}
                    price={prices[symbol] || 0}
                    isLoading={loading}
                  />
                ))}
              </div>
            </div>

            {/* 其他关注币种 */}
            {otherCoinPrices.length > 0 && (
              <div>
                <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                  <TrendingDown className='h-5 w-5' />
                  其他关注币种
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                  {otherCoinPrices.map((coin) => (
                    <CoinPriceCard
                      key={coin.symbol}
                      symbol={coin.symbol}
                      price={coin.price}
                      isLoading={loading}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

