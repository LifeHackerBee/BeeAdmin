import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { BacktestTrackerTask, BacktestTrackerSnapshot } from '../hooks/use-backtest-tracker'
import { useBacktestTracker } from '../hooks/use-backtest-tracker'

interface TrackerChartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: BacktestTrackerTask
}

export function TrackerChartDialog({ open, onOpenChange, task }: TrackerChartDialogProps) {
  const { fetchSnapshots } = useBacktestTracker()
  const [snapshots, setSnapshots] = useState<BacktestTrackerSnapshot[]>([])
  const [loading, setLoading] = useState(false)

  // 加载快照数据
  const loadSnapshots = async () => {
    try {
      setLoading(true)
      const data = await fetchSnapshots(task.id)
      setSnapshots(data)
    } catch (error) {
      console.error('加载快照数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadSnapshots()
    }
  }, [open, task.id])

  // 准备图表数据
  const chartData = snapshots.map((snapshot) => {
    const date = new Date(snapshot.snapshot_time)
    return {
      time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      fullTime: date.toLocaleString('zh-CN'),
      price: snapshot.current_price,
      profit: snapshot.unrealized_profit,
      roi: snapshot.unrealized_roi,
    }
  })

  // 计算统计数据
  const stats = {
    totalSnapshots: snapshots.length,
    currentPrice: snapshots.length > 0 ? snapshots[snapshots.length - 1].current_price : 0,
    entryPrice: task.entry_price || 0,
    priceChange: snapshots.length > 0 ? snapshots[snapshots.length - 1].price_change : 0,
    priceChangePct: snapshots.length > 0 ? snapshots[snapshots.length - 1].price_change_pct : 0,
    currentProfit: snapshots.length > 0 ? snapshots[snapshots.length - 1].unrealized_profit : 0,
    currentROI: snapshots.length > 0 ? snapshots[snapshots.length - 1].unrealized_roi : 0,
    maxProfit: snapshots.length > 0 ? Math.max(...snapshots.map(s => s.unrealized_profit)) : 0,
    minProfit: snapshots.length > 0 ? Math.min(...snapshots.map(s => s.unrealized_profit)) : 0,
    maxPrice: snapshots.length > 0 ? Math.max(...snapshots.map(s => s.current_price)) : 0,
    minPrice: snapshots.length > 0 ? Math.min(...snapshots.map(s => s.current_price)) : 0,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-6xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{task.task_name} - 追踪数据</DialogTitle>
          <DialogDescription>
            {task.coin} {task.entry_direction === 'long' ? '多单' : '空单'} | 
            入场价格: ${stats.entryPrice.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* 统计卡片 */}
          <div className='grid grid-cols-4 gap-4'>
            <Card>
              <CardHeader className='pb-2'>
                <CardDescription>当前价格</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>${stats.currentPrice.toFixed(2)}</div>
                <div className={`text-sm ${stats.priceChangePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.priceChangePct >= 0 ? '+' : ''}{stats.priceChangePct.toFixed(2)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardDescription>当前收益</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.currentProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.currentProfit >= 0 ? '+' : ''}{stats.currentProfit.toFixed(2)} USDC
                </div>
                <div className={`text-sm ${stats.currentROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.currentROI >= 0 ? '+' : ''}{stats.currentROI.toFixed(2)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardDescription>最高收益</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-green-600'>
                  +{stats.maxProfit.toFixed(2)} USDC
                </div>
                <div className='text-sm text-muted-foreground'>
                  最高价: ${stats.maxPrice.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardDescription>最低收益</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-red-600'>
                  {stats.minProfit.toFixed(2)} USDC
                </div>
                <div className='text-sm text-muted-foreground'>
                  最低价: ${stats.minPrice.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 刷新按钮 */}
          <div className='flex justify-end'>
            <Button variant='outline' onClick={loadSnapshots} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新数据
            </Button>
          </div>

          {/* 价格走势图 */}
          <Card>
            <CardHeader>
              <CardTitle>价格走势</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width='100%' height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='time' />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => {
                        const item = chartData.find(d => d.time === label)
                        return item?.fullTime || label
                      }}
                      formatter={(value: number | undefined) => value ? `$${value.toFixed(2)}` : '-'}
                    />
                    <Legend />
                    <Line 
                      type='monotone' 
                      dataKey='price' 
                      stroke='#8884d8' 
                      name='价格'
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className='flex items-center justify-center h-[300px] text-muted-foreground'>
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 收益走势图 */}
          <Card>
            <CardHeader>
              <CardTitle>收益走势</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width='100%' height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='time' />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => {
                        const item = chartData.find(d => d.time === label)
                        return item?.fullTime || label
                      }}
                      formatter={(value: number | undefined, name: string | undefined) => {
                        if (!value) return '-'
                        if (name === '收益') return `${value.toFixed(2)} USDC`
                        return `${value.toFixed(2)}%`
                      }}
                    />
                    <Legend />
                    <Line 
                      type='monotone' 
                      dataKey='profit' 
                      stroke='#82ca9d' 
                      name='收益'
                      strokeWidth={2}
                    />
                    <Line 
                      type='monotone' 
                      dataKey='roi' 
                      stroke='#ffc658' 
                      name='收益率'
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className='flex items-center justify-center h-[300px] text-muted-foreground'>
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 数据统计 */}
          <Card>
            <CardHeader>
              <CardTitle>数据统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <span className='text-muted-foreground'>追踪次数:</span>
                  <span className='ml-2 font-medium'>{stats.totalSnapshots}</span>
                </div>
                <div>
                  <span className='text-muted-foreground'>测试金额:</span>
                  <span className='ml-2 font-medium'>{task.test_amount} USDC × {task.test_leverage}x</span>
                </div>
                <div>
                  <span className='text-muted-foreground'>追踪间隔:</span>
                  <span className='ml-2 font-medium'>
                    {task.track_interval_seconds < 60 
                      ? `${task.track_interval_seconds}秒`
                      : task.track_interval_seconds < 3600
                      ? `${Math.floor(task.track_interval_seconds / 60)}分钟`
                      : `${Math.floor(task.track_interval_seconds / 3600)}小时`
                    }
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground'>任务状态:</span>
                  <span className='ml-2 font-medium'>
                    {task.status === 'running' ? '运行中' : task.status === 'stopped' ? '已停止' : '已完成'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
