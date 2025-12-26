import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useExchangeRates } from '../../exchange-rate/hooks/use-exchange-rates'
import { useExpenses } from '../../expenses/hooks/use-expenses'
import { Loader2 } from 'lucide-react'

export function ExchangeRateSummary() {
  const { data: expenses = [] } = useExpenses()
  const baseCurrency = 'CNY' // 默认使用人民币
  const { data: exchangeRates, isLoading, error } = useExchangeRates(baseCurrency)

  // 按币种分组统计
  const statsByCurrency = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {}

    expenses.forEach((expense) => {
      if (!expense.currency || !expense.amount) return

      const currency = expense.currency
      if (!stats[currency]) {
        stats[currency] = { total: 0, count: 0 }
      }

      stats[currency].total += expense.amount
      stats[currency].count += 1
    })

    return stats
  }, [expenses])

  // 转换为统一币种
  const convertedTotal = useMemo(() => {
    if (!exchangeRates) return null

    let totalConverted = 0

    Object.entries(statsByCurrency).forEach(([currency, { total }]) => {
      if (currency === baseCurrency) {
        // 已经是目标币种，直接使用
        totalConverted += total
      } else {
        // 需要转换：exchangeRates.base 应该是 baseCurrency
        if (exchangeRates.base === baseCurrency) {
          const rate = exchangeRates.rates[currency]
          if (rate) {
            // 从 currency 转换到 baseCurrency: currency_amount / rate = baseCurrency_amount
            totalConverted += total / rate
          }
        }
      }
    })

    return totalConverted
  }, [statsByCurrency, exchangeRates, baseCurrency])

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
        <div>
          <CardTitle>总支出（汇率换算）</CardTitle>
          <CardDescription>
            {exchangeRates?.date
              ? `基于 ${exchangeRates.date} 的汇率，统一换算为人民币（CNY）`
              : '实时汇率换算，统一换算为人民币（CNY）'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className='text-destructive text-sm'>
            获取汇率失败: {error instanceof Error ? error.message : '未知错误'}
          </div>
        ) : isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            <span className='ml-2 text-muted-foreground'>加载汇率中...</span>
          </div>
        ) : convertedTotal !== null ? (
          <div className='space-y-4'>
            <div className='rounded-lg border bg-muted/50 p-6'>
              <div className='text-sm text-muted-foreground mb-2'>换算后总支出</div>
              <div className='text-4xl font-bold text-red-600'>
                {formatCurrency(convertedTotal, baseCurrency)}
              </div>
            </div>

            <div className='space-y-2'>
              <div className='text-sm font-medium text-muted-foreground'>各币种原始金额</div>
              {Object.entries(statsByCurrency).map(([currency, { total, count }]) => (
                <div
                  key={currency}
                  className='flex items-center justify-between rounded-md border p-3'
                >
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{currency}</span>
                    <span className='text-sm text-muted-foreground'>({count} 笔)</span>
                  </div>
                  <div className='font-medium'>
                    {formatCurrency(total, currency)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className='text-muted-foreground text-sm'>暂无数据</div>
        )}
      </CardContent>
    </Card>
  )
}

