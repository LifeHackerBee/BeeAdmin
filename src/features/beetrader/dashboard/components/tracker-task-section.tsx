import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from './stats-card'
import { ListChecks, PlayCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TrackerTaskSectionProps {
  data?: {
    totalCount: number
    runningCount: number
    statusDistribution: Record<string, number>
    summary: {
      totalChecks: number
      totalSuccess: number
      totalErrors: number
      totalEvents: number
    }
  }
  isLoading?: boolean
}

const statusLabels: Record<string, string> = {
  pending: '待启动',
  running: '运行中',
  stopped: '已停止',
  error: '错误',
  deleted: '已删除',
}

const statusVariants: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  running: 'default',
  stopped: 'secondary',
  error: 'destructive',
  deleted: 'outline',
}

export function TrackerTaskSection({
  data,
  isLoading,
}: TrackerTaskSectionProps) {
  const successRate =
    data?.summary.totalChecks && data.summary.totalChecks > 0
      ? Math.round(
          (data.summary.totalSuccess / data.summary.totalChecks) * 100
        )
      : 0

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatsCard
          title='总追踪任务'
          value={data?.totalCount || 0}
          icon={ListChecks}
          description='所有钱包追踪任务'
          isLoading={isLoading}
        />
        <StatsCard
          title='运行中'
          value={data?.runningCount || 0}
          icon={PlayCircle}
          description='正在监控的任务'
          isLoading={isLoading}
        />
        <StatsCard
          title='总检查次数'
          value={data?.summary.totalChecks || 0}
          icon={CheckCircle2}
          description='所有任务累计检查'
          isLoading={isLoading}
        />
        <StatsCard
          title='成功率'
          value={`${successRate}%`}
          icon={CheckCircle2}
          description='检查成功百分比'
          isLoading={isLoading}
        />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>任务状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-2'>
                {[1, 2, 3].map((i) => (
                  <div key={i} className='flex items-center justify-between'>
                    <div className='h-4 w-24 bg-muted animate-pulse rounded' />
                    <div className='h-6 w-12 bg-muted animate-pulse rounded' />
                  </div>
                ))}
              </div>
            ) : data?.statusDistribution &&
              Object.keys(data.statusDistribution).length > 0 ? (
              <div className='space-y-2'>
                {Object.entries(data.statusDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div
                      key={status}
                      className='flex items-center justify-between'
                    >
                      <span className='text-sm text-muted-foreground'>
                        {statusLabels[status] || status}
                      </span>
                      <Badge variant={statusVariants[status] || 'secondary'}>
                        {count}
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <div className='text-center text-muted-foreground py-8'>
                暂无任务数据
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>追踪统计</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-2'>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className='flex items-center justify-between'>
                    <div className='h-4 w-32 bg-muted animate-pulse rounded' />
                    <div className='h-6 w-16 bg-muted animate-pulse rounded' />
                  </div>
                ))}
              </div>
            ) : (
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-600' />
                    <span className='text-sm text-muted-foreground'>
                      成功检查
                    </span>
                  </div>
                  <span className='font-semibold'>
                    {data?.summary.totalSuccess || 0}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <AlertCircle className='h-4 w-4 text-red-600' />
                    <span className='text-sm text-muted-foreground'>
                      失败检查
                    </span>
                  </div>
                  <span className='font-semibold'>
                    {data?.summary.totalErrors || 0}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-blue-600' />
                    <span className='text-sm text-muted-foreground'>
                      总事件数
                    </span>
                  </div>
                  <span className='font-semibold'>
                    {data?.summary.totalEvents || 0}
                  </span>
                </div>
                <div className='flex items-center justify-between pt-2 border-t'>
                  <span className='text-sm font-medium'>平均事件/任务</span>
                  <span className='font-semibold'>
                    {data?.totalCount && data.totalCount > 0
                      ? Math.round(
                          (data.summary.totalEvents / data.totalCount) * 10
                        ) / 10
                      : 0}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
