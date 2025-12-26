import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, Receipt, Calendar } from 'lucide-react'

type StatisticsSummaryProps = {
  total: number
  count: number
  avg: number
  avgMonthly: number
  monthCount: number
  byCurrency: Record<string, { total: number; count: number }>
}

export function StatisticsSummary({
  count,
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
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <Card className='sm:col-span-2 lg:col-span-1'>
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
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{currency}</span>
                    <span className='text-xs text-muted-foreground'>({data.count} 笔)</span>
                  </div>
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
          <p className='text-xs text-muted-foreground mt-3'>
            共 {count} 笔记录
          </p>
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

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>总笔数</CardTitle>
          <Receipt className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{count}</div>
          <p className='text-xs text-muted-foreground mt-1'>
            记账记录总数
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>币种数量</CardTitle>
          <Calendar className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{Object.keys(byCurrency).length}</div>
          <p className='text-xs text-muted-foreground mt-1'>
            {Object.keys(byCurrency).join(', ')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

