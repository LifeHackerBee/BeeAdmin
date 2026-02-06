import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { WalletAddressCell } from '../../components/wallet-address-cell'

export type EquityPoint = { t: number; v: number }

export interface EquityCurveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  address: string
  currentEquity: number
  day: EquityPoint[]
  threeDay: EquityPoint[]
}

function formatEquity(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function EquityCurveDialog({
  open,
  onOpenChange,
  address,
  currentEquity,
  day,
  threeDay,
}: EquityCurveDialogProps) {
  const dayChartData = day.map((p) => ({
    time: format(new Date(p.t), 'HH:mm', { locale: zhCN }),
    fullTime: format(new Date(p.t), 'yyyy-MM-dd HH:mm', { locale: zhCN }),
    equity: p.v,
  }))

  const threeDayChartData = threeDay.map((p) => ({
    time: format(new Date(p.t), 'MM-dd HH:mm', { locale: zhCN }),
    fullTime: format(new Date(p.t), 'yyyy-MM-dd HH:mm', { locale: zhCN }),
    equity: p.v,
  }))

  const dayStart = day.length > 0 ? day[0].v : 0
  const dayChange = day.length > 1 ? currentEquity - dayStart : 0
  const dayChangePct = dayStart > 0 ? (dayChange / dayStart) * 100 : 0

  const threeDayStart = threeDay.length > 0 ? threeDay[0].v : 0
  const threeDayChange = threeDay.length > 1 ? currentEquity - threeDayStart : 0
  const threeDayChangePct = threeDayStart > 0 ? (threeDayChange / threeDayStart) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Equity 曲线</DialogTitle>
          <DialogDescription>
            <WalletAddressCell address={address} />
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-6'>
          <div className='grid grid-cols-3 gap-4 text-sm'>
            <div className='rounded-lg border p-3'>
              <div className='text-muted-foreground'>当前 Equity</div>
              <div className='text-lg font-semibold'>{formatEquity(currentEquity)}</div>
            </div>
            <div className='rounded-lg border p-3'>
              <div className='text-muted-foreground'>24h 变化</div>
              <div className={`text-lg font-semibold ${dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dayChange >= 0 ? '+' : ''}{formatEquity(dayChange)} ({dayChangePct >= 0 ? '+' : ''}{dayChangePct.toFixed(2)}%)
              </div>
            </div>
            <div className='rounded-lg border p-3'>
              <div className='text-muted-foreground'>3天 变化</div>
              <div className={`text-lg font-semibold ${threeDayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {threeDayChange >= 0 ? '+' : ''}{formatEquity(threeDayChange)} ({threeDayChangePct >= 0 ? '+' : ''}{threeDayChangePct.toFixed(2)}%)
              </div>
            </div>
          </div>

          {dayChartData.length > 0 && (
            <div>
              <h4 className='mb-2 text-sm font-medium'>24 小时 Equity 曲线</h4>
              <ResponsiveContainer width='100%' height={220}>
                <LineChart data={dayChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey='time' tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div className='rounded border bg-background px-2 py-1 text-xs'>
                          {payload[0].payload?.fullTime} — {formatEquity(Number(payload[0].value))}
                        </div>
                      ) : null
                    }
                  />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey='equity'
                    name='Equity (USDC)'
                    stroke='hsl(var(--chart-1))'
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {threeDayChartData.length > 0 && (
            <div>
              <h4 className='mb-2 text-sm font-medium'>3 天 Equity 曲线</h4>
              <ResponsiveContainer width='100%' height={220}>
                <LineChart data={threeDayChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey='time' tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div className='rounded border bg-background px-2 py-1 text-xs'>
                          {payload[0].payload?.fullTime} — {formatEquity(Number(payload[0].value))}
                        </div>
                      ) : null
                    }
                  />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey='equity'
                    name='Equity (USDC)'
                    stroke='hsl(var(--chart-2))'
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {dayChartData.length === 0 && threeDayChartData.length === 0 && (
            <div className='py-8 text-center text-muted-foreground'>暂无历史数据</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
