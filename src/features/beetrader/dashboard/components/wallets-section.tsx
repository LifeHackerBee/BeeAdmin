import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from './stats-card'
import { Wallet, DollarSign, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface WalletsSectionProps {
  data?: {
    totalCount: number
    typeDistribution: Record<string, number>
    totalVolume: number
    recentWallets: any[]
  }
  isLoading?: boolean
}

export function WalletsSection({ data, isLoading }: WalletsSectionProps) {
  const averageVolume =
    data?.totalCount && data.totalCount > 0
      ? Math.round(data.totalVolume / data.totalCount)
      : 0

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatsCard
          title='总钱包数'
          value={data?.totalCount || 0}
          icon={Wallet}
          description='监控的钱包总数'
          isLoading={isLoading}
        />
        <StatsCard
          title='总体量'
          value={
            data?.totalVolume
              ? `$${(data.totalVolume / 1000000).toFixed(2)}M`
              : '$0'
          }
          icon={DollarSign}
          description='所有钱包总价值'
          isLoading={isLoading}
        />
        <StatsCard
          title='平均体量'
          value={averageVolume ? `$${(averageVolume / 1000).toFixed(1)}K` : '$0'}
          icon={TrendingUp}
          description='单个钱包平均价值'
          isLoading={isLoading}
        />
        <StatsCard
          title='钱包类型'
          value={
            data?.typeDistribution
              ? Object.keys(data.typeDistribution).length
              : 0
          }
          icon={Wallet}
          description='不同类型数量'
          isLoading={isLoading}
        />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>钱包类型分布</CardTitle>
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
                        {type || '未分类'}
                      </span>
                      <Badge variant='secondary'>{count}</Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <div className='text-center text-muted-foreground py-8'>
                暂无类型数据
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近添加的钱包</CardTitle>
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
            ) : data?.recentWallets && data.recentWallets.length > 0 ? (
              <div className='space-y-2 max-h-[300px] overflow-y-auto'>
                {data.recentWallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className='p-2 border rounded hover:bg-muted/50 transition-colors'
                  >
                    <div className='flex items-center justify-between mb-1'>
                      <code className='text-xs font-mono'>
                        {wallet.address?.slice(0, 10)}...
                        {wallet.address?.slice(-8)}
                      </code>
                      {wallet.type && (
                        <Badge variant='outline' className='text-xs'>
                          {wallet.type}
                        </Badge>
                      )}
                    </div>
                    {wallet.note && (
                      <div className='text-xs text-muted-foreground mb-1'>
                        {wallet.note}
                      </div>
                    )}
                    {wallet.volume && (
                      <div className='text-xs font-medium text-green-600'>
                        ${Number(wallet.volume).toLocaleString()}
                      </div>
                    )}
                    <div className='text-xs text-muted-foreground mt-1'>
                      {wallet.created_at &&
                        format(new Date(wallet.created_at), 'yyyy-MM-dd HH:mm', {
                          locale: zhCN,
                        })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center text-muted-foreground py-8'>
                暂无钱包数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
