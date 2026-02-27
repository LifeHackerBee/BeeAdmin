import { X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface WalletsBulkActionsProps {
  selectedCount: number
  onClearSelection: () => void
  onBatchDelete: () => void
  isOperating?: boolean
}

export function WalletsBulkActions({
  selectedCount,
  onClearSelection,
  onBatchDelete,
  isOperating = false,
}: WalletsBulkActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div
      role='toolbar'
      aria-label={`已选中 ${selectedCount} 个钱包，批量操作`}
      className={cn(
        'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl',
        'transition-all delay-100 duration-300 ease-out hover:scale-105',
        'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none'
      )}
    >
      <div
        className={cn(
          'p-2 shadow-xl',
          'rounded-xl border',
          'bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/60',
          'flex items-center gap-x-2'
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={onClearSelection}
              disabled={isOperating}
              className='size-6 rounded-full'
              aria-label='取消选择'
            >
              <X className='h-3 w-3' />
              <span className='sr-only'>取消选择</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>取消选择</p>
          </TooltipContent>
        </Tooltip>

        <Separator className='h-5' orientation='vertical' aria-hidden='true' />

        <div className='flex items-center gap-x-1 text-sm'>
          <Badge variant='default' className='min-w-8 rounded-lg'>
            {selectedCount}
          </Badge>
          <span className='hidden sm:inline'> 个钱包已选中</span>
        </div>

        <Separator className='h-5' orientation='vertical' aria-hidden='true' />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='sm'
              onClick={onBatchDelete}
              disabled={isOperating}
              className='gap-1'
            >
              <Trash2 className='h-4 w-4' />
              批量删除
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>删除选中的钱包地址，此操作无法撤销</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
