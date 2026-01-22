import { useState } from 'react'
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
import { Trash2, Play, Square, ExternalLink } from 'lucide-react'
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

interface TrackerTableProps {
  data: MonitorTask[]
  onStart: (taskId: string) => Promise<unknown>
  onStop: (taskId: string) => Promise<unknown>
  onDelete: (taskId: string) => Promise<void>
}

export function TrackerTable({ data, onStart, onStop, onDelete }: TrackerTableProps) {
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [operatingTaskId, setOperatingTaskId] = useState<string | null>(null)

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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
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

  console.log('TrackerTable 渲染，数据数量:', data.length, '数据:', data)

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
              <TableHead>钱包地址</TableHead>
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
              <TableRow key={task.task_id}>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <code className='text-sm font-mono'>{formatAddress(task.wallet_address)}</code>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 w-6 p-0'
                      onClick={() => {
                        window.open(
                          `https://app.hyperliquid.xyz/explorer?address=${task.wallet_address}`,
                          '_blank'
                        )
                      }}
                    >
                      <ExternalLink className='h-3 w-3' />
                    </Button>
                  </div>
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
              确定要删除任务 {deletingTaskId ? formatAddress(data.find(t => t.task_id === deletingTaskId)?.wallet_address || '') : ''} 吗？
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
    </>
  )
}
