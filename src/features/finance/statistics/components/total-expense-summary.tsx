import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, Loader2 } from 'lucide-react'
import { useExchangeRates } from '../../exchange-rate/hooks/use-exchange-rates'

type TotalExpenseSummaryProps = {
  avgMonthly: number
  monthCount: number
  byCurrency: Record<string, { total: number; count: number }>
}

export function TotalExpenseSummary({
  avgMonthly,
  monthCount,
  byCurrency,
}: TotalExpenseSummaryProps) {
  const baseCurrency = 'CNY' // 默认使用人民币
  const { data: exchangeRates, isLoading: isLoadingRates, error: rateError } =
    useExchangeRates(baseCurrency)

  const currencySymbols: Record<string, string> = {
    CNY: '¥',
    HKD: 'HK$',
    USD: '$',
  }

  // 转换为统一币种
  const convertedTotal = useMemo(() => {
    if (!exchangeRates) return null

    let totalConverted = 0

    Object.entries(byCurrency).forEach(([currency, { total }]) => {
      if (currency === baseCurrency) {
        totalConverted += total
      } else {
        if (exchangeRates.base === baseCurrency) {
          const rate = exchangeRates.rates[currency]
          if (rate) {
            totalConverted += total / rate
          }
        }
      }
    })

    return totalConverted
  }, [byCurrency, exchangeRates, baseCurrency])

  const formatCurrency = (value: number | null, currency: string): string => {
    if (value === null || isNaN(value)) return '-'

    const symbol = currencySymbols[currency] || currency
    return `${symbol}${value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return (
    <div className='grid gap-4 sm:grid-cols-3'>
      {/* 总支出（各币种） */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>总支出</CardTitle>
          <DollarSign className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            {Object.entries(byCurrency).map(([currency, data]) => {
              const symbol = currencySymbols[currency] || currency
              return (
                <div
                  key={currency}
                  className='flex items-center justify-between rounded-md border p-2 hover:bg-muted/50 transition-colors'
                >
                  <span className='font-medium'>{currency}</span>
                  <div className='font-semibold text-red-600'>
                    {symbol}
                    {data.total.toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 总支出（汇率换算） */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>总支出（汇率换算）</CardTitle>
          <DollarSign className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          {rateError ? (
            <div className='text-destructive text-sm'>
              获取汇率失败: {rateError instanceof Error ? rateError.message : '未知错误'}
            </div>
          ) : isLoadingRates ? (
            <div className='flex items-center justify-center py-4'>
              <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
              <span className='ml-2 text-xs text-muted-foreground'>加载汇率中...</span>
            </div>
          ) : convertedTotal !== null ? (
            <div className='space-y-2'>
              <div className='text-2xl font-bold text-red-600'>
                {formatCurrency(convertedTotal, baseCurrency)}
              </div>
              <p className='text-xs text-muted-foreground'>
                {exchangeRates?.date
                  ? `基于 ${exchangeRates.date} 的汇率`
                  : '实时汇率换算'}
              </p>
            </div>
          ) : (
            <div className='text-muted-foreground text-sm'>暂无数据</div>
          )}
        </CardContent>
      </Card>

      {/* 平均每月支出 */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>平均每月支出</CardTitle>
          <TrendingUp className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            ¥{avgMonthly.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className='text-xs text-muted-foreground mt-1'>
            共 {monthCount} 个月有记录
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

