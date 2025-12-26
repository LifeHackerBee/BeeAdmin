import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { categories, currencies } from '../data/data'
import { type Expense } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'
import { format } from 'date-fns'

export const expensesColumns: ColumnDef<Expense>[] = [
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
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='ID' />
    ),
    cell: ({ row }) => <div className='w-[100px]'>{row.getValue('id')}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'spending_time',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='日期' />
    ),
    cell: ({ row }) => {
      const spendingTime = row.getValue('spending_time') as string | null
      if (!spendingTime) {
        return <div className='w-[120px] text-muted-foreground'>-</div>
      }
      try {
        const date = new Date(spendingTime)
        if (isNaN(date.getTime())) {
          return <div className='w-[120px]'>{spendingTime}</div>
        }
        return <div className='w-[120px]'>{format(date, 'yyyy-MM-dd HH:mm')}</div>
      } catch {
        return <div className='w-[120px]'>{spendingTime}</div>
      }
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='金额' />
    ),
    meta: { className: 'ps-1', tdClassName: 'ps-4' },
    cell: ({ row }) => {
      const amount = row.getValue('amount') as number | null
      const currency = row.original.currency || 'CNY'
      const currencySymbol = currency === 'CNY' ? '¥' : currency === 'HKD' ? 'HK$' : currency
      if (amount === null || amount === undefined) {
        return <div className='font-medium text-muted-foreground'>-</div>
      }
      return (
        <div className='font-medium text-red-600'>
          {currencySymbol}{amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )
    },
  },
  {
    accessorKey: 'currency',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='币种' />
    ),
    meta: { className: 'ps-1', tdClassName: 'ps-4' },
    cell: ({ row }) => {
      const currency = row.getValue('currency') as string | null
      if (!currency) {
        return <span className='text-muted-foreground'>-</span>
      }
      const currencyOption = currencies.find((c) => c.value === currency)
      return (
        <Badge variant='outline' className='text-xs'>
          {currencyOption?.label || currency}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const currency = row.getValue(id) as string | null
      if (!currency) return false
      return value.includes(currency)
    },
  },
  {
    accessorKey: 'category',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='分类' />
    ),
    meta: { className: 'ps-1', tdClassName: 'ps-4' },
    cell: ({ row }) => {
      const categoryValue = row.getValue('category') as string | null
      if (!categoryValue) {
        return <span className='text-muted-foreground'>-</span>
      }
      const category = categories.find(
        (cat) => cat.value === categoryValue
      )

      if (!category) {
        return <span>{categoryValue}</span>
      }

      return (
        <div className='flex w-[120px] items-center gap-2'>
          {category.icon && (
            <category.icon className='size-4 text-muted-foreground' />
          )}
          <span>{category.label}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const category = row.getValue(id) as string | null
      if (!category) return false
      return value.includes(category)
    },
  },
  {
    accessorKey: 'note',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='备注' />
    ),
    meta: {
      className: 'ps-1 max-w-0 w-2/3',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const note = row.getValue('note') as string | null
      return (
        <div className='flex space-x-2'>
          <span className='truncate font-medium'>{note || '-'}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'device_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='设备' />
    ),
    meta: { className: 'ps-1', tdClassName: 'ps-4' },
    cell: ({ row }) => {
      const deviceName = row.getValue('device_name') as string | null
      return (
        <Badge variant='secondary' className='text-xs'>
          {deviceName || '-'}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]

