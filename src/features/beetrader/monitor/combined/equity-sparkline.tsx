import { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export type EquityPoint = { t: number; v: number }

interface EquitySparklineProps {
  data: EquityPoint[]
  width?: number
  height?: number
  positive?: boolean
}

export function EquitySparkline({ data, width = 80, height = 28, positive }: EquitySparklineProps) {
  const chartData = useMemo(() => data.map((p) => ({ v: p.v })), [data])
  const color = positive === undefined ? 'hsl(var(--chart-1))' : positive ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)'

  if (chartData.length < 2) return null

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line type='monotone' dataKey='v' stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
