import { useEffect, useState, useMemo } from 'react'
import { WalletsProvider, useWallets as useWalletsContext } from '../components/tasks-provider'
import { WalletsPrimaryButtons } from '../components/tasks-primary-buttons'
import { WalletsDialogs } from '../components/tasks-dialogs'
import { DataTableRowActions } from '../components/data-table-row-actions'
import { type Row } from '@tanstack/react-table'
import { useWallets } from '../hooks/use-wallets'
import { type Wallet } from '../data/schema'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { WalletAddressCell } from '../../components/wallet-address-cell'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PositionData {
  address: string
  marginSummary?: {
    accountValue: string
    totalNtlPos: string
    totalRawUsd: string
    totalMarginUsed: string
  }
  positions: Array<{
    symbol: string
    side: 'Long' | 'Short'
    size: number
    szi: number
    entryPrice: number
    positionValue: number
    unrealizedPnl: number
    returnOnEquity: number
    liquidationPx: number
    marginUsed: number
    leverage: number
    leverageType: string
    cumFunding: {
      allTime: number
      sinceOpen: number
      sinceChange: number
    }
    positionRatio: number
    riskRate: number
    effectiveLeverage: number
    liquidationDistance: number
    isProfitable: boolean
    profitMargin: number
  }>
  totalPnl: number
  totalMargin: number
  lastUpdate: Date
  error?: string
}

const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/info'

function CombinedContent() {
  const { wallets, loading: walletsLoading, refetch } = useWallets()
  const { refreshTrigger } = useWalletsContext()
  const [positionsData, setPositionsData] = useState<Record<string, PositionData>>({})
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set())

  // 当 refreshTrigger 变化时，重新获取钱包列表
  // 注意：钱包列表的更新会通过 walletAddresses 的变化自动触发持仓数据刷新
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  const toggleWallet = (walletId: string) => {
    setExpandedWallets((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(walletId)) {
        newSet.delete(walletId)
      } else {
        newSet.add(walletId)
      }
      return newSet
    })
  }

  const fetchWalletPositions = async (address: string): Promise<PositionData | null> => {
    try {
      const response = await fetch(HYPERLIQUID_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: address,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const clearinghouseState = data?.clearinghouseState || data
      const assetPositions = clearinghouseState?.assetPositions || []
      const marginSummary = clearinghouseState?.marginSummary

      const accountValue = parseFloat(marginSummary?.accountValue || '0')

      const positions = assetPositions
        .filter((item: any) => {
          const pos = item.position || item
          const szi = parseFloat(pos?.szi || '0')
          return pos && szi !== 0
        })
        .map((item: any) => {
          const pos = item.position || item
          if (!pos) return null
          const szi = parseFloat(pos.szi || '0')
          const side = szi > 0 ? 'Long' : 'Short'
          const entryPrice = parseFloat(pos.entryPx || '0')
          const positionValue = parseFloat(pos.positionValue || '0')
          const unrealizedPnl = parseFloat(pos.unrealizedPnl || '0')
          const returnOnEquity = parseFloat(pos.returnOnEquity || '0')
          const liquidationPx = parseFloat(pos.liquidationPx || '0')
          const marginUsed = parseFloat(pos.marginUsed || '0')
          const leverage = parseFloat(pos.leverage?.value || '1')

          const currentPrice = entryPrice * (1 + returnOnEquity)
          const positionRatio = accountValue > 0 ? (positionValue / accountValue) * 100 : 0
          const riskRate = accountValue > 0 ? (marginUsed / accountValue) * 100 : 0
          const effectiveLeverage = accountValue > 0 ? positionValue / accountValue : 0
          
          const liquidationDistance = currentPrice > 0 
            ? (side === 'Long' 
              ? ((currentPrice - liquidationPx) / currentPrice) * 100
              : ((liquidationPx - currentPrice) / currentPrice) * 100)
            : 0

          const isProfitable = unrealizedPnl > 0
          const profitMargin = returnOnEquity * 100

          return {
            symbol: pos.coin || '-',
            side: side as 'Long' | 'Short',
            size: Math.abs(szi),
            szi,
            entryPrice,
            positionValue,
            unrealizedPnl,
            returnOnEquity,
            liquidationPx,
            marginUsed,
            leverage,
            leverageType: pos.leverage?.type || 'cross',
            cumFunding: {
              allTime: parseFloat(pos.cumFunding?.allTime || '0'),
              sinceOpen: parseFloat(pos.cumFunding?.sinceOpen || '0'),
              sinceChange: parseFloat(pos.cumFunding?.sinceChange || '0'),
            },
            positionRatio,
            riskRate,
            effectiveLeverage,
            liquidationDistance,
            isProfitable,
            profitMargin,
          }
        })
        .filter((p: any): p is NonNullable<typeof p> => p !== null)

      const totalPnl = positions.reduce((sum: number, p: any) => sum + p.unrealizedPnl, 0)
      const totalMargin = positions.reduce((sum: number, p: any) => sum + p.marginUsed, 0)

      return {
        address,
        marginSummary: marginSummary ? {
          accountValue: marginSummary.accountValue || '0',
          totalNtlPos: marginSummary.totalNtlPos || '0',
          totalRawUsd: marginSummary.totalRawUsd || '0',
          totalMarginUsed: marginSummary.totalMarginUsed || '0',
        } : undefined,
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
    if (wallets.length === 0) {
      setPositionsData({})
      return
    }
    
    setLoading(true)
    const newPositionsData: Record<string, PositionData> = {}
    
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
    // 只在手动刷新时显示提示，自动刷新时不显示
    if (refreshTrigger === 0) {
      toast.success('数据刷新完成')
    }
  }

  // 使用 useMemo 跟踪钱包地址列表的变化
  const walletAddresses = useMemo(() => {
    return wallets.map(w => w.address).sort().join(',')
  }, [wallets])

  // 当钱包列表变化时，刷新持仓数据
  useEffect(() => {
    if (!walletsLoading) {
      // 如果钱包列表为空，清空持仓数据
      if (wallets.length === 0) {
        setPositionsData({})
        return
      }
      // 如果钱包列表有数据，刷新持仓数据
      // 延迟执行，确保 wallets 状态已完全更新
      const timer = setTimeout(() => {
        refreshAllPositions()
      }, 200)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsLoading, walletAddresses])

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
    <WalletsProvider>
      <div className='flex flex-col space-y-4'>
        <div className='flex items-center justify-end flex-shrink-0'>
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
            <WalletsPrimaryButtons />
          </div>
        </div>
        <div>
          {walletsLoading ? (
            <div className='space-y-4'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-64 w-full' />
            </div>
          ) : wallets.length === 0 ? (
            <Alert>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>暂无数据</AlertTitle>
              <AlertDescription>
                点击"新增钱包"按钮添加钱包地址
              </AlertDescription>
            </Alert>
          ) : (
            <div className='rounded-md border overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[40px]'></TableHead>
                    <TableHead className='sticky left-0 bg-background z-10'>钱包地址</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead className='text-right'>账户价值</TableHead>
                    <TableHead className='text-right'>总持仓价值</TableHead>
                    <TableHead className='text-right'>持仓占比</TableHead>
                    <TableHead className='text-right'>总保证金</TableHead>
                    <TableHead className='text-right'>风险率</TableHead>
                    <TableHead className='text-right'>总盈亏</TableHead>
                    <TableHead className='text-right'>收益率</TableHead>
                    <TableHead className='text-right'>持仓数量</TableHead>
                    <TableHead className='text-right'>多/空</TableHead>
                    <TableHead className='text-right'>更新时间</TableHead>
                    <TableHead className='w-[100px]'>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map((wallet) => {
                    const positionData = positionsData[wallet.address]
                    const isLoading = !positionData && loading
                    const isExpanded = expandedWallets.has(wallet.id)
                    const accountValue = positionData?.marginSummary 
                      ? parseFloat(positionData.marginSummary.accountValue) 
                      : 0
                    const totalPositionValue = positionData?.marginSummary 
                      ? parseFloat(positionData.marginSummary.totalNtlPos) 
                      : 0
                    const totalMargin = positionData?.marginSummary 
                      ? parseFloat(positionData.marginSummary.totalMarginUsed) 
                      : 0
                    const positionRatio = accountValue > 0 ? (totalPositionValue / accountValue) * 100 : 0
                    const riskRate = accountValue > 0 ? (totalMargin / accountValue) * 100 : 0
                    const returnRate = accountValue > 0 ? (positionData?.totalPnl || 0) / accountValue * 100 : 0
                    const longCount = positionData?.positions.filter(p => p.side === 'Long').length || 0
                    const shortCount = positionData?.positions.filter(p => p.side === 'Short').length || 0

                    return (
                      <>
                        <TableRow 
                          key={wallet.id}
                          className='cursor-pointer hover:bg-muted/50'
                          onClick={() => toggleWallet(wallet.id)}
                        >
                          <TableCell>
                            {positionData?.positions.length > 0 ? (
                              isExpanded ? (
                                <ChevronDown className='h-4 w-4' />
                              ) : (
                                <ChevronRight className='h-4 w-4' />
                              )
                            ) : null}
                          </TableCell>
                          <TableCell
                            className='sticky left-0 bg-background z-10 font-mono text-sm min-w-0'
                            onClick={(e) => e.stopPropagation()}
                          >
                            <WalletAddressCell address={wallet.address} />
                          </TableCell>
                          <TableCell className='max-w-[200px]'>
                            <div className='truncate' title={wallet.note || ''}>
                              {wallet.note || '无备注'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {wallet.type ? (
                              <Badge variant='outline'>{wallet.type}</Badge>
                            ) : (
                              <span className='text-muted-foreground text-sm'>-</span>
                            )}
                          </TableCell>
                          <TableCell className='text-right font-medium'>
                            {isLoading ? (
                              <Skeleton className='h-4 w-20 inline-block' />
                            ) : positionData?.error ? (
                              <span className='text-destructive text-xs'>错误</span>
                            ) : accountValue > 0 ? (
                              formatCurrency(accountValue)
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            {totalPositionValue > 0 ? formatCurrency(totalPositionValue) : '-'}
                          </TableCell>
                          <TableCell className='text-right'>
                            {positionRatio > 0 ? (
                              <span className={positionRatio > 50 ? 'text-orange-600 font-semibold' : ''}>
                                {formatNumber(positionRatio)}%
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className='text-right'>
                            {totalMargin > 0 ? formatCurrency(totalMargin) : '-'}
                          </TableCell>
                          <TableCell className='text-right'>
                            {riskRate > 0 ? (
                              <span className={
                                riskRate > 50 ? 'text-red-600 font-semibold' : 
                                riskRate > 30 ? 'text-orange-600' : 
                                ''
                              }>
                                {formatNumber(riskRate)}%
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${
                            (positionData?.totalPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(positionData?.totalPnl || 0) !== 0 ? (
                              <>
                                {(positionData?.totalPnl || 0) >= 0 ? (
                                  <TrendingUp className='inline h-3 w-3 mr-1' />
                                ) : (
                                  <TrendingDown className='inline h-3 w-3 mr-1' />
                                )}
                                {formatCurrency(positionData?.totalPnl || 0)}
                              </>
                            ) : '-'}
                          </TableCell>
                          <TableCell className={`text-right ${
                            returnRate >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {returnRate !== 0 ? `${returnRate >= 0 ? '+' : ''}${formatNumber(returnRate)}%` : '-'}
                          </TableCell>
                          <TableCell className='text-right'>
                            {positionData?.positions.length || 0}
                          </TableCell>
                          <TableCell className='text-right text-xs'>
                            {longCount > 0 || shortCount > 0 ? (
                              <span>
                                <span className='text-green-600'>{longCount}</span> / 
                                <span className='text-red-600'> {shortCount}</span>
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className='text-right text-xs text-muted-foreground'>
                            {positionData?.lastUpdate 
                              ? format(positionData.lastUpdate, 'HH:mm:ss', { locale: zhCN })
                              : '-'}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DataTableRowActions row={{ original: wallet } as Row<Wallet>} />
                          </TableCell>
                        </TableRow>
                        {/* 展开的持仓明细 */}
                        {isExpanded && positionData && positionData.positions.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={15} className='p-0'>
                              <div className='p-4 bg-muted/30'>
                                <div className='text-sm font-semibold mb-3'>持仓明细（按仓位占比排序）</div>
                                <div className='rounded-md border overflow-x-auto'>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className='sticky left-0 bg-background z-10'>
                                          <div className='flex flex-col'>
                                            <span>方向</span>
                                            <span className='text-xs text-muted-foreground font-normal'>仓位占比</span>
                                          </div>
                                        </TableHead>
                                        <TableHead>币种</TableHead>
                                        <TableHead className='text-right'>
                                          <div className='flex flex-col items-end'>
                                            <span>仓位 (szi)</span>
                                            <span className='text-xs text-muted-foreground font-normal'>名义价值</span>
                                          </div>
                                        </TableHead>
                                        <TableHead className='text-right'>
                                          <div className='flex flex-col items-end'>
                                            <span>杠杆</span>
                                            <span className='text-xs text-muted-foreground font-normal'>风险率</span>
                                          </div>
                                        </TableHead>
                                        <TableHead className='text-right'>
                                          <div className='flex flex-col items-end'>
                                            <span>有效杠杆</span>
                                            <span className='text-xs text-muted-foreground font-normal'>爆仓距离%</span>
                                          </div>
                                        </TableHead>
                                        <TableHead className='text-right'>
                                          <div className='flex flex-col items-end'>
                                            <span>未实现盈亏</span>
                                            <span className='text-xs text-muted-foreground font-normal'>收益率</span>
                                          </div>
                                        </TableHead>
                                        <TableHead className='text-right'>
                                          <div className='flex flex-col items-end'>
                                            <span>开仓价</span>
                                            <span className='text-xs text-muted-foreground font-normal'>强平价</span>
                                          </div>
                                        </TableHead>
                                        <TableHead className='text-right'>保证金</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {[...positionData.positions]
                                        .sort((a, b) => b.positionRatio - a.positionRatio)
                                        .map((pos, idx) => (
                                          <TableRow key={idx} className={pos.positionRatio > 50 ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                                            <TableCell className='sticky left-0 bg-background z-10'>
                                              <div className='flex flex-col gap-1'>
                                                <Badge variant={pos.side === 'Long' ? 'default' : 'secondary'} className='w-fit'>
                                                  {pos.side}
                                                </Badge>
                                                <span className={`text-xs font-semibold ${
                                                  pos.positionRatio > 30 ? 'text-orange-600' : 
                                                  pos.positionRatio > 10 ? 'text-yellow-600' : 
                                                  'text-muted-foreground'
                                                }`}>
                                                  {formatNumber(pos.positionRatio)}%
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className='font-medium'>{pos.symbol}</TableCell>
                                            <TableCell className='text-right'>
                                              <div className='flex flex-col items-end'>
                                                <span className='font-medium'>{formatNumber(pos.szi)}</span>
                                                <span className='text-xs text-muted-foreground'>
                                                  {formatCurrency(pos.positionValue)}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className='text-right'>
                                              <div className='flex flex-col items-end'>
                                                <Badge variant='outline' className='w-fit'>{pos.leverage}x</Badge>
                                                <span className={`text-xs font-medium mt-1 ${
                                                  pos.riskRate > 50 ? 'text-red-600' : 
                                                  pos.riskRate > 30 ? 'text-orange-600' : 
                                                  'text-muted-foreground'
                                                }`}>
                                                  {formatNumber(pos.riskRate)}%
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className='text-right'>
                                              <div className='flex flex-col items-end'>
                                                <span className='text-sm font-medium'>{formatNumber(pos.effectiveLeverage)}x</span>
                                                <span className={`text-xs font-medium mt-1 ${
                                                  pos.liquidationDistance < 10 ? 'text-red-600' : 
                                                  pos.liquidationDistance < 20 ? 'text-orange-600' : 
                                                  'text-green-600'
                                                }`}>
                                                  {formatNumber(pos.liquidationDistance)}%
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className='text-right'>
                                              <div className='flex flex-col items-end'>
                                                <span className={`font-semibold ${
                                                  pos.isProfitable ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                  {pos.isProfitable ? '+' : ''}{formatCurrency(pos.unrealizedPnl)}
                                                </span>
                                                <span className={`text-xs font-medium mt-1 ${
                                                  pos.isProfitable ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                  {pos.isProfitable ? '+' : ''}{formatNumber(pos.profitMargin)}%
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className='text-right'>
                                              <div className='flex flex-col items-end'>
                                                <span className='text-sm'>{formatCurrency(pos.entryPrice)}</span>
                                                <span className='text-xs text-muted-foreground mt-1'>
                                                  {formatCurrency(pos.liquidationPx)}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className='text-right'>{formatCurrency(pos.marginUsed)}</TableCell>
                                          </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        <WalletsDialogs />
      </div>
    </WalletsProvider>
  )
}

export function CombinedMonitor() {
  return (
    <WalletsProvider>
      <CombinedContent />
    </WalletsProvider>
  )
}
