import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { useExpenses } from '../../expenses/hooks/use-expenses'
import { format, parseISO } from 'date-fns'
import { Calendar } from 'lucide-react'
import { useExpenseCategories } from '../../expenses/hooks/use-expense-categories'

type CategoryAnalysisProps = {
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
  '#8884D8',
  '#82CA9D',
  '#FFC658',
]

export function CategoryAnalysis({ currency = 'CNY' }: CategoryAnalysisProps) {
  const { data: expenses = [] } = useExpenses()
  const { data: categories = [] } = useExpenseCategories()
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), 'yyyy'))
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'MM'))
  const [analysisType, setAnalysisType] = useState<'month' | 'year'>('month')

  // 获取所有可用的年份和月份
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>()
    expenses.forEach((expense) => {
      if (!expense.spending_time) return
      try {
        const date = parseISO(expense.spending_time)
        yearsSet.add(format(date, 'yyyy'))
      } catch {
        // 忽略无效日期
      }
    })
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a))
  }, [expenses])

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>()
    expenses.forEach((expense) => {
      if (!expense.spending_time) return
      try {
        const date = parseISO(expense.spending_time)
        const year = format(date, 'yyyy')
        if (year === selectedYear) {
          monthsSet.add(format(date, 'MM'))
        }
      } catch {
        // 忽略无效日期
      }
    })
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a))
  }, [expenses, selectedYear])

  // 根据选择的年月过滤数据并计算分类统计
  const categoryStats = useMemo<{ stats: Array<{ category: string; categoryLabel: string; total: number; count: number; percentage: number }>; total: number }>(() => {
    if (!expenses.length) {
      return { stats: [], total: 0 }
    }

    const filteredExpenses = expenses.filter((expense) => {
      if (!expense.spending_time || !expense.amount) return false
      if ((expense.currency || 'CNY') !== currency) return false

      try {
        const date = parseISO(expense.spending_time)
        const expenseYear = format(date, 'yyyy')
        const expenseMonth = format(date, 'MM')

        if (analysisType === 'month') {
          return expenseYear === selectedYear && expenseMonth === selectedMonth
        } else {
          return expenseYear === selectedYear
        }
      } catch {
        return false
      }
    })

    const statsMap = new Map<string, { total: number; count: number }>()

    filteredExpenses.forEach((expense) => {
      if (!expense.category || !expense.amount) return

      const existing = statsMap.get(expense.category) || { total: 0, count: 0 }
      statsMap.set(expense.category, {
        total: existing.total + (expense.amount || 0),
        count: existing.count + 1,
      })
    })

    const total = Array.from(statsMap.values()).reduce((sum, stat) => sum + stat.total, 0)

    const stats = Array.from(statsMap.entries())
      .map(([category, data]) => {
        const categoryInfo = categories.find((cat) => cat.value === category)
        return {
          category,
          categoryLabel: categoryInfo?.label || category,
          total: data.total,
          count: data.count,
          percentage: total > 0 ? (data.total / total) * 100 : 0,
        }
      })
      .sort((a, b) => b.total - a.total)

    return { stats, total }
  }, [expenses, selectedYear, selectedMonth, analysisType, currency, categories])

  const currencySymbols: Record<string, string> = {
    CNY: '¥',
    HKD: 'HK$',
    USD: '$',
  }
  const symbol = currencySymbols[currency] || currency

  // 格式化饼图数据
  const chartData = categoryStats.stats.map((item: { category: string; categoryLabel: string; total: number; count: number; percentage: number }) => ({
    name: item.categoryLabel,
    value: item.total,
    percentage: item.percentage,
    count: item.count,
  }))

  const displayLabel = useMemo(() => {
    if (analysisType === 'month') {
      return `${selectedYear}年${parseInt(selectedMonth)}月`
    }
    return `${selectedYear}年`
  }, [analysisType, selectedYear, selectedMonth])

  // 当年份改变时，如果当前月份不在新年份的可用月份中，重置为第一个可用月份
  useEffect(() => {
    if (analysisType === 'month' && availableMonths.length > 0) {
      if (!availableMonths.includes(selectedMonth)) {
        setSelectedMonth(availableMonths[0])
      }
    }
  }, [selectedYear, availableMonths, analysisType, selectedMonth])

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle>分类统计分析</CardTitle>
            <CardDescription>按年月查看各分类的支出统计</CardDescription>
          </div>
          <div className='flex items-center gap-2'>
            <Calendar className='h-4 w-4 text-muted-foreground' />
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* 选择器 */}
        <div className='flex flex-wrap items-center gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>分析类型：</span>
            <Select value={analysisType} onValueChange={(value: 'month' | 'year') => setAnalysisType(value)}>
              <SelectTrigger className='w-[120px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='month'>按月</SelectItem>
                <SelectItem value='year'>按年</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>年份：</span>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className='w-[120px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {analysisType === 'month' && (
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>月份：</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className='w-[120px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {parseInt(month)}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 统计结果 */}
        {categoryStats.stats.length === 0 ? (
          <div className='flex h-[300px] items-center justify-center text-muted-foreground'>
            {displayLabel} 暂无数据
          </div>
        ) : (
          <div className='space-y-6'>
            {/* 汇总信息 */}
            <div className='rounded-lg border bg-muted/50 p-4'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-muted-foreground'>{displayLabel} 总支出</span>
                <span className='text-2xl font-bold text-red-600'>
                  {symbol}
                  {categoryStats.total.toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* 饼图 */}
            <div>
              <h3 className='mb-4 text-sm font-medium'>分类占比</h3>
              <ResponsiveContainer width='100%' height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    label={(props: any) => {
                      const name = props.name || ''
                      const data = chartData.find((d: { name: string; percentage: number }) => d.name === name)
                      return data ? `${name}: ${data.percentage.toFixed(1)}%` : name
                    }}
                    outerRadius={80}
                    fill='#8884d8'
                    dataKey='value'
                  >
                    {chartData.map((_entry: { name: string }, index: number) => (
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
            </div>

            {/* 分类明细表格 */}
            <div>
              <h3 className='mb-4 text-sm font-medium'>分类明细</h3>
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
                    {categoryStats.stats.map((item: { category: string; categoryLabel: string; total: number; count: number; percentage: number }, index: number) => (
                      <TableRow key={item.category}>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            <div
                              className='h-3 w-3 rounded-full'
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            {item.categoryLabel}
                          </div>
                        </TableCell>
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
                          {item.percentage.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

