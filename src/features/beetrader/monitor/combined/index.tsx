import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { WalletsProvider, useWallets as useWalletsContext } from '../components/tasks-provider'
import { WalletsPrimaryButtons } from '../components/tasks-primary-buttons'
import { WalletsDialogs } from '../components/tasks-dialogs'
import { DataTableRowActions } from '../components/data-table-row-actions'
import { type Row } from '@tanstack/react-table'
import { useWalletsData } from '../context/wallets-data-provider'
import { type Wallet } from '../data/schema'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronRight, LineChart as LineChartIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { WalletAddressCell } from '../../components/wallet-address-cell'
import { getWalletTypeLabel } from '../data/data'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { WalletsBulkActions } from '../components/wallets-bulk-actions'
import { WalletsMultiDeleteDialog } from '../components/wallets-multi-delete-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EquityCurveDialog, type EquityPoint } from './equity-curve-dialog'
import { EquitySparkline } from './equity-sparkline'
import { calculateWinRateFromFills } from '../../utils/win-rate'

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

export type EquityHistory = {
  day: EquityPoint[]
  threeDay: EquityPoint[]
  week: EquityPoint[]
}

const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/info'
const THREE_DAY_MS = 3 * 24 * 60 * 60 * 1000
const VISIBILITY_REFETCH_DEBOUNCE_MS = 15_000
const AUTO_REFRESH_INTERVAL_MS = 3 * 60 * 1000 // 3 分钟
const RECENT_WIN_RATE_TRADES = 1000

type UserFillLike = {
  time?: number
  closedPnl?: string
  coin?: string
  startPosition?: string
  sz?: string
  px?: string
  dir?: string
  [key: string]: unknown
}

function getRecentWinRateFromFills(
  fills: UserFillLike[],
  recentN: number = RECENT_WIN_RATE_TRADES
): { winRate: number; recentTrades: number; winCount: number; lossCount: number } | null {
  return calculateWinRateFromFills(fills, recentN)
}

function CombinedContent() {
  const { wallets, loading: walletsLoading, refreshing: walletsRefreshing, refetch } = useWalletsData()
  const { refreshTrigger } = useWalletsContext()
  const [positionsData, setPositionsData] = useState<Record<string, PositionData>>({})
  const [equityHistory, setEquityHistory] = useState<Record<string, EquityHistory>>({})
  const [winRateByAddress, setWinRateByAddress] = useState<Record<string, { winRate: number; recentTrades: number; winCount: number; lossCount: number } | null>>({})
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set())
  const [curveDialogAddress, setCurveDialogAddress] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedWalletIds, setSelectedWalletIds] = useState<Set<string>>(new Set())
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)
  const lastVisibilityRefetchAt = useRef<number>(0)

  const toggleSelect = useCallback((walletId: string) => {
    setSelectedWalletIds((prev) => {
      const next = new Set(prev)
      if (next.has(walletId)) next.delete(walletId)
      else next.add(walletId)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedWalletIds.size === wallets.length) {
      setSelectedWalletIds(new Set())
    } else {
      setSelectedWalletIds(new Set(wallets.map((w) => w.id)))
    }
  }, [wallets, selectedWalletIds.size])

  const clearSelection = useCallback(() => setSelectedWalletIds(new Set()), [])

  const handleBatchDeleteSuccess = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  // 当 refreshTrigger 变化时，重新获取钱包列表（后台刷新，不闪骨架屏）
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch({ backgroundRefresh: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  // 页面/标签重新可见时刷新钱包列表（仅在开启自动更新时）
  useEffect(() => {
    if (!autoRefresh) return
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastVisibilityRefetchAt.current < VISIBILITY_REFETCH_DEBOUNCE_MS) return
      lastVisibilityRefetchAt.current = now
      void refetch({ backgroundRefresh: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [autoRefresh, refetch])

  // 有钱包列表且开启自动更新时，每 15 秒刷新数据（默认关闭，避免与删除等操作冲突）
  useEffect(() => {
    if (!autoRefresh || wallets.length === 0) return
    const timer = setInterval(() => {
      refetch({ backgroundRefresh: true })
    }, AUTO_REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [autoRefresh, wallets.length, refetch])

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

  /** 从历史曲线中取最接近目标时间的账户价值（与 analyzer 一致） */
  const valueAtTime = (history: EquityPoint[], targetTimeMs: number): number | null => {
    if (!history.length) return null
    const sorted = [...history].sort((a, b) => a.t - b.t)
    let best = sorted[0]
    for (const p of sorted) {
      if (p.t > targetTimeMs) break
      best = p
    }
    return best.v
  }

  const fetchPortfolio = async (address: string): Promise<EquityHistory | null> => {
    try {
      const response = await fetch(HYPERLIQUID_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'portfolio', user: address }),
      })
      if (!response.ok) return null
      const raw: Array<[string, { accountValueHistory?: [number, number][] }]> = await response.json()
      const byFrame: Record<string, [number, number][]> = {}
      for (const item of raw) {
        const [key, data] = item
        if (data?.accountValueHistory?.length) byFrame[key] = data.accountValueHistory
      }
      const day = (byFrame.day || []).map(([t, v]) => ({ t, v }))
      const week = (byFrame.week || []).map(([t, v]) => ({ t, v }))
      const now = Date.now()
      const threeDay = week.filter((p) => now - p.t <= THREE_DAY_MS)
      return { day, threeDay: threeDay.length > 0 ? threeDay : week, week }
    } catch (e) {
      console.error(`Error fetching portfolio for ${address}:`, e)
      return null
    }
  }

  const fetchUserFills = async (address: string): Promise<UserFillLike[]> => {
    try {
      const endTime = Date.now()
      const startTime = endTime - 30 * 24 * 60 * 60 * 1000
      const response = await fetch(HYPERLIQUID_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'userFillsByTime',
          user: address,
          startTime,
          endTime,
          aggregateByTime: false,
        }),
      })
      if (!response.ok) return []
      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (e) {
      console.error(`Error fetching fills for ${address}:`, e)
      return []
    }
  }

  const refreshAllPositions = async () => {
    if (wallets.length === 0) {
      setPositionsData({})
      setEquityHistory({})
      setWinRateByAddress({})
      return
    }
    
    setLoading(true)
    const newPositionsData: Record<string, PositionData> = {}
    const newEquityHistory: Record<string, EquityHistory> = {}
    const newWinRateByAddress: Record<string, { winRate: number; recentTrades: number; winCount: number; lossCount: number } | null> = {}
    
    const promises = wallets.map(async (wallet) => {
      const [positionData, portfolioData, fills] = await Promise.all([
        fetchWalletPositions(wallet.address),
        fetchPortfolio(wallet.address),
        fetchUserFills(wallet.address),
      ])
      if (positionData) newPositionsData[wallet.address] = positionData
      if (portfolioData) newEquityHistory[wallet.address] = portfolioData
      const wr = getRecentWinRateFromFills(fills)
      newWinRateByAddress[wallet.address] = wr
    })

    await Promise.all(promises)
    setPositionsData(newPositionsData)
    setEquityHistory(newEquityHistory)
    setWinRateByAddress(newWinRateByAddress)
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
        <div className='flex items-center justify-end flex-shrink-0 flex-wrap gap-4'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <Switch
                id='auto-refresh-wallets'
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor='auto-refresh-wallets' className='text-sm cursor-pointer'>
                自动更新
              </Label>
              {autoRefresh && (
                <span className='text-xs text-muted-foreground'>
                  (每3分钟)
                </span>
              )}
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {walletsRefreshing && (
              <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
                <RefreshCw className='h-3.5 w-3.5 animate-spin' />
                更新数据中…
              </span>
            )}
            {lastRefresh && !walletsRefreshing && (
              <span className='text-sm text-muted-foreground'>
                最后更新: {format(lastRefresh, 'HH:mm:ss', { locale: zhCN })}
              </span>
            )}
            <Button
              onClick={refreshAllPositions}
              disabled={loading || (walletsLoading && wallets.length === 0) || wallets.length === 0}
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
          {/* 仅首次加载（无数据）时显示骨架屏；后台刷新时保留表格只更新数据 */}
          {walletsLoading && wallets.length === 0 ? (
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
                    <TableHead className='w-[48px]'>
                      <Checkbox
                        checked={
                          wallets.length > 0 &&
                          selectedWalletIds.size === wallets.length
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label='全选'
                      />
                    </TableHead>
                    <TableHead className='w-[40px]'></TableHead>
                    <TableHead className='sticky left-0 bg-background z-10'>钱包地址</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead className='text-right'>胜率</TableHead>
                    <TableHead className='text-right'>当前 Equity</TableHead>
                    <TableHead className='text-right'>24h 趋势</TableHead>
                    <TableHead className='text-right'>3天 趋势</TableHead>
                    <TableHead className='text-right'>总保证金</TableHead>
                    <TableHead className='text-right'>Total PnL</TableHead>
                    <TableHead className='text-right'>24h PnL</TableHead>
                    <TableHead className='text-right'>Perps Position Value</TableHead>
                    <TableHead className='text-right'>持仓数量</TableHead>
                    <TableHead className='text-right'>多/空</TableHead>
                    <TableHead className='text-right'>更新时间</TableHead>
                    <TableHead className='w-[80px]'>曲线</TableHead>
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
                    const hist = equityHistory[wallet.address]
                    const dayHist = hist?.day ?? []
                    const weekHist = hist?.week ?? []
                    const now = Date.now()
                    const v24h = valueAtTime(dayHist.length >= 2 ? dayHist : (hist?.threeDay ?? []), now - 24 * 60 * 60 * 1000)
                    const v30d = valueAtTime(weekHist, now - 30 * 24 * 60 * 60 * 1000)
                    const base = accountValue > 0 ? accountValue : (dayHist.length > 0 ? dayHist[dayHist.length - 1].v : weekHist.length > 0 ? weekHist[weekHist.length - 1].v : null)
                    const totalPnlVal = base != null && v30d != null ? base - v30d : null
                    const pnl24Val = base != null && v24h != null ? base - v24h : null
                    const longCount = positionData?.positions.filter(p => p.side === 'Long').length || 0
                    const shortCount = positionData?.positions.filter(p => p.side === 'Short').length || 0

                    return (
                      <>
                        <TableRow
                          key={wallet.id}
                          className={`cursor-pointer hover:bg-muted/50 ${
                            selectedWalletIds.has(wallet.id) ? 'bg-muted/50' : ''
                          }`}
                          onClick={() => toggleWallet(wallet.id)}
                        >
                          <TableCell
                            className='w-[48px]'
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedWalletIds.has(wallet.id)}
                              onCheckedChange={() => toggleSelect(wallet.id)}
                              aria-label={`选择 ${wallet.address}`}
                            />
                          </TableCell>
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
                            <WalletAddressCell address={wallet.address} linkToAnalyzer />
                          </TableCell>
                          <TableCell className='max-w-[200px]'>
                            <div className='truncate' title={wallet.note || ''}>
                              {wallet.note || '无备注'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {wallet.type ? (
                              <Badge variant='outline'>{getWalletTypeLabel(wallet.type)}</Badge>
                            ) : (
                              <span className='text-muted-foreground text-sm'>-</span>
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            {(() => {
                              const wr = winRateByAddress[wallet.address]
                              if (!wr) return <span className='text-muted-foreground text-sm'>-</span>
                              return (
                                <div className='flex flex-col items-end gap-0.5'>
                                  <span className={`text-sm font-semibold ${wr.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                    {wr.winRate}%
                                  </span>
                                  <span className='text-xs text-muted-foreground'>最近{wr.recentTrades}笔 胜{wr.winCount}/负{wr.lossCount}</span>
                                </div>
                              )
                            })()}
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
                            {(() => {
                              const hist = equityHistory[wallet.address]
                              if (!hist?.day?.length) return '-'
                              const start = hist.day[0].v
                              const end = accountValue
                              const delta = end - start
                              const pct = start > 0 ? (delta / start) * 100 : 0
                              return (
                                <div className='flex flex-col items-end gap-0.5'>
                                  <div className={`text-xs font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {delta >= 0 ? '+' : ''}{formatCurrency(delta)} ({delta >= 0 ? '+' : ''}{formatNumber(pct)}%)
                                  </div>
                                  <EquitySparkline data={hist.day} positive={delta >= 0} />
                                </div>
                              )
                            })()}
                          </TableCell>
                          <TableCell className='text-right'>
                            {(() => {
                              const hist = equityHistory[wallet.address]
                              if (!hist?.threeDay?.length) return '-'
                              const start = hist.threeDay[0].v
                              const end = accountValue
                              const delta = end - start
                              const pct = start > 0 ? (delta / start) * 100 : 0
                              return (
                                <div className='flex flex-col items-end gap-0.5'>
                                  <div className={`text-xs font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {delta >= 0 ? '+' : ''}{formatCurrency(delta)} ({delta >= 0 ? '+' : ''}{formatNumber(pct)}%)
                                  </div>
                                  <EquitySparkline data={hist.threeDay} positive={delta >= 0} />
                                </div>
                              )
                            })()}
                          </TableCell>
                          <TableCell className='text-right'>
                            {totalMargin > 0 ? formatCurrency(totalMargin) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${
                            totalPnlVal != null ? (totalPnlVal >= 0 ? 'text-green-600' : 'text-red-600') : ''
                          }`}>
                            {totalPnlVal != null ? (
                              <>
                                {totalPnlVal >= 0 ? (
                                  <TrendingUp className='inline h-3 w-3 mr-1' />
                                ) : (
                                  <TrendingDown className='inline h-3 w-3 mr-1' />
                                )}
                                {formatCurrency(totalPnlVal)}
                              </>
                            ) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            pnl24Val != null ? (pnl24Val >= 0 ? 'text-green-600' : 'text-red-600') : ''
                          }`}>
                            {pnl24Val != null ? formatCurrency(pnl24Val) : '-'}
                          </TableCell>
                          <TableCell className='text-right'>
                            {totalPositionValue > 0 ? formatCurrency(totalPositionValue) : '-'}
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
                            {equityHistory[wallet.address] ? (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 gap-1'
                                onClick={() => setCurveDialogAddress(wallet.address)}
                              >
                                <LineChartIcon className='h-4 w-4' />
                                曲线
                              </Button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DataTableRowActions row={{ original: wallet } as Row<Wallet>} />
                          </TableCell>
                        </TableRow>
                        {/* 展开的持仓明细 */}
                        {isExpanded && positionData && positionData.positions.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={18} className='p-0'>
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
                                        <TableHead className='text-right'>杠杆</TableHead>
                                        <TableHead className='text-right'>
                                          <div className='flex flex-col items-end'>
                                            <span>有效杠杆</span>
                                            <span className='text-xs text-muted-foreground font-normal'>爆仓距离%</span>
                                          </div>
                                        </TableHead>
                                        <TableHead className='text-right'>未实现盈亏</TableHead>
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
                                              <Badge variant='outline' className='w-fit'>{pos.leverage}x</Badge>
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
                                              <span className={`font-semibold ${
                                                pos.isProfitable ? 'text-green-600' : 'text-red-600'
                                              }`}>
                                                {pos.isProfitable ? '+' : ''}{formatCurrency(pos.unrealizedPnl)}
                                              </span>
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
        <WalletsBulkActions
          selectedCount={selectedWalletIds.size}
          onClearSelection={clearSelection}
          onBatchDelete={() => setShowBatchDeleteDialog(true)}
        />
        <WalletsMultiDeleteDialog
          open={showBatchDeleteDialog}
          onOpenChange={setShowBatchDeleteDialog}
          selectedWalletIds={Array.from(selectedWalletIds)}
          onSuccess={handleBatchDeleteSuccess}
        />
        {curveDialogAddress && (
          <EquityCurveDialog
            open={!!curveDialogAddress}
            onOpenChange={(open) => !open && setCurveDialogAddress(null)}
            address={curveDialogAddress}
            currentEquity={
              positionsData[curveDialogAddress]?.marginSummary
                ? parseFloat(positionsData[curveDialogAddress].marginSummary!.accountValue)
                : 0
            }
            day={equityHistory[curveDialogAddress]?.day ?? []}
            threeDay={equityHistory[curveDialogAddress]?.threeDay ?? []}
          />
        )}
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
