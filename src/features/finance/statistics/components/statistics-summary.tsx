import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign } from 'lucide-react'

type StatisticsSummaryProps = {
  total: number
  avgMonthly: number
  monthCount: number
  byCurrency: Record<string, { total: number; count: number }>
}

export function StatisticsSummary({
  avgMonthly,
  monthCount,
  byCurrency,
}: StatisticsSummaryProps) {
  const currencySymbols: Record<string, string> = {
    CNY: '¥',
    HKD: 'HK$',
    USD: '$',
  }

  return (
    <div className='grid gap-4 sm:grid-cols-2'>
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

