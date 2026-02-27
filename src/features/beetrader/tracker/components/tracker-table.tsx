import { useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Play, Square } from 'lucide-react'
import { WalletAddressCell } from '../../components/wallet-address-cell'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { MonitorTask } from '../hooks/use-tracker'
import { formatDateTime } from '@/lib/timezone'
import { TrackerBulkActions } from './tracker-bulk-actions'
import { TrackerMultiStopDialog } from './tracker-multi-stop-dialog'
import { TrackerMultiDeleteDialog } from './tracker-multi-delete-dialog'

interface TrackerTableProps {
  data: MonitorTask[]
  /** 钱包地址 -> 备注，用于显示在表格中 */
  walletNotes?: Record<string, string>
  onStart: (taskId: string) => Promise<unknown>
  onStop: (taskId: string) => Promise<unknown>
  onDelete: (taskId: string) => Promise<void>
  onStopTasks?: (taskIds: string[]) => Promise<void>
  onDeleteTasks?: (taskIds: string[]) => Promise<void>
}

export function TrackerTable({
  data,
  walletNotes = {},
  onStart,
  onStop,
  onDelete,
  onStopTasks,
  onDeleteTasks,
}: TrackerTableProps) {
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [operatingTaskId, setOperatingTaskId] = useState<string | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [showBatchStopDialog, setShowBatchStopDialog] = useState(false)
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)
  const [isBatchOperating, setIsBatchOperating] = useState(false)

  const toggleSelect = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedTaskIds.size === data.length) {
      setSelectedTaskIds(new Set())
    } else {
      setSelectedTaskIds(new Set(data.map((t) => t.task_id)))
    }
  }, [data, selectedTaskIds.size])

  const clearSelection = useCallback(() => setSelectedTaskIds(new Set()), [])

  const handleBatchStop = useCallback(() => setShowBatchStopDialog(true), [])
  const handleBatchDelete = useCallback(() => setShowBatchDeleteDialog(true), [])

  const handleBatchStopConfirm = useCallback(
    async (taskIds: string[]) => {
      if (!onStopTasks) return
      setIsBatchOperating(true)
      try {
        await onStopTasks(taskIds)
        clearSelection()
      } finally {
        setIsBatchOperating(false)
      }
    },
    [onStopTasks, clearSelection]
  )

  const handleBatchDeleteConfirm = useCallback(
    async (taskIds: string[]) => {
      if (!onDeleteTasks) return
      setIsBatchOperating(true)
      try {
        await onDeleteTasks(taskIds)
        clearSelection()
      } finally {
        setIsBatchOperating(false)
      }
    },
    [onDeleteTasks, clearSelection]
  )

  const hasBatchActions = Boolean(onStopTasks && onDeleteTasks)

  const handleStart = async (taskId: string) => {
    try {
      setOperatingTaskId(taskId)
      await onStart(taskId)
    } catch (error) {
      console.error('启动任务失败:', error)
    } finally {
      setOperatingTaskId(null)
    }
  }

  const handleStop = async (taskId: string) => {
    try {
      setOperatingTaskId(taskId)
      await onStop(taskId)
    } catch (error) {
      console.error('停止任务失败:', error)
    } finally {
      setOperatingTaskId(null)
    }
  }

  const handleDelete = (taskId: string) => {
    setDeletingTaskId(taskId)
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      running: { variant: 'default', label: '运行中' },
      stopped: { variant: 'secondary', label: '已停止' },
      pending: { variant: 'outline', label: '待启动' },
      error: { variant: 'destructive', label: '错误' },
      deleted: { variant: 'secondary', label: '已删除' },
    }
    const config = statusMap[status] || { variant: 'secondary' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (data.length === 0) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <div className='text-center'>
          <p className='text-lg mb-2'>暂无监控任务</p>
          <p className='text-sm'>点击"创建任务"开始监控钱包</p>
          <p className='text-xs mt-2 text-muted-foreground'>
            如果已创建任务但仍显示为空，请检查浏览器控制台的错误信息
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='rounded-md border overflow-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              {hasBatchActions && (
                <TableHead className='w-[48px]'>
                  <Checkbox
                    checked={
                      data.length > 0 && selectedTaskIds.size === data.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label='全选'
                  />
                </TableHead>
              )}
              <TableHead>钱包地址</TableHead>
              <TableHead className='w-[140px]'>备注</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>间隔</TableHead>
              <TableHead>检查次数</TableHead>
              <TableHead>成功/失败</TableHead>
              <TableHead>事件数</TableHead>
              <TableHead>最后检查</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className='text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((task) => (
              <TableRow
                key={task.task_id}
                data-state={selectedTaskIds.has(task.task_id) ? 'selected' : undefined}
                className={
                  selectedTaskIds.has(task.task_id)
                    ? 'bg-muted/50'
                    : undefined
                }
              >
                {hasBatchActions && (
                  <TableCell className='w-[48px]'>
                    <Checkbox
                      checked={selectedTaskIds.has(task.task_id)}
                      onCheckedChange={() => toggleSelect(task.task_id)}
                      aria-label={`选择任务 ${task.wallet_address}`}
                    />
                  </TableCell>
                )}
                <TableCell className='min-w-0'>
                  <WalletAddressCell address={task.wallet_address} />
                </TableCell>
                <TableCell className='text-sm text-muted-foreground max-w-[140px] truncate' title={walletNotes[task.wallet_address] || ''}>
                  {walletNotes[task.wallet_address] || '无备注'}
                </TableCell>
                <TableCell>{getStatusBadge(task.status)}</TableCell>
                <TableCell>{task.interval}s</TableCell>
                <TableCell>{task.check_count}</TableCell>
                <TableCell>
                  <span className='text-green-600'>{task.success_count}</span>
                  <span className='mx-1'>/</span>
                  <span className='text-red-600'>{task.error_count}</span>
                </TableCell>
                <TableCell>
                  {task.total_events_count > 0 ? (
                    <Badge variant='secondary'>{task.total_events_count}</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {task.last_check_time ? formatDateTime(task.last_check_time) : '从未检查'}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {task.created_at ? formatDateTime(task.created_at) : '-'}
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex items-center justify-end gap-2'>
                    {task.status === 'running' ? (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleStop(task.task_id)}
                        disabled={operatingTaskId === task.task_id}
                      >
                        <Square
                          className={`h-4 w-4 mr-1 ${
                            operatingTaskId === task.task_id ? 'animate-pulse' : ''
                          }`}
                        />
                        停止
                      </Button>
                    ) : (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleStart(task.task_id)}
                        disabled={operatingTaskId === task.task_id}
                      >
                        <Play
                          className={`h-4 w-4 mr-1 ${
                            operatingTaskId === task.task_id ? 'animate-pulse' : ''
                          }`}
                        />
                        启动
                      </Button>
                    )}
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleDelete(task.task_id)}
                      disabled={operatingTaskId === task.task_id}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={deletingTaskId !== null}
        onOpenChange={(open) => !open && setDeletingTaskId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除任务 {deletingTaskId ? (data.find(t => t.task_id === deletingTaskId)?.wallet_address || '') : ''} 吗？
              如果任务正在运行，将先停止任务再删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingTaskId) {
                  try {
                    await onDelete(deletingTaskId)
                    setDeletingTaskId(null)
                  } catch (error) {
                    console.error('删除任务失败:', error)
                  }
                }
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {hasBatchActions && (
        <>
          <TrackerBulkActions
            selectedCount={selectedTaskIds.size}
            onClearSelection={clearSelection}
            onBatchStop={handleBatchStop}
            onBatchDelete={handleBatchDelete}
            isOperating={isBatchOperating}
          />
          <TrackerMultiStopDialog
            open={showBatchStopDialog}
            onOpenChange={setShowBatchStopDialog}
            selectedTaskIds={Array.from(selectedTaskIds)}
            onConfirm={handleBatchStopConfirm}
            onSuccess={clearSelection}
          />
          <TrackerMultiDeleteDialog
            open={showBatchDeleteDialog}
            onOpenChange={setShowBatchDeleteDialog}
            selectedTaskIds={Array.from(selectedTaskIds)}
            onConfirm={handleBatchDeleteConfirm}
            onSuccess={clearSelection}
          />
        </>
      )}
    </>
  )
}
