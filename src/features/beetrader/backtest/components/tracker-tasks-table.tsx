import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Play, Square, Trash2, TrendingUp, Radar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BacktestTrackerTask } from '../hooks/use-backtest-tracker'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

interface TrackerTasksTableProps {
  data: BacktestTrackerTask[]
  onStart: (taskId: number) => Promise<unknown>
  onStop: (taskId: number) => Promise<unknown>
  onDelete: (taskId: number) => Promise<unknown>
  onViewChart: (task: BacktestTrackerTask) => void
}

export function TrackerTasksTable({ data, onStart, onStop, onDelete, onViewChart }: TrackerTasksTableProps) {
  const columns: ColumnDef<BacktestTrackerTask>[] = [
    {
      accessorKey: 'task_name',
      header: '任务名称',
      cell: ({ row }) => {
        return (
          <div className='flex items-center gap-1.5'>
            {row.original.source === 'order_radar' && (
              <Radar className='h-3.5 w-3.5 text-blue-500 flex-shrink-0' />
            )}
            <span className='font-medium'>{row.original.task_name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'coin',
      header: '币种',
      cell: ({ row }) => {
        return (
          <div className='flex items-center gap-2'>
            <span className='font-medium'>{row.original.coin}</span>
            <Badge variant={row.original.entry_direction === 'long' ? 'default' : 'destructive'}>
              {row.original.entry_direction === 'long' ? '多' : '空'}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => {
        const { status, exit_reason, final_pnl } = row.original

        if (status === 'completed' && exit_reason) {
          const isWin = final_pnl != null && final_pnl > 0
          const exitLabels: Record<string, string> = {
            tp_hit: '止盈',
            sl_hit: '止损',
            timeout: '超时',
          }
          return (
            <Badge variant={isWin ? 'default' : 'destructive'} className='text-xs'>
              {exitLabels[exit_reason] || exit_reason}
            </Badge>
          )
        }

        const variants = {
          running: 'default',
          stopped: 'secondary',
          completed: 'outline',
        } as const
        const labels = {
          running: '运行中',
          stopped: '已停止',
          completed: '已完成',
        }
        return <Badge variant={variants[status]}>{labels[status]}</Badge>
      },
    },
    {
      accessorKey: 'entry_price',
      header: '入场价格',
      cell: ({ row }) => {
        return row.original.entry_price 
          ? `$${row.original.entry_price.toFixed(2)}`
          : '-'
      },
    },
    {
      accessorKey: 'last_tracked_price',
      header: '最新价格',
      cell: ({ row }) => {
        const entry = row.original.entry_price
        const current = row.original.last_tracked_price
        
        if (!entry || !current) return '-'
        
        const change = ((current - entry) / entry) * 100
        const isPositive = change > 0
        
        return (
          <div className='flex flex-col'>
            <span className='font-medium'>${current.toFixed(2)}</span>
            <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{change.toFixed(2)}%
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'unrealized_pnl',
      header: '盈亏',
      cell: ({ row }) => {
        const { entry_price, last_tracked_price, entry_direction, test_amount, test_leverage, status, final_pnl, final_roi } = row.original

        // 已结算的任务直接显示最终结果
        if (status === 'completed' && final_pnl != null && final_roi != null) {
          const isPositive = final_pnl >= 0
          return (
            <div className='flex flex-col'>
              <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{final_pnl.toFixed(2)} USDC
              </span>
              <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{final_roi.toFixed(2)}%
              </span>
            </div>
          )
        }

        if (!entry_price || !last_tracked_price || !entry_direction) return '-'

        const priceChangePct = ((last_tracked_price - entry_price) / entry_price)
        const pnl = entry_direction === 'long'
          ? priceChangePct * test_amount * test_leverage
          : -priceChangePct * test_amount * test_leverage
        const roi = (pnl / test_amount) * 100
        const isPositive = pnl >= 0

        return (
          <div className='flex flex-col'>
            <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{pnl.toFixed(2)} USDC
            </span>
            <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{roi.toFixed(2)}%
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'track_interval_seconds',
      header: '追踪间隔',
      cell: ({ row }) => {
        const seconds = row.original.track_interval_seconds
        if (seconds < 60) return `${seconds}秒`
        if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
        return `${Math.floor(seconds / 3600)}小时`
      },
    },
    {
      accessorKey: 'total_tracks',
      header: '追踪次数',
      cell: ({ row }) => {
        return <div className='text-center'>{row.original.total_tracks}</div>
      },
    },
    {
      accessorKey: 'test_amount',
      header: '测试金额',
      cell: ({ row }) => {
        return `${row.original.test_amount} USDC × ${row.original.test_leverage}x`
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const task = row.original

        return (
          <div className='flex items-center gap-2'>
            {task.status === 'stopped' && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => onStart(task.id)}
              >
                <Play className='h-4 w-4 mr-1' />
                启动
              </Button>
            )}

            {task.status === 'running' && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => onStop(task.id)}
              >
                <Square className='h-4 w-4 mr-1' />
                停止
              </Button>
            )}

            <Button
              variant='outline'
              size='sm'
              onClick={() => onViewChart(task)}
            >
              <TrendingUp className='h-4 w-4 mr-1' />
              图表
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant='ghost' size='sm'>
                  <Trash2 className='h-4 w-4' />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除追踪任务 "{task.task_name}" 吗？此操作将删除所有相关的追踪数据且无法恢复。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(task.id)}>
                    确认删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className='h-24 text-center'>
                暂无数据
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
