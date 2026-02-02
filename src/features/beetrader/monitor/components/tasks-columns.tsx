import { type ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Wallet } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { walletTypes, getWalletTypeLabel } from '../data/data'
import { Badge } from '@/components/ui/badge'
import { useHyperliquidInfo } from '../hooks/use-hyperliquid-info'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation() // 防止触发行选择
    
    try {
      // 优先使用 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(address)
        setCopied(true)
        toast.success('地址已复制')
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback: 使用传统的 execCommand 方法
        const textArea = document.createElement('textarea')
        textArea.value = address
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          const successful = document.execCommand('copy')
          if (successful) {
            setCopied(true)
            toast.success('地址已复制')
            setTimeout(() => setCopied(false), 2000)
          } else {
            throw new Error('复制失败')
          }
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (error) {
      console.error('复制失败:', error)
      toast.error('复制失败，请手动复制')
    }
  }

  return (
    <Button
      variant='ghost'
      size='icon'
      className='h-6 w-6'
      onClick={handleCopy}
      title='复制地址'
    >
      {copied ? (
        <Check className='h-3 w-3 text-green-500' />
      ) : (
        <Copy className='h-3 w-3' />
      )}
    </Button>
  )
}

function HyperliquidInfoCell({ address }: { address: string }) {
  const { data, isLoading, error } = useHyperliquidInfo(address)

  if (isLoading) {
    return (
      <div className='flex items-center gap-2'>
        <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
        <span className='text-xs text-muted-foreground'>加载中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='flex items-center gap-2 cursor-help'>
            <AlertCircle className='h-3 w-3 text-destructive' />
            <span className='text-xs text-muted-foreground'>获取失败</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className='text-xs'>{error instanceof Error ? error.message : '未知错误'}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  const clearinghouseState = data?.clearinghouseState
  const marginSummary = clearinghouseState?.marginSummary
  const accountValue = marginSummary?.accountValue
  const withdrawable = clearinghouseState?.withdrawable
  const positions = clearinghouseState?.assetPositions || []
  const openOrders = clearinghouseState?.openOrders || []

  // 如果没有数据，显示无数据
  if (!accountValue && !withdrawable && positions.length === 0 && openOrders.length === 0) {
    return (
      <span className='text-xs text-muted-foreground'>无数据</span>
    )
  }

  // 格式化账户价值
  const formatValue = (value: string | undefined) => {
    if (!value) return '-'
    const num = parseFloat(value)
    if (isNaN(num)) return value
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const tooltipContent = (
    <div className='space-y-1 text-xs'>
      {accountValue && (
        <div>
          <span className='font-semibold'>账户价值: </span>
          <span>{formatValue(accountValue)}</span>
        </div>
      )}
      {withdrawable && (
        <div>
          <span className='font-semibold'>可提取: </span>
          <span>{formatValue(withdrawable)}</span>
        </div>
      )}
      {positions.length > 0 && (
        <div>
          <span className='font-semibold'>持仓数量: </span>
          <span>{positions.length}</span>
        </div>
      )}
      {openOrders.length > 0 && (
        <div>
          <span className='font-semibold'>挂单数量: </span>
          <span>{openOrders.length}</span>
        </div>
      )}
    </div>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className='flex items-center gap-2 cursor-help'>
          <Badge variant='outline' className='text-xs'>
            {accountValue ? formatValue(accountValue) : '查看详情'}
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent className='max-w-xs'>
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  )
}

export const walletsColumns: ColumnDef<Wallet>[] = [
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
    id: 'index',
    header: () => <div className='w-[60px] text-center'>序号</div>,
    cell: ({ row, table }) => {
      // 获取所有数据（过滤后的）
      const filteredRows = table.getFilteredRowModel().rows
      // 找到当前行在所有数据中的索引
      const globalIndex = filteredRows.findIndex((r) => r.id === row.id)
      // 序号从1开始
      const index = globalIndex + 1
      return <div className='w-[60px] text-center text-sm text-muted-foreground'>{index}</div>
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'address',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='钱包地址' />
    ),
    meta: {
      className: 'ps-1',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const address = row.getValue('address') as string
      return (
        <div className='flex items-center gap-2 min-w-0'>
          <span className='font-mono text-sm break-all' title={address}>
            {address}
          </span>
          <CopyAddressButton address={address} />
        </div>
      )
    },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='类型' />
    ),
    meta: { className: 'ps-1', tdClassName: 'ps-4' },
    cell: ({ row }) => {
      const type = row.getValue('type') as Wallet['type']
      const typeConfig = walletTypes.find((t) => t.value === type)
      if (typeConfig) {
        const Icon = typeConfig.icon
        return (
          <Badge variant={type === 'whale' ? 'default' : type === 'high_win_rate' ? 'secondary' : 'outline'}>
            <span className='flex items-center gap-1'>
              <Icon className='h-3 w-3' />
              {typeConfig.label}
            </span>
          </Badge>
        )
      }
      return (
        <Badge variant='outline'>
          {getWalletTypeLabel(type)}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const type = row.getValue(id) as Wallet['type']
      return value.includes(type || '')
    },
  },
  {
    accessorKey: 'note',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='备注' />
    ),
    meta: {
      className: 'ps-1 max-w-0 w-1/4',
      tdClassName: 'ps-4',
    },
    cell: ({ row }) => {
      const note = row.getValue('note') as string
      return (
        <div className='max-w-md'>
          <span className='text-sm text-muted-foreground line-clamp-2'>
            {note || '无备注'}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'volume',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='体量 (USD)' />
    ),
    meta: { className: 'ps-1', tdClassName: 'ps-4' },
    cell: ({ row }) => {
      const volume = row.getValue('volume') as number | null | undefined
      return (
        <div className='text-sm font-medium'>
          {volume != null ? `$${volume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const volumeA = (rowA.getValue('volume') as number | null) ?? 0
      const volumeB = (rowB.getValue('volume') as number | null) ?? 0
      return volumeA - volumeB
    },
  },
  {
    id: 'hyperliquid',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Hyperliquid' />
    ),
    meta: { className: 'ps-1', tdClassName: 'ps-4' },
    cell: ({ row }) => {
      const address = row.original.address
      return <HyperliquidInfoCell address={address} />
    },
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='录入时间' />
    ),
    meta: { className: 'ps-1', tdClassName: 'ps-4' },
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date
      return (
        <div className='text-sm'>
          {format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN })}
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const dateA = rowA.getValue('createdAt') as Date
      const dateB = rowB.getValue('createdAt') as Date
      return dateA.getTime() - dateB.getTime()
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
