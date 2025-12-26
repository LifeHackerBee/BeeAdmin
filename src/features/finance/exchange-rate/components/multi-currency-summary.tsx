import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExchangeRates } from '../hooks/use-exchange-rates'
import { useExpenses } from '../../expenses/hooks/use-expenses'
import { currencies } from '../../expenses/data/data'
import { Loader2 } from 'lucide-react'

type MultiCurrencySummaryProps = {
  baseCurrency: string
  onBaseCurrencyChange: (currency: string) => void
}

export function MultiCurrencySummary({
  baseCurrency,
  onBaseCurrencyChange,
}: MultiCurrencySummaryProps) {
  const { data: expenses = [] } = useExpenses()
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
  const convertedStats = useMemo(() => {
    if (!exchangeRates) return null

    let totalConverted = 0
    const convertedByCurrency: Record<string, number> = {}

    Object.entries(statsByCurrency).forEach(([currency, { total }]) => {
      if (currency === baseCurrency) {
        // 已经是目标币种，直接使用
        convertedByCurrency[currency] = total
        totalConverted += total
      } else {
        // 需要转换：exchangeRates.base 应该是 baseCurrency（因为我们用 baseCurrency 作为基础货币请求）
        if (exchangeRates.base === baseCurrency) {
          const rate = exchangeRates.rates[currency]
          if (rate) {
            // 从 currency 转换到 baseCurrency: currency_amount / rate = baseCurrency_amount
            const converted = total / rate
            convertedByCurrency[currency] = converted
            totalConverted += converted
          }
        }
      }
    })

    return {
      total: totalConverted,
      byCurrency: convertedByCurrency,
    }
  }, [statsByCurrency, exchangeRates, baseCurrency])

  const formatCurrency = (value: number, currency: string): string => {
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
            <CardTitle>多币种汇总</CardTitle>
            <CardDescription>将所有币种转换为统一币种显示</CardDescription>
          </div>
          <Select value={baseCurrency} onValueChange={onBaseCurrencyChange}>
            <SelectTrigger className='w-[120px]'>
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
        ) : convertedStats ? (
          <div className='space-y-3'>
            <div className='text-sm font-medium mb-2'>各币种支出明细</div>
            {Object.entries(statsByCurrency).map(([currency, { total, count }]) => {
              const converted = convertedStats.byCurrency[currency] || 0
              return (
                <div
                  key={currency}
                  className='flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors'
                >
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium text-base'>{currency}</span>
                      <span className='text-sm text-muted-foreground'>
                        ({count} 笔)
                      </span>
                    </div>
                    <div className='text-sm text-muted-foreground mt-1'>
                      原始: {formatCurrency(total, currency)}
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='font-semibold text-lg'>
                      {formatCurrency(converted, baseCurrency)}
                    </div>
                    {currency !== baseCurrency && exchangeRates && (
                      <div className='text-xs text-muted-foreground mt-1'>
                        {(() => {
                          // exchangeRates.base 应该是 baseCurrency
                          if (exchangeRates.base === baseCurrency) {
                            const rate = exchangeRates.rates[currency]
                            if (rate) {
                              return `1 ${currency} = ${(1 / rate).toFixed(4)} ${baseCurrency}`
                            }
                          }
                          return '-'
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div className='mt-4 pt-4 border-t'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-muted-foreground'>总计（{baseCurrency}）</span>
                <span className='text-2xl font-bold text-red-600'>
                  {formatCurrency(convertedStats.total, baseCurrency)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className='text-muted-foreground text-sm'>暂无数据</div>
        )}
      </CardContent>
    </Card>
  )
}

