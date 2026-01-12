import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Asset } from '../data/schema'
import { assetTypeLabels, assetStatusLabels } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'
import { format } from 'date-fns'

function formatCurrency(value: number, currency: string = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function createAssetsColumns(): ColumnDef<Asset>[] {
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
        <DataTableColumnHeader column={column} title='资产名称' />
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
        const type = row.getValue('type') as Asset['type']
        return <Badge variant='outline'>{assetTypeLabels[type]}</Badge>
      },
    },
    {
      accessorKey: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='分类' />
      ),
      cell: ({ row }) => {
        const category = row.getValue('category') as string | undefined
        return <div className='text-sm text-muted-foreground'>{category || '-'}</div>
      },
    },
    {
      accessorKey: 'current_value',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='当前价值' />
      ),
      cell: ({ row }) => {
        const value = row.getValue('current_value') as number
        const currency = row.original.currency || 'CNY'
        return (
          <div className='font-medium'>{formatCurrency(value, currency)}</div>
        )
      },
    },
    {
      accessorKey: 'purchase_value',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='购买价值' />
      ),
      cell: ({ row }) => {
        const value = row.original.purchase_value
        const currency = row.original.currency || 'CNY'
        if (!value) return <div className='text-muted-foreground'>-</div>
        return <div className='text-sm'>{formatCurrency(value, currency)}</div>
      },
    },
    {
      accessorKey: 'purchase_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='购买日期' />
      ),
      cell: ({ row }) => {
        const date = row.original.purchase_date
        if (!date) return <div className='text-muted-foreground'>-</div>
        try {
          return <div className='text-sm'>{format(new Date(date), 'yyyy-MM-dd')}</div>
        } catch {
          return <div className='text-sm'>{date}</div>
        }
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='状态' />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as Asset['status']
        return (
          <Badge
            variant={
              status === 'active'
                ? 'default'
                : status === 'sold'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {assetStatusLabels[status]}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'institution',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='机构' />
      ),
      cell: ({ row }) => {
        const institution = row.original.institution
        return <div className='text-sm text-muted-foreground'>{institution || '-'}</div>
      },
    },
    {
      accessorKey: 'location',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='位置' />
      ),
      cell: ({ row }) => {
        const location = row.original.location
        return <div className='text-sm text-muted-foreground'>{location || '-'}</div>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
  ]
}
