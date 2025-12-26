import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { type Expense } from '../data/schema'
import { ExpensesMultiDeleteDialog } from './expenses-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleBulkExport = () => {
    const selectedExpenses = selectedRows.map((row) => row.original as Expense)
    toast.promise(sleep(2000), {
      loading: '正在导出...',
      success: () => {
        table.resetRowSelection()
        return `已导出 ${selectedExpenses.length} 条记录到 CSV。`
      },
      error: '导出失败',
    })
    table.resetRowSelection()
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='expense'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkExport()}
              className='size-8'
              aria-label='导出记录'
              title='导出记录'
            >
              <Download />
              <span className='sr-only'>导出记录</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>导出记录</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label='删除选中的记录'
              title='删除选中的记录'
            >
              <Trash2 />
              <span className='sr-only'>删除选中的记录</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>删除选中的记录</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <ExpensesMultiDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        table={table}
      />
    </>
  )
}

