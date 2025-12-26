import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Bar,
  BarChart,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type MonthlyStatistic, type CategoryStatistic } from '../hooks/use-expense-statistics'
import { categories } from '../../expenses/data/data'

type ExpenseDetailsProps = {
  monthlyData: MonthlyStatistic[]
  categoryData: CategoryStatistic[]
  currency?: string
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#FFC658',
  '#FF7C7C',
]

export function ExpenseDetails({
  monthlyData,
  categoryData,
  currency = 'CNY',
}: ExpenseDetailsProps) {
  // 过滤指定币种的月度数据
  const filteredMonthlyData = monthlyData.filter((item) => item.currency === currency)

  // 格式化月度数据供图表使用（按时间正序排列）
  const monthlyChartData = [...filteredMonthlyData]
    .sort((a, b) => a.month.localeCompare(b.month)) // 按月份正序排列
    .map((item) => ({
      name: item.monthLabel,
      month: item.month,
      金额: item.total,
      笔数: item.count,
    }))

  // 表格数据（按时间倒序，最新的在前）
  const tableData = [...filteredMonthlyData].sort((a, b) => b.month.localeCompare(a.month))

  // 格式化分类数据
  const categoryChartData =
    categoryData.length > 0
      ? categoryData.map((item) => {
          const category = categories.find((cat) => cat.value === item.category)
          return {
            name: category?.label || item.category,
            value: item.total,
            percentage: item.percentage,
            count: item.count,
          }
        })
      : []

  const currencySymbols: Record<string, string> = {
    CNY: '¥',
    HKD: 'HK$',
    USD: '$',
  }
  const symbol = currencySymbols[currency] || currency

  const hasMonthlyData = filteredMonthlyData.length > 0
  const hasCategoryData = categoryData.length > 0

  if (!hasMonthlyData && !hasCategoryData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>支出明细与分类统计</CardTitle>
          <CardDescription>查看月度支出明细和分类统计（{currency}）</CardDescription>
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
        <CardTitle>支出明细与分类统计</CardTitle>
        <CardDescription>查看月度支出明细和分类统计（{currency}）</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue='monthly-table' className='space-y-4'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='monthly-table'>月度明细</TabsTrigger>
            <TabsTrigger value='monthly-chart'>月度趋势</TabsTrigger>
            <TabsTrigger value='category'>分类统计</TabsTrigger>
          </TabsList>

          {/* 月度明细表格 */}
          <TabsContent value='monthly-table' className='space-y-4'>
            {hasMonthlyData ? (
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
            ) : (
              <div className='flex h-[300px] items-center justify-center text-muted-foreground'>
                暂无月度数据
              </div>
            )}
          </TabsContent>

          {/* 月度趋势柱状图 */}
          <TabsContent value='monthly-chart' className='space-y-4'>
            {hasMonthlyData ? (
              <ResponsiveContainer width='100%' height={400}>
                <BarChart data={monthlyChartData}>
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
                  <Bar
                    dataKey='金额'
                    fill='hsl(var(--primary))'
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className='flex h-[300px] items-center justify-center text-muted-foreground'>
                暂无月度数据
              </div>
            )}
          </TabsContent>

          {/* 分类统计饼图 */}
          <TabsContent value='category' className='space-y-4'>
            {hasCategoryData ? (
              <div className='space-y-4'>
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx='50%'
                      cy='50%'
                      labelLine={false}
                      label={(entry: any) => {
                        const data = categoryChartData.find((d) => d.name === entry.name)
                        return data ? `${entry.name}: ${data.percentage.toFixed(1)}%` : entry.name
                      }}
                      outerRadius={80}
                      fill='#8884d8'
                      dataKey='value'
                    >
                      {categoryChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined) => {
                        if (value === undefined) return ''
                        return `${symbol}${value.toLocaleString('zh-CN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                {/* 分类明细表格 */}
                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>分类</TableHead>
                        <TableHead className='text-right'>支出金额</TableHead>
                        <TableHead className='text-right'>笔数</TableHead>
                        <TableHead className='text-right'>占比</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryChartData.map((item, index) => (
                        <TableRow key={item.name}>
                          <TableCell className='font-medium'>
                            <div className='flex items-center gap-2'>
                              <div
                                className='h-3 w-3 rounded-full'
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              {item.name}
                            </div>
                          </TableCell>
                          <TableCell className='text-right font-semibold text-red-600'>
                            {symbol}
                            {item.value.toLocaleString('zh-CN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className='text-right text-muted-foreground'>
                            {item.count}
                          </TableCell>
                          <TableCell className='text-right text-muted-foreground'>
                            {item.percentage.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className='flex h-[300px] items-center justify-center text-muted-foreground'>
                暂无分类数据
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

