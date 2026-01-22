import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStatistics } from '../hooks/use-statistics'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, TrendingUp, Clock, AlertCircle } from 'lucide-react'

export function StatisticsCards() {
  const { dashboardStats, loading, error } = useStatistics()

  if (loading) {
    return (
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className='py-4'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-4' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-8 w-16 mb-1' />
              <Skeleton className='h-3 w-32' />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !dashboardStats) {
    return null
  }

  const { overview, statistics, recent_24h } = dashboardStats

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      {/* 总任务数 */}
      <Card className='py-4'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>总任务数</CardTitle>
          <Activity className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{overview.total_tasks}</div>
          <p className='text-xs text-muted-foreground mt-1'>
            {overview.running_tasks} 运行中
          </p>
        </CardContent>
      </Card>

      {/* 总检查次数 */}
      <Card className='py-4'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>总检查次数</CardTitle>
          <Clock className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{statistics.total_check_count}</div>
          <p className='text-xs text-muted-foreground mt-1'>
            最近24小时: {recent_24h.check_count}
          </p>
        </CardContent>
      </Card>

      {/* 成功率 */}
      <Card className='py-4'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>成功率</CardTitle>
          <TrendingUp className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{statistics.success_rate.toFixed(1)}%</div>
          <p className='text-xs text-muted-foreground mt-1'>
            {statistics.total_success_count} 成功 / {statistics.total_error_count} 失败
          </p>
        </CardContent>
      </Card>

      {/* 总事件数 */}
      <Card className='py-4'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>总事件数</CardTitle>
          <AlertCircle className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{statistics.total_events_count}</div>
          <p className='text-xs text-muted-foreground mt-1'>
            最近24小时: {recent_24h.events_count}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
