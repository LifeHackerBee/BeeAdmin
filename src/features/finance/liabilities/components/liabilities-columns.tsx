import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Liability } from '../data/schema'
import {
  liabilityTypeLabels,
  liabilityStatusLabels,
} from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'
import { format } from 'date-fns'
import { formatCurrency } from '../utils/format'

export function createLiabilitiesColumns(): ColumnDef<Liability>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className='translate-y-[2px]'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
          className='translate-y-[2px]'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='负债名称' />
      ),
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='类型' />
      ),
      cell: ({ row }) => {
        const type = row.getValue('type') as Liability['type']
        return (
          <Badge variant='outline'>{liabilityTypeLabels[type]}</Badge>
        )
      },
    },
    {
      accessorKey: 'total_amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='总金额' />
      ),
      cell: ({ row }) => {
        const amount = row.getValue('total_amount') as number
        const currency = row.original.currency || 'CNY'
        return (
          <div className='font-medium'>
            {formatCurrency(amount, currency)}
          </div>
        )
      },
    },
    {
      accessorKey: 'remaining_principal',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='剩余本金' />
      ),
      cell: ({ row }) => {
        const amount = row.original.remaining_principal
        const currency = row.original.currency || 'CNY'
        return (
          <div className='font-medium text-orange-600'>
            {formatCurrency(amount, currency)}
          </div>
        )
      },
    },
    {
      accessorKey: 'current_annual_rate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='当前年利率' />
      ),
      cell: ({ row }) => {
        const rate = row.original.current_annual_rate
        return <div>{(rate * 100).toFixed(4)}%</div>
      },
    },
    {
      accessorKey: 'avg_annual_rate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='平均年利率' />
      ),
      cell: ({ row }) => {
        const rate = row.original.avg_annual_rate
        if (rate === undefined || rate === null) {
          return <div className='text-muted-foreground'>-</div>
        }
        return <div className='text-blue-600'>{(rate * 100).toFixed(4)}%</div>
      },
    },
    {
      accessorKey: 'monthly_payment',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='月供' />
      ),
      cell: ({ row }) => {
        const amount =
          row.original.calculated_monthly_payment ??
          row.original.monthly_payment ??
          0
        const currency = row.original.currency || 'CNY'
        const isCalculated = row.original.calculated_monthly_payment !== undefined
        return (
          <div className='font-medium'>
            {formatCurrency(amount, currency)}
            {isCalculated && (
              <span className='ml-1 text-xs text-muted-foreground'>(计算)</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'total_periods',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='总期数' />
      ),
      cell: ({ row }) => {
        const total = row.original.total_periods
        const remaining = row.original.remaining_periods
        const paid = row.original.paid_periods ?? total - remaining
        return (
          <div className='text-sm'>
            <div>总计: {total} 期</div>
            <div className='text-muted-foreground'>
              已还: {paid} / 剩余: {remaining}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'start_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='开始日期' />
      ),
      cell: ({ row }) => {
        const date = row.getValue('start_date') as string
        try {
          return <div className='w-[120px]'>{format(new Date(date), 'yyyy-MM-dd')}</div>
        } catch {
          return <div className='w-[120px]'>{date}</div>
        }
      },
    },
    {
      accessorKey: 'payment_method',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='还款方式' />
      ),
      cell: ({ row }) => {
        const method = row.original.payment_method
        const labels: Record<string, string> = {
          equal_payment: '等额本息',
          equal_principal: '等额本金',
          daily_interest: '按日计息',
          interest_only: '只还利息',
          other: '其他',
        }
        return (
          <Badge variant='outline'>{labels[method] || method}</Badge>
        )
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='状态' />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as Liability['status']
        const variant =
          status === 'paid_off'
            ? 'default'
            : status === 'defaulted'
              ? 'destructive'
              : 'secondary'
        return (
          <Badge variant={variant}>{liabilityStatusLabels[status]}</Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
  ]
}
