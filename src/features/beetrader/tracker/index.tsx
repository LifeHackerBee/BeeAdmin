import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTracker } from './hooks/use-tracker'
import { useStatistics } from './hooks/use-statistics'
import { useWalletsData } from '../monitor/context/wallets-data-provider'
import { TrackerTable } from './components/tracker-table'
import { TrackerDialog } from './components/tracker-dialog'
import { StatisticsCards } from './components/statistics-cards'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ModuleGuard } from '@/components/rbac/module-guard'
import { BeeAdminModules } from '@/lib/rbac'

export function Tracker() {
  const { tasks, loading, error, refetch, createTask, startTask, stopTask, deleteTask } = useTracker()
  const { refetch: refetchStatistics } = useStatistics()
  const { wallets } = useWalletsData()
  const walletNotes = useMemo(
    () => Object.fromEntries((wallets || []).map((w) => [w.address, w.note || ''])),
    [wallets]
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const refreshInterval = 60 // 默认 60 秒 (1分钟)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)

  // 刷新函数（使用 useCallback 避免重复创建）
  const handleRefresh = useCallback(() => {
    // 防止重复刷新
    if (isRefreshingRef.current) {
      return
    }
    
    isRefreshingRef.current = true
    setIsRefreshing(true)
    Promise.all([refetch(), refetchStatistics()]).finally(() => {
      isRefreshingRef.current = false
      setIsRefreshing(false)
    })
  }, [refetch, refetchStatistics])

  // 自动刷新逻辑
  useEffect(() => {
    if (autoRefresh && !loading) {
      // 清除旧的定时器
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // 设置新的定时器
      intervalRef.current = setInterval(() => {
        // 检查页面是否可见且不在加载中
        if (!document.hidden && !isRefreshingRef.current) {
          handleRefresh()
        }
      }, refreshInterval * 1000)

      // 清理函数
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    } else {
      // 如果禁用了自动刷新，清除定时器
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoRefresh, refreshInterval, loading, handleRefresh])

  // 当任务列表更新时，同时刷新统计
  useEffect(() => {
    refetchStatistics()
  }, [tasks.length, refetchStatistics])

  // 页面可见性变化时处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      // 当页面变为可见时，立即刷新一次
      if (!document.hidden && autoRefresh) {
        handleRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [autoRefresh, handleRefresh])

  // 处理任务操作后的刷新
  const handleTaskAction = async (action: () => Promise<unknown>) => {
    await action()
    refetch()
    refetchStatistics()
  }

  // 调试日志
  console.log('Tracker 组件渲染:', { 
    tasksCount: tasks.length, 
    loading, 
    error: error?.message,
    tasks: tasks 
  })

  return (
    <ModuleGuard module={BeeAdminModules.BEETRADER_TRACKER}>
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
          
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              创建任务
            </Button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className='flex-shrink-0'>
        <StatisticsCards />
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
          <TrackerTable 
            data={tasks} 
            walletNotes={walletNotes}
            onStart={(taskId) => handleTaskAction(() => startTask(taskId))}
            onStop={(taskId) => handleTaskAction(() => stopTask(taskId))}
            onDelete={(taskId) => handleTaskAction(() => deleteTask(taskId))}
          />
        )}
      </div>
      <TrackerDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onCreate={async (request) => {
          await createTask(request)
          refetchStatistics()
        }}
        onSuccess={() => {
          refetch()
          refetchStatistics()
        }}
      />
    </div>
    </ModuleGuard>
  )
}
