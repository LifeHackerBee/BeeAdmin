import { useState, useEffect, useMemo } from 'react'
import { useBacktestTracker, type BacktestTrackerTask } from './hooks/use-backtest-tracker'
import { TrackerTasksTable } from './components/tracker-tasks-table'
import { TrackerTaskDialog } from './components/tracker-task-dialog'
import { TrackerChartDialog } from './components/tracker-chart-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, Radar, Trophy } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

export function BacktestModule() {
  const { tasks, loading, error, refetch, createTask, startTask, stopTask, deleteTask } = useBacktestTracker()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [chartDialogOpen, setChartDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<BacktestTrackerTask | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshInterval = 10 // 10 秒刷新一次

  // 自动刷新逻辑
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (!document.hidden && !isRefreshing) {
        setIsRefreshing(true)
        refetch().finally(() => setIsRefreshing(false))
      }
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refetch, refreshInterval, isRefreshing])

  // 处理刷新
  const handleRefresh = () => {
    setIsRefreshing(true)
    refetch().finally(() => setIsRefreshing(false))
  }

  // 处理查看图表
  const handleViewChart = (task: BacktestTrackerTask) => {
    setSelectedTask(task)
    setChartDialogOpen(true)
  }

  // Order Radar 信号任务统计
  const signalStats = useMemo(() => {
    const signalTasks = tasks.filter((t) => t.source === 'order_radar')
    const completed = signalTasks.filter((t) => t.status === 'completed' && t.exit_reason)
    const wins = completed.filter((t) => t.final_pnl != null && t.final_pnl > 0)
    const running = signalTasks.filter((t) => t.status === 'running')
    const totalPnl = completed.reduce((sum, t) => sum + (t.final_pnl ?? 0), 0)
    return {
      total: signalTasks.length,
      completed: completed.length,
      wins: wins.length,
      losses: completed.length - wins.length,
      running: running.length,
      winRate: completed.length > 0 ? (wins.length / completed.length) * 100 : 0,
      totalPnl,
    }
  }, [tasks])

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-xl font-semibold'>跟单测试追踪</h2>
        <p className='text-sm text-muted-foreground'>
          实时追踪跟单测试的收益情况，支持自定义追踪间隔和时长
        </p>
      </div>

      <Tabs defaultValue='tracker' className='w-full'>
        <TabsList>
          <TabsTrigger value='tracker'>追踪任务</TabsTrigger>
          <TabsTrigger value='history'>历史回测</TabsTrigger>
        </TabsList>

        <TabsContent value='tracker' className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              {/* 自动刷新控制 */}
              <div className='flex items-center gap-2'>
                <Switch
                  id='auto-refresh'
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor='auto-refresh' className='text-sm cursor-pointer'>
                  自动刷新
                </Label>
                {autoRefresh && (
                  <span className='text-xs text-muted-foreground'>
                    ({refreshInterval}秒)
                  </span>
                )}
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Button variant='outline' onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className='mr-2 h-4 w-4' />
                创建追踪任务
              </Button>
            </div>
          </div>

          {/* Order Radar 信号统计 */}
          {signalStats.completed > 0 && (
            <Card>
              <CardContent className='pt-4 pb-3'>
                <div className='flex items-center gap-6'>
                  <div className='flex items-center gap-2'>
                    <Radar className='h-4 w-4 text-blue-500' />
                    <span className='text-sm font-medium'>AI 信号测试</span>
                    <Badge variant='outline' className='text-xs'>
                      {signalStats.completed} 次
                    </Badge>
                    {signalStats.running > 0 && (
                      <Badge variant='secondary' className='text-xs animate-pulse'>
                        {signalStats.running} 运行中
                      </Badge>
                    )}
                  </div>
                  <div className='flex items-center gap-4 text-sm'>
                    <div className='flex items-center gap-1'>
                      <Trophy className='h-3.5 w-3.5' />
                      <span className='font-mono font-bold'>
                        {signalStats.winRate.toFixed(1)}%
                      </span>
                    </div>
                    <span className='text-green-500 font-mono'>{signalStats.wins}W</span>
                    <span className='text-red-500 font-mono'>{signalStats.losses}L</span>
                    <span className={`font-mono font-bold ${signalStats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {signalStats.totalPnl >= 0 ? '+' : ''}${signalStats.totalPnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {loading && !isRefreshing ? (
            <div className='space-y-4'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-64 w-full' />
            </div>
          ) : error ? (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>加载失败</AlertTitle>
              <AlertDescription>
                {error.message}
                <br />
                <span className='text-xs mt-2 block'>
                  API URL: {import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'}
                </span>
              </AlertDescription>
            </Alert>
          ) : (
            <TrackerTasksTable
              data={tasks}
              onStart={startTask}
              onStop={stopTask}
              onDelete={deleteTask}
              onViewChart={handleViewChart}
            />
          )}
        </TabsContent>

        <TabsContent value='history' className='space-y-4'>
          <div className='text-center py-12 text-muted-foreground'>
            <p>历史回测功能开发中...</p>
          </div>
        </TabsContent>
      </Tabs>

      <TrackerTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={createTask}
        onSuccess={() => {
          refetch()
        }}
      />

      {selectedTask && (
        <TrackerChartDialog
          open={chartDialogOpen}
          onOpenChange={setChartDialogOpen}
          task={selectedTask}
        />
      )}
    </div>
  )
}
