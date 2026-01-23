import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from './stats-card'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface WalletEventSectionProps {
  data?: {
    totalCount: number
    todayCount: number
    eventTypeDistribution: Record<string, number>
    recentEvents: any[]
  }
  isLoading?: boolean
}

const eventTypeLabels: Record<string, string> = {
  OPEN: '开仓',
  CLOSE: '平仓',
  INCREASE: '加仓',
  DECREASE: '减仓',
  FLIP: '反手',
}

const eventTypeIcons: Record<string, any> = {
  OPEN: TrendingUp,
  CLOSE: TrendingDown,
  INCREASE: Activity,
  DECREASE: Activity,
  FLIP: ArrowRightLeft,
}

const eventTypeColors: Record<string, string> = {
  OPEN: 'text-green-600',
  CLOSE: 'text-red-600',
  INCREASE: 'text-blue-600',
  DECREASE: 'text-orange-600',
  FLIP: 'text-purple-600',
}

export function WalletEventSection({
  data,
  isLoading,
}: WalletEventSectionProps) {
  return (
    <div className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatsCard
          title='总事件数'
          value={data?.totalCount || 0}
          icon={Activity}
          description='所有仓位变化事件'
          isLoading={isLoading}
        />
        <StatsCard
          title='今日事件'
          value={data?.todayCount || 0}
          icon={Zap}
          description='今天捕获的事件'
          isLoading={isLoading}
        />
        <StatsCard
          title='开仓事件'
          value={data?.eventTypeDistribution?.['OPEN'] || 0}
          icon={TrendingUp}
          description='新开仓位'
          isLoading={isLoading}
        />
        <StatsCard
          title='平仓事件'
          value={data?.eventTypeDistribution?.['CLOSE'] || 0}
          icon={TrendingDown}
          description='平仓操作'
          isLoading={isLoading}
        />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>事件类型分布</CardTitle>
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
            ) : data?.eventTypeDistribution &&
              Object.keys(data.eventTypeDistribution).length > 0 ? (
              <div className='space-y-2'>
                {Object.entries(data.eventTypeDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const Icon = eventTypeIcons[type] || Activity
                    return (
                      <div
                        key={type}
                        className='flex items-center justify-between'
                      >
                        <div className='flex items-center gap-2'>
                          <Icon className={`h-4 w-4 ${eventTypeColors[type]}`} />
                          <span className='text-sm text-muted-foreground'>
                            {eventTypeLabels[type] || type}
                          </span>
                        </div>
                        <Badge variant='secondary'>{count}</Badge>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className='text-center text-muted-foreground py-8'>
                暂无事件数据
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近事件</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-2'>
                {[1, 2, 3].map((i) => (
                  <div key={i} className='p-2 border rounded'>
                    <div className='h-4 w-full bg-muted animate-pulse rounded mb-2' />
                    <div className='h-3 w-3/4 bg-muted animate-pulse rounded' />
                  </div>
                ))}
              </div>
            ) : data?.recentEvents && data.recentEvents.length > 0 ? (
              <div className='space-y-2 max-h-[300px] overflow-y-auto'>
                {data.recentEvents.slice(0, 5).map((event) => {
                  const Icon = eventTypeIcons[event.event_type] || Activity
                  return (
                    <div
                      key={event.id}
                      className='p-2 border rounded hover:bg-muted/50 transition-colors'
                    >
                      <div className='flex items-center justify-between mb-1'>
                        <div className='flex items-center gap-2'>
                          <Icon
                            className={`h-4 w-4 ${eventTypeColors[event.event_type]}`}
                          />
                          <Badge variant='outline' className='text-xs'>
                            {eventTypeLabels[event.event_type]}
                          </Badge>
                          <span className='text-sm font-medium'>
                            {event.coin}
                          </span>
                        </div>
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {event.wallet_address?.slice(0, 6)}...
                        {event.wallet_address?.slice(-4)}
                      </div>
                      <div className='text-xs text-muted-foreground mt-1'>
                        {event.created_at &&
                          format(
                            new Date(event.created_at),
                            'MM-dd HH:mm:ss',
                            { locale: zhCN }
                          )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className='text-center text-muted-foreground py-8'>
                暂无最近事件
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
