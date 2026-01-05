import { Download, Plus, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExpenses } from './expenses-provider'
import { useExpenses as useExpensesData } from '../hooks/use-expenses'
import { exportExpensesToCSV } from '../utils/export-expenses'

export function ExpensesPrimaryButtons() {
  const { setOpen } = useExpenses()
  const { data: expenses = [] } = useExpensesData()

  const handleExport = () => {
    if (expenses.length === 0) {
      // 可以显示一个提示，告知没有数据可导出
      return
    }
    exportExpensesToCSV(expenses)
  }

  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('import')}
      >
        <span>导入</span> <Download size={18} />
      </Button>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={handleExport}
        disabled={expenses.length === 0}
      >
        <span>导出账单</span> <FileDown size={18} />
      </Button>
      <Button className='space-x-1' onClick={() => setOpen('create')}>
        <span>新增记账</span> <Plus size={18} />
      </Button>
    </div>
  )
}

