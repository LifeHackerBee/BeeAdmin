import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExchangeRates } from '../hooks/use-exchange-rates'
import { currencies } from '../../expenses/data/data'
import { Loader2, ArrowRightLeft, RefreshCw } from 'lucide-react'

export function ExchangeRateConverter() {
  const [amount, setAmount] = useState<string>('100')
  const [fromCurrency, setFromCurrency] = useState<string>('CNY')
  const [toCurrency, setToCurrency] = useState<string>('USD')

  // 使用 fromCurrency 作为基础货币，这样转换更直接
  const { data: exchangeRates, isLoading, error, refetch } = useExchangeRates(fromCurrency)

  // 计算转换后的金额
  const convertedAmount = useMemo(() => {
    if (!exchangeRates || !amount) return null

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount)) return null

    try {
      // exchangeRates.base 应该是 fromCurrency（因为我们用 fromCurrency 作为基础货币请求）
      if (exchangeRates.base === fromCurrency) {
        const rate = exchangeRates.rates[toCurrency]
        if (rate) {
          return numAmount * rate
        }
      }
    } catch (e) {
      console.error('Currency conversion error:', e)
    }

    return null
  }, [amount, fromCurrency, toCurrency, exchangeRates])

  // 获取当前汇率
  const currentRate = useMemo(() => {
    if (!exchangeRates) return null

    // exchangeRates.base 应该是 fromCurrency
    if (exchangeRates.base === fromCurrency) {
      return exchangeRates.rates[toCurrency] || null
    }

    return null
  }, [fromCurrency, toCurrency, exchangeRates])

  const handleSwap = () => {
    const temp = fromCurrency
    setFromCurrency(toCurrency)
    setToCurrency(temp)
    // 交换后会自动重新获取汇率（因为 fromCurrency 改变了）
  }

  const handleRefresh = () => {
    refetch()
  }

  const formatCurrency = (value: number | null, currency: string): string => {
    if (value === null || isNaN(value)) return '-'
    
    const currencySymbols: Record<string, string> = {
      CNY: '¥',
      HKD: 'HK$',
      USD: '$',
    }

    const symbol = currencySymbols[currency] || currency
    return `${symbol}${value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle>汇率转换</CardTitle>
            <CardDescription>
              {exchangeRates?.date
                ? `汇率更新时间: ${exchangeRates.date}`
                : '实时汇率转换'}
            </CardDescription>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {error ? (
          <div className='text-destructive text-sm'>
            获取汇率失败: {error instanceof Error ? error.message : '未知错误'}
          </div>
        ) : (
          <>
            <div className='flex items-center gap-4'>
              <div className='flex-1 space-y-2'>
                <label className='text-sm text-muted-foreground'>金额</label>
                <Input
                  type='number'
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder='请输入金额'
                  className='text-lg'
                />
              </div>
              <div className='flex-1 space-y-2'>
                <label className='text-sm text-muted-foreground'>从</label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant='outline'
                size='icon'
                onClick={handleSwap}
                className='mt-6'
              >
                <ArrowRightLeft className='h-4 w-4' />
              </Button>
              <div className='flex-1 space-y-2'>
                <label className='text-sm text-muted-foreground'>到</label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className='flex items-center justify-center py-8'>
                <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                <span className='ml-2 text-muted-foreground'>加载汇率中...</span>
              </div>
            ) : (
              <div className='space-y-4 rounded-lg border bg-muted/50 p-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>转换结果</span>
                  {currentRate && (
                    <span className='text-xs text-muted-foreground'>
                      汇率: 1 {fromCurrency} = {currentRate.toFixed(4)} {toCurrency}
                    </span>
                  )}
                </div>
                <div className='text-3xl font-bold'>
                  {formatCurrency(convertedAmount, toCurrency)}
                </div>
                <div className='text-sm text-muted-foreground'>
                  {formatCurrency(parseFloat(amount) || 0, fromCurrency)} ={' '}
                  {formatCurrency(convertedAmount, toCurrency)}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

