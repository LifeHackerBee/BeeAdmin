import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type MonthlyStatistic } from '../hooks/use-expense-statistics'

type MonthlyChartProps = {
  data: MonthlyStatistic[]
  currency?: string
}

export function MonthlyChart({ data, currency = 'CNY' }: MonthlyChartProps) {
  // 过滤指定币种的数据
  const filteredData = data.filter((item) => item.currency === currency)

  // 格式化数据供图表使用
  const chartData = filteredData.map((item) => ({
    name: item.monthLabel,
    month: item.month,
    金额: item.total,
    笔数: item.count,
  }))

  // 如果没有数据，显示空状态
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>月度支出统计</CardTitle>
          <CardDescription>按月份统计支出金额</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-[300px] items-center justify-center text-muted-foreground'>
            暂无数据
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>月度支出统计</CardTitle>
        <CardDescription>按月份统计支出金额（{currency}）</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={300}>
          <BarChart data={chartData}>
            <XAxis
              dataKey='name'
              stroke='#888888'
              fontSize={12}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor='end'
              height={80}
            />
            <YAxis
              stroke='#888888'
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (value >= 10000) {
                  return `${(value / 10000).toFixed(1)}万`
                }
                return value.toString()
              }}
            />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => {
                const displayName = name || ''
                if (value === undefined) return ['', displayName]
                if (name === '金额') {
                  return [`¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '金额']
                }
                return [value, displayName]
              }}
            />
            <Legend />
            <Bar
              dataKey='金额'
              fill='currentColor'
              className='fill-primary'
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

