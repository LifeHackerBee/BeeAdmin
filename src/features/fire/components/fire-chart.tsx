import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SimulationData } from '../types'
import { formatCurrency } from '../utils/calculations'

type FireChartProps = {
  simulationData: SimulationData[]
  fireTarget: number
}

export function FireChart({ simulationData, fireTarget }: FireChartProps) {
  const firePointIndex = simulationData.findIndex((d) => d.isFire)

  const chartData = simulationData.map((d, index) => ({
    age: d.age,
    资产总额: d.assets,
    FIRE目标: fireTarget > 0 ? fireTarget : null,
    isFire: index === firePointIndex,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>资产增长模拟</CardTitle>
        <CardDescription>
          资产增长路径与 FIRE 目标对比
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={400}>
          <LineChart data={chartData}>
            <XAxis
              dataKey='age'
              stroke='#888888'
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke='#888888'
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (value >= 1000000) return (value / 1000000).toFixed(1) + ' M'
                if (value >= 1000) return (value / 1000).toFixed(0) + ' k'
                return value.toString()
              }}
            />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => {
                const displayName = name || ''
                if (value === undefined || value === null) return ['', displayName]
                if (name === '资产总额' || name === 'FIRE目标') {
                  return [formatCurrency(value), displayName]
                }
                return [value, displayName]
              }}
              labelFormatter={(label) => `年龄: ${label} 岁`}
            />
            <Legend />
            <Line
              type='monotone'
              dataKey='资产总额'
              stroke='#38bdf8'
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              type='monotone'
              dataKey='FIRE目标'
              stroke='#4ade80'
              strokeWidth={2}
              strokeDasharray='5 5'
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className='mt-4 space-y-2 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <div className='h-1 w-4 rounded-full bg-sky-400'></div>
            <span>
              <b>资产总额 (蓝色区域):</b> 代表您积极投资下的资产增长路径。
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-1 w-4 border-t-2 border-dashed border-green-400'></div>
            <span>
              <b>FIRE 目标 (绿色虚线):</b> 您的财务自由所需的目标资产总额。
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
