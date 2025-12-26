import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type CategoryStatistic } from '../hooks/use-expense-statistics'
import { categories } from '../../expenses/data/data'

type CategoryChartProps = {
  data: CategoryStatistic[]
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

export function CategoryChart({ data }: CategoryChartProps) {
  // 如果没有数据，显示空状态
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>分类支出统计</CardTitle>
          <CardDescription>当前月份各分类支出占比</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-[300px] items-center justify-center text-muted-foreground'>
            暂无数据
          </div>
        </CardContent>
      </Card>
    )
  }

  // 格式化数据，添加分类中文名称
  const chartData = data.map((item) => {
    const category = categories.find((cat) => cat.value === item.category)
    return {
      name: category?.label || item.category,
      value: item.total,
      percentage: item.percentage,
      count: item.count,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>分类支出统计</CardTitle>
        <CardDescription>当前月份各分类支出占比</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx='50%'
              cy='50%'
              labelLine={false}
              label={(entry: any) => {
                const data = chartData.find((d) => d.name === entry.name)
                return data ? `${entry.name}: ${data.percentage.toFixed(1)}%` : entry.name
              }}
              outerRadius={80}
              fill='#8884d8'
              dataKey='value'
            >
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined) => {
                if (value === undefined) return ''
                return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

