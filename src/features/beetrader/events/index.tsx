import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useEvents } from './hooks/use-events'
import { useWalletsData } from '../monitor/context/wallets-data-provider'
import { useMarketPrices } from '../macroscopic/hooks/use-market-prices'
import { EventsTable } from './components/events-table'
import { Button } from '@/components/ui/button'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { getPageNumbers } from '@/lib/utils'

const EVENTS_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function Events() {
  const search = useSearch({ from: '/_authenticated/beetrader/whale-wallet-manage' } as any)
  const navigate = useNavigate({ from: '/beetrader/whale-wallet-manage' } as any)
  const page = Math.max(1, Number((search as any)?.page) || 1)
  const pageSize = EVENTS_PAGE_SIZE_OPTIONS.includes(Number((search as any)?.pageSize)) ? Number((search as any)?.pageSize) : 20

  const {
    events,
    loading,
    error,
    refetch,
    total,
    walletAddress,
    setWalletAddress,
    eventType,
    setEventType,
    coin,
    setCoin,
  } = useEvents({ page, pageSize })
  const { wallets, loading: walletsLoading, refetch: refetchWallets } = useWalletsData()
  const walletNotes = useMemo(
    () => Object.fromEntries((wallets || []).map((w) => [w.address, w.note || ''])),
    [wallets]
  )
  
  // 获取当前市场价格（每 5 秒刷新一次）
  const { prices: currentPrices, refetch: refetchPrices } = useMarketPrices(5000)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const refreshInterval = 180 // 默认 3 分钟
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)

  // 刷新函数
  const handleRefresh = useCallback(() => {
    if (isRefreshingRef.current) {
      return
    }

    isRefreshingRef.current = true
    setIsRefreshing(true)
    
    // 同时刷新事件、价格和钱包备注
    Promise.all([refetch(), refetchPrices(), refetchWallets()]).finally(() => {
      isRefreshingRef.current = false
      setIsRefreshing(false)
    })
  }, [refetch, refetchPrices, refetchWallets])

  // 自动刷新逻辑
  useEffect(() => {
    if (autoRefresh && !loading) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      intervalRef.current = setInterval(() => {
        if (!document.hidden && !isRefreshingRef.current) {
          handleRefresh()
        }
      }, refreshInterval * 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoRefresh, refreshInterval, loading, handleRefresh])

  // 页面可见性变化时处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && autoRefresh) {
        handleRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [autoRefresh, handleRefresh])

  const totalCount = total ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageNumbers = getPageNumbers(currentPage, pageCount)

  const setPage = useCallback(
    (p: number) => {
      navigate({
        search: (prev: any) => ({ ...prev, page: Math.max(1, Math.min(p, pageCount)) }),
      } as any)
    },
    [navigate, pageCount]
  )
  const setPageSize = useCallback(
    (size: number) => {
      navigate({
        search: (prev: any) => ({ ...prev, pageSize: size, page: 1 }),
      } as any)
    },
    [navigate]
  )

  return (
    <div className='flex flex-col space-y-4'>
      <div className='flex items-center justify-end flex-shrink-0'>
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
                ({refreshInterval >= 60 ? `${refreshInterval / 60}分钟` : `${refreshInterval}秒`})
              </span>
            )}
          </div>

          <Button variant='outline' onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 筛选器 */}
      <div className='flex items-center gap-4 flex-shrink-0'>
        <div className='flex items-center gap-2'>
          <Label htmlFor='wallet-filter' className='text-sm whitespace-nowrap'>
            钱包地址:
          </Label>
          <Input
            id='wallet-filter'
            placeholder='输入钱包地址过滤'
            value={walletAddress || ''}
            onChange={(e) => setWalletAddress(e.target.value || undefined)}
            className='w-64'
          />
        </div>

        <div className='flex items-center gap-2'>
          <Label htmlFor='event-type-filter' className='text-sm whitespace-nowrap'>
            事件类型:
          </Label>
          <Select value={eventType || 'all'} onValueChange={(v) => setEventType(v === 'all' ? undefined : v)}>
            <SelectTrigger id='event-type-filter' className='w-40'>
              <SelectValue placeholder='全部' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部</SelectItem>
              <SelectItem value='OPEN'>开仓</SelectItem>
              <SelectItem value='CLOSE'>平仓</SelectItem>
              <SelectItem value='INCREASE'>加仓</SelectItem>
              <SelectItem value='DECREASE'>减仓</SelectItem>
              <SelectItem value='FLIP'>翻转</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-center gap-2'>
          <Label htmlFor='coin-filter' className='text-sm whitespace-nowrap'>
            币种:
          </Label>
          <Input
            id='coin-filter'
            placeholder='输入币种过滤'
            value={coin || ''}
            onChange={(e) => setCoin(e.target.value || undefined)}
            className='w-32'
          />
        </div>

        {total !== null && (
          <div className='ml-auto text-sm text-muted-foreground'>
            共 {total} 条记录
          </div>
        )}
      </div>

      <div className='flex flex-col gap-4'>
        {loading || walletsLoading ? (
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
          <>
            <EventsTable data={events} walletNotes={walletNotes} currentPrices={currentPrices} />
            {totalCount > 0 && (
              <div className='flex flex-wrap items-center justify-between gap-4 border-t pt-4'>
                <div className='flex items-center gap-4'>
                  <p className='text-sm text-muted-foreground'>
                    共 {totalCount} 条，第 {currentPage} / {pageCount} 页
                  </p>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm text-muted-foreground'>每页</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => setPageSize(Number(v))}
                    >
                      <SelectTrigger className='h-8 w-[70px]'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side='top'>
                        {EVENTS_PAGE_SIZE_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className='text-sm text-muted-foreground'>条</span>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className='h-4 w-4 -ml-0.5' />
                  </Button>
                  {pageNumbers.map((num, i) =>
                    num === '...' ? (
                      <span key={`ellipsis-${i}`} className='px-1 text-sm text-muted-foreground'>
                        …
                      </span>
                    ) : (
                      <Button
                        key={num}
                        variant={currentPage === num ? 'default' : 'outline'}
                        size='icon'
                        className='h-8 w-8'
                        onClick={() => setPage(num as number)}
                      >
                        {num}
                      </Button>
                    )
                  )}
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage >= pageCount}
                  >
                    <ChevronRight className='h-4 w-4 -mr-0.5' />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
