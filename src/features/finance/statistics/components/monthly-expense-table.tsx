import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type MonthlyStatistic } from '../hooks/use-expense-statistics'

type MonthlyExpenseTableProps = {
  data: MonthlyStatistic[]
  currency?: string
}

export function MonthlyExpenseTable({ data, currency = 'CNY' }: MonthlyExpenseTableProps) {
  // 过滤指定币种的数据
  const filteredData = data.filter((item) => item.currency === currency)

  // 格式化数据供图表使用
  const chartData = filteredData
    .map((item) => ({
      name: item.monthLabel,
      month: item.month,
      金额: item.total,
      笔数: item.count,
    }))
    .reverse() // 折线图按时间顺序显示

  // 表格数据（按时间倒序）
  const tableData = [...filteredData].reverse()

  const currencySymbols: Record<string, string> = {
    CNY: '¥',
    HKD: 'HK$',
    USD: '$',
  }
  const symbol = currencySymbols[currency] || currency

  if (filteredData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>月度支出明细</CardTitle>
          <CardDescription>按月份查看支出详情（{currency}）</CardDescription>
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
        <CardTitle>月度支出明细</CardTitle>
        <CardDescription>按月份查看支出详情和趋势（{currency}）</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue='table' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='table'>表格</TabsTrigger>
            <TabsTrigger value='chart'>折线图</TabsTrigger>
          </TabsList>

          <TabsContent value='table' className='space-y-4'>
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月份</TableHead>
                    <TableHead className='text-right'>支出金额</TableHead>
                    <TableHead className='text-right'>笔数</TableHead>
                    <TableHead className='text-right'>平均每笔</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((item) => {
                    const avgPerItem = item.count > 0 ? item.total / item.count : 0
                    return (
                      <TableRow key={item.month}>
                        <TableCell className='font-medium'>{item.monthLabel}</TableCell>
                        <TableCell className='text-right font-semibold text-red-600'>
                          {symbol}
                          {item.total.toLocaleString('zh-CN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className='text-right text-muted-foreground'>
                          {item.count}
                        </TableCell>
                        <TableCell className='text-right text-muted-foreground'>
                          {symbol}
                          {avgPerItem.toLocaleString('zh-CN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value='chart' className='space-y-4'>
            <ResponsiveContainer width='100%' height={400}>
              <LineChart data={chartData}>
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
                    if (value === undefined) return ['', name || '']
                    if (name === '金额') {
                      return [
                        `${symbol}${value.toLocaleString('zh-CN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`,
                        '金额',
                      ]
                    }
                    return [value, name]
                  }}
                  labelFormatter={(label) => `月份: ${label}`}
                />
                <Legend />
                <Line
                  type='monotone'
                  dataKey='金额'
                  stroke='hsl(var(--primary))'
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

