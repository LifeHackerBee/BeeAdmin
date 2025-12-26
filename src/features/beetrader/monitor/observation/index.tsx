import { useEffect, useState } from 'react'
import { useWallets } from '../hooks/use-wallets'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface PositionData {
  address: string
  positions: Array<{
    symbol: string
    side: 'Long' | 'Short'
    size: number
    entryPrice: number
    markPrice: number
    pnl: number
    pnlPercent: number
    margin: number
    leverage: number
  }>
  totalPnl: number
  totalMargin: number
  lastUpdate: Date
  error?: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888'

export function WhaleObservation() {
  const { wallets, loading: walletsLoading } = useWallets()
  const [positionsData, setPositionsData] = useState<Record<string, PositionData>>({})
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchWalletPositions = async (address: string): Promise<PositionData | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/wallet/${address}/positions`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      
      // 解析API返回的数据结构
      const positions = (data.data || []).map((pos: any) => ({
        symbol: pos.symbol || pos.coin || '-',
        side: pos.side || (pos.position?.side === 'B' ? 'Long' : 'Short'),
        size: parseFloat(pos.size || pos.position?.size || 0),
        entryPrice: parseFloat(pos.entryPrice || pos.position?.entryPx || 0),
        markPrice: parseFloat(pos.markPrice || pos.markPx || 0),
        pnl: parseFloat(pos.pnl || pos.unrealizedPnl || 0),
        pnlPercent: parseFloat(pos.pnlPercent || pos.returnOnEquity || 0),
        margin: parseFloat(pos.margin || pos.positionValue || 0),
        leverage: parseFloat(pos.leverage || pos.leverage || 1),
      }))

      const totalPnl = positions.reduce((sum: number, p: any) => sum + p.pnl, 0)
      const totalMargin = positions.reduce((sum: number, p: any) => sum + p.margin, 0)

      return {
        address,
        positions,
        totalPnl,
        totalMargin,
        lastUpdate: new Date(),
      }
    } catch (error) {
      console.error(`Error fetching positions for ${address}:`, error)
      return {
        address,
        positions: [],
        totalPnl: 0,
        totalMargin: 0,
        lastUpdate: new Date(),
        error: error instanceof Error ? error.message : '获取数据失败',
      }
    }
  }

  const refreshAllPositions = async () => {
    if (wallets.length === 0) return
    
    setLoading(true)
    const newPositionsData: Record<string, PositionData> = {}
    
    // 并发获取所有钱包的持仓数据
    const promises = wallets.map(async (wallet) => {
      const data = await fetchWalletPositions(wallet.address)
      if (data) {
        newPositionsData[wallet.address] = data
      }
    })

    await Promise.all(promises)
    setPositionsData(newPositionsData)
    setLastRefresh(new Date())
    setLoading(false)
    toast.success('数据刷新完成')
  }

  useEffect(() => {
    if (!walletsLoading && wallets.length > 0) {
      refreshAllPositions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsLoading, wallets.length])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-xl font-semibold'>巨鲸观察</h2>
          <p className='text-sm text-muted-foreground'>
            实时监控巨鲸钱包的持仓、保证金、盈亏等关键信息
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {lastRefresh && (
            <span className='text-sm text-muted-foreground'>
              最后更新: {format(lastRefresh, 'HH:mm:ss', { locale: zhCN })}
            </span>
          )}
          <Button
            onClick={refreshAllPositions}
            disabled={loading || walletsLoading || wallets.length === 0}
            variant='outline'
            size='sm'
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
        </div>
      </div>

      {walletsLoading ? (
        <div className='space-y-4'>
          <Skeleton className='h-48 w-full' />
          <Skeleton className='h-48 w-full' />
        </div>
      ) : wallets.length === 0 ? (
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>暂无数据</AlertTitle>
          <AlertDescription>
            请先在"巨鲸钱包管理"中添加钱包地址
          </AlertDescription>
        </Alert>
      ) : (
        <div className='space-y-4'>
          {wallets.map((wallet) => {
            const positionData = positionsData[wallet.address]
            const isLoading = !positionData && loading

            return (
              <Card key={wallet.id}>
                <CardHeader>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <CardTitle className='font-mono text-sm'>
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </CardTitle>
                      <CardDescription className='mt-1'>
                        {wallet.note || '无备注'}
                        {wallet.volume != null && (
                          <span className='ml-2'>• 体量: {formatCurrency(wallet.volume)}</span>
                        )}
                      </CardDescription>
                    </div>
                    {positionData?.lastUpdate && (
                      <span className='text-xs text-muted-foreground'>
                        更新: {format(positionData.lastUpdate, 'HH:mm:ss', { locale: zhCN })}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className='h-32 w-full' />
                  ) : positionData?.error ? (
                    <Alert variant='destructive'>
                      <AlertCircle className='h-4 w-4' />
                      <AlertTitle>获取数据失败</AlertTitle>
                      <AlertDescription>{positionData.error}</AlertDescription>
                    </Alert>
                  ) : positionData && positionData.positions.length > 0 ? (
                    <div className='space-y-4'>
                      {/* 汇总信息 */}
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                        <div>
                          <div className='text-sm text-muted-foreground'>24h盈亏</div>
                          <div className={`text-lg font-semibold ${
                            positionData.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {positionData.totalPnl >= 0 ? (
                              <TrendingUp className='inline h-4 w-4 mr-1' />
                            ) : (
                              <TrendingDown className='inline h-4 w-4 mr-1' />
                            )}
                            {formatCurrency(positionData.totalPnl)}
                          </div>
                        </div>
                        <div>
                          <div className='text-sm text-muted-foreground'>总保证金</div>
                          <div className='text-lg font-semibold'>
                            {formatCurrency(positionData.totalMargin)}
                          </div>
                        </div>
                        <div>
                          <div className='text-sm text-muted-foreground'>持仓数量</div>
                          <div className='text-lg font-semibold'>
                            {positionData.positions.length}
                          </div>
                        </div>
                        <div>
                          <div className='text-sm text-muted-foreground'>数据更新时间</div>
                          <div className='text-sm font-medium'>
                            {format(positionData.lastUpdate, 'MM-dd HH:mm:ss', { locale: zhCN })}
                          </div>
                        </div>
                      </div>

                      {/* 持仓列表 */}
                      <div className='border-t pt-4'>
                        <h4 className='text-sm font-semibold mb-3'>持仓明细</h4>
                        <div className='space-y-2'>
                          {positionData.positions.map((pos, idx) => (
                            <div
                              key={idx}
                              className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'
                            >
                              <div className='flex items-center gap-3'>
                                <Badge variant={pos.side === 'Long' ? 'default' : 'secondary'}>
                                  {pos.side}
                                </Badge>
                                <span className='font-medium'>{pos.symbol}</span>
                              </div>
                              <div className='flex items-center gap-6 text-sm'>
                                <div>
                                  <span className='text-muted-foreground'>仓位: </span>
                                  <span className='font-medium'>{formatNumber(pos.size)}</span>
                                </div>
                                <div>
                                  <span className='text-muted-foreground'>保证金: </span>
                                  <span className='font-medium'>{formatCurrency(pos.margin)}</span>
                                </div>
                                <div>
                                  <span className='text-muted-foreground'>盈亏: </span>
                                  <span className={`font-medium ${
                                    pos.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {formatCurrency(pos.pnl)} ({pos.pnlPercent >= 0 ? '+' : ''}{formatNumber(pos.pnlPercent)}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className='h-4 w-4' />
                      <AlertTitle>暂无持仓</AlertTitle>
                      <AlertDescription>该钱包当前没有持仓</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

