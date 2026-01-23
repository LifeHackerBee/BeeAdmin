import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from './stats-card'
import { Activity, CheckCircle2, PlayCircle, ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface BacktestSectionProps {
  data?: {
    totalCount: number
    runningCount: number
    completedCount: number
    summary: {
      totalTestAmount: number
      averageLeverage: number
      averageIntervalSeconds: number
      averageDurationSeconds: number | null
      totalTracks: number
    }
    recentTasks: any[]
  }
  isLoading?: boolean
}

const formatDuration = (
  seconds?: number | null,
  emptyLabel = '0秒'
) => {
  if (!seconds || seconds <= 0) return emptyLabel
  if (seconds < 60) return `${Math.round(seconds)}秒`
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`
  return `${Math.round(seconds / 3600)}小时`
}

const formatTestAmount = (amount: number) => {
  if (!amount) return '0 USDC'
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M USDC`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K USDC`
  return `${amount.toFixed(2)} USDC`
}

export function BacktestSection({ data, isLoading }: BacktestSectionProps) {
  const summaryItems = [
    {
      label: '累计测试资金',
      value: formatTestAmount(data?.summary?.totalTestAmount || 0),
    },
    {
      label: '平均杠杆',
      value: data?.summary?.averageLeverage
        ? `${data.summary.averageLeverage.toFixed(2)}x`
        : '0x',
    },
    {
      label: '累计追踪次数',
      value: data?.summary?.totalTracks || 0,
    },
    {
      label: '平均追踪间隔',
      value: formatDuration(data?.summary?.averageIntervalSeconds || 0),
    },
    {
      label: '平均追踪时长',
      value: formatDuration(data?.summary?.averageDurationSeconds, '不限'),
    },
  ]

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatsCard
          title='总回测任务'
          value={data?.totalCount || 0}
          icon={ListChecks}
          description='所有回测追踪任务'
          isLoading={isLoading}
        />
        <StatsCard
          title='运行中'
          value={data?.runningCount || 0}
          icon={PlayCircle}
          description='正在执行的任务'
          isLoading={isLoading}
        />
        <StatsCard
          title='已完成'
          value={data?.completedCount || 0}
          icon={CheckCircle2}
          description='完成的回测任务'
          isLoading={isLoading}
        />
        <StatsCard
          title='完成率'
          value={
            data?.totalCount
              ? `${Math.round((data.completedCount / data.totalCount) * 100)}%`
              : '0%'
          }
          icon={Activity}
          description='任务完成百分比'
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>回测汇总</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='grid gap-3 sm:grid-cols-2'>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className='flex items-center justify-between'>
                  <div className='h-4 w-24 bg-muted animate-pulse rounded' />
                  <div className='h-5 w-20 bg-muted animate-pulse rounded' />
                </div>
              ))}
            </div>
          ) : (
            <div className='grid gap-3 sm:grid-cols-2'>
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className='flex items-center justify-between'
                >
                  <span className='text-sm text-muted-foreground'>
                    {item.label}
                  </span>
                  <span className='font-semibold'>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近的回测任务</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='space-y-2'>
              {[1, 2, 3].map((i) => (
                <div key={i} className='flex items-center justify-between p-3 border rounded-lg'>
                  <div className='space-y-1 flex-1'>
                    <div className='h-4 w-32 bg-muted animate-pulse rounded' />
                    <div className='h-3 w-48 bg-muted animate-pulse rounded' />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.recentTasks && data.recentTasks.length > 0 ? (
            <div className='space-y-2'>
              {data.recentTasks.map((task) => (
                <div
                  key={task.id}
                  className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors'
                >
                  <div className='space-y-1'>
                    <div className='font-medium'>{task.task_name}</div>
                    <div className='text-sm text-muted-foreground'>
                      {task.wallet_address?.slice(0, 6)}...
                      {task.wallet_address?.slice(-4)} - {task.coin}
                    </div>
                  </div>
                  <Badge
                    variant={
                      task.status === 'running'
                        ? 'default'
                        : task.status === 'completed'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {task.status === 'running'
                      ? '运行中'
                      : task.status === 'completed'
                        ? '已完成'
                        : '已停止'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center text-muted-foreground py-8'>
              暂无回测任务
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
