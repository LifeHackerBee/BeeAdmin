import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { taskTypes, statuses } from '../data/data'
import { type Task } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'
import { format } from 'date-fns'

export const tasksColumns: ColumnDef<Task>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='全选'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='选择行'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='任务ID' />
    ),
    cell: ({ row }) => <div className='w-[100px] font-mono text-sm'>{row.getValue('id')}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='任务名称' />
    ),
    meta: {
      className: 'ps-1 max-w-0 w-1/4',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const taskType = taskTypes.find((type) => type.value === row.original.type)

      return (
        <div className='flex space-x-2'>
          {taskType && (
            <Badge variant='outline' className='flex items-center gap-1'>
              {taskType.icon && <taskType.icon className='h-3 w-3' />}
              {taskType.label}
            </Badge>
          )}
          <span className='truncate font-medium'>{row.getValue('name')}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='状态' />
    ),
    meta: { className: 'ps-1', tdClassName: 'ps-4' },
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue('status')
      )

      if (!status) {
        return null
      }

      const statusColors: Record<string, string> = {
        running: 'text-blue-600',
        success: 'text-green-600',
        failed: 'text-red-600',
        pending: 'text-yellow-600',
        stopped: 'text-gray-600',
      }

      return (
        <div className={`flex w-[100px] items-center gap-2 ${statusColors[status.value] || ''}`}>
          {status.icon && (
            <status.icon className='size-4' />
          )}
          <span>{status.label}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'schedule',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='调度配置' />
    ),
    cell: ({ row }) => (
      <div className='font-mono text-xs'>{row.getValue('schedule')}</div>
    ),
  },
  {
    accessorKey: 'lastRun',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='最后运行' />
    ),
    cell: ({ row }) => {
      const lastRun = row.original.lastRun
      return lastRun ? (
        <div className='text-sm'>
          {format(lastRun, 'MM-dd HH:mm')}
        </div>
      ) : (
        <span className='text-muted-foreground'>-</span>
      )
    },
  },
  {
    accessorKey: 'nextRun',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='下次运行' />
    ),
    cell: ({ row }) => {
      const nextRun = row.original.nextRun
      return nextRun ? (
        <div className='text-sm'>
          {format(nextRun, 'MM-dd HH:mm')}
        </div>
      ) : (
        <span className='text-muted-foreground'>-</span>
      )
    },
  },
  {
    accessorKey: 'successCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='成功次数' />
    ),
    cell: ({ row }) => {
      const count = row.original.successCount ?? 0
      return <span className='text-green-600 font-medium'>{count}</span>
    },
  },
  {
    accessorKey: 'failureCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='失败次数' />
    ),
    cell: ({ row }) => {
      const count = row.original.failureCount ?? 0
      return <span className='text-red-600 font-medium'>{count}</span>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
