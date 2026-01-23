import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from './stats-card'
import { Users, TrendingUp, BarChart3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TraderAnalysisSectionProps {
  data?: {
    totalCount: number
    typeDistribution: Record<string, number>
    signalDistribution: Record<string, number>
  }
  isLoading?: boolean
}

const traderTypeLabels: Record<string, string> = {
  HEDGER: '对冲者',
  MARKET_MAKER: '做市商',
  WHALE: '巨鲸',
  TRADER: '交易者',
  PUMP_AND_DUMP: '短期冲榜',
  EMPTY: '空账户',
  SMALL: '小账户',
}

const signalLabels: Record<string, string> = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
}

export function TraderAnalysisSection({
  data,
  isLoading,
}: TraderAnalysisSectionProps) {
  const whaleCount = data?.typeDistribution?.['WHALE'] || 0
  const traderCount = data?.typeDistribution?.['TRADER'] || 0

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatsCard
          title='总分析数'
          value={data?.totalCount || 0}
          icon={Users}
          description='已分析的交易者'
          isLoading={isLoading}
        />
        <StatsCard
          title='巨鲸数量'
          value={whaleCount}
          icon={TrendingUp}
          description='识别的巨鲸交易者'
          isLoading={isLoading}
        />
        <StatsCard
          title='Smart Money'
          value={traderCount}
          icon={BarChart3}
          description='优质交易者'
          isLoading={isLoading}
        />
        <StatsCard
          title='有效信号'
          value={whaleCount + traderCount}
          icon={TrendingUp}
          description='可跟踪的交易者'
          isLoading={isLoading}
        />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>交易者类型分布</CardTitle>
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
            ) : data?.typeDistribution &&
              Object.keys(data.typeDistribution).length > 0 ? (
              <div className='space-y-2'>
                {Object.entries(data.typeDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div
                      key={type}
                      className='flex items-center justify-between'
                    >
                      <span className='text-sm text-muted-foreground'>
                        {traderTypeLabels[type] || type}
                      </span>
                      <Badge variant='secondary'>{count}</Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <div className='text-center text-muted-foreground py-8'>
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>信号强度分布</CardTitle>
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
            ) : data?.signalDistribution &&
              Object.keys(data.signalDistribution).length > 0 ? (
              <div className='space-y-2'>
                {Object.entries(data.signalDistribution)
                  .sort((a, b) => {
                    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 }
                    return (
                      (order[a[0] as keyof typeof order] || 999) -
                      (order[b[0] as keyof typeof order] || 999)
                    )
                  })
                  .map(([signal, count]) => (
                    <div
                      key={signal}
                      className='flex items-center justify-between'
                    >
                      <span className='text-sm text-muted-foreground'>
                        {signalLabels[signal] || signal}
                      </span>
                      <Badge
                        variant={
                          signal === 'HIGH'
                            ? 'default'
                            : signal === 'MEDIUM'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {count}
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <div className='text-center text-muted-foreground py-8'>
                暂无信号数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
