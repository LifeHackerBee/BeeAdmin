import { type Expense } from '../data/schema'
import { currencies } from '../data/data'
import { type ExpenseCategory } from '../data/category-schema'
import { format } from 'date-fns'

/**
 * 导出支出记录为 CSV 格式
 */
export function exportExpensesToCSV(expenses: Expense[], categories: ExpenseCategory[]): void {
  // CSV 表头
  const headers = [
    'ID',
    '创建时间',
    '支出时间',
    '分类',
    '金额',
    '币种',
    '备注',
    '设备名称',
  ]

  // 创建分类和币种映射
  const categoryMap = new Map<string, string>(
    categories.map((cat) => [cat.value, cat.label])
  )
  const currencyMap = new Map<string, string>(
    currencies.map((curr) => [curr.value, curr.label])
  )

  // 转换数据为 CSV 行
  const rows = expenses.map((expense) => {
    // 格式化日期
    const formatDate = (dateStr: string | null | undefined): string => {
      if (!dateStr) return '-'
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return dateStr
        return format(date, 'yyyy-MM-dd HH:mm:ss')
      } catch {
        return dateStr
      }
    }

    // 获取分类中文名称
    const categoryLabel = expense.category
      ? categoryMap.get(expense.category) || expense.category
      : '-'

    // 获取币种中文名称
    const currencyLabel = expense.currency
      ? currencyMap.get(expense.currency) || expense.currency
      : '-'

    // 格式化金额
    const amountStr =
      expense.amount !== null && expense.amount !== undefined
        ? expense.amount.toFixed(2)
        : '-'

    // 转义 CSV 字段（处理包含逗号、引号或换行符的值）
    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return '-'
      const str = String(value)
      // 如果包含逗号、引号或换行符，需要用引号包裹并转义引号
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    return [
      expense.id.toString(),
      formatDate(expense.created_at),
      formatDate(expense.spending_time),
      escapeCSV(categoryLabel),
      amountStr,
      escapeCSV(currencyLabel),
      escapeCSV(expense.note),
      escapeCSV(expense.device_name),
    ]
  })

  // 组合 CSV 内容
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')

  // 添加 BOM 以支持 Excel 正确显示中文
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  // 创建下载链接
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  // 生成文件名（包含当前日期）
  const now = new Date()
  const fileName = `支出账单_${format(now, 'yyyyMMdd_HHmmss')}.csv`
  link.download = fileName

  // 触发下载
  document.body.appendChild(link)
  link.click()

  // 清理
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

