import { useState, useEffect, useCallback, useRef } from 'react'
import { useEvents } from './hooks/use-events'
import { EventsTable } from './components/events-table'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
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

export function Events() {
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
  } = useEvents()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const refreshInterval = 10 // 默认 10 秒
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
    refetch().finally(() => {
      isRefreshingRef.current = false
      setIsRefreshing(false)
    })
  }, [refetch])

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
                ({refreshInterval}秒)
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

      <div>
        {loading ? (
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
          <EventsTable data={events} />
        )}
      </div>
    </div>
  )
}
