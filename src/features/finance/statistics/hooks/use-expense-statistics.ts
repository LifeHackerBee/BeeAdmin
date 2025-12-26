import { useMemo } from 'react'
import { useExpenses } from '../../expenses/hooks/use-expenses'
import { format, parseISO } from 'date-fns'

export type MonthlyStatistic = {
  month: string // YYYY-MM
  monthLabel: string // 2025年1月
  total: number
  count: number
  currency: string
}

export type YearlyStatistic = {
  year: string // YYYY
  yearLabel: string // 2025年
  total: number
  count: number
  currency: string
}

export type CategoryStatistic = {
  category: string
  total: number
  count: number
  percentage: number
}

export function useExpenseStatistics() {
  const { data: expenses = [], isLoading, error } = useExpenses()

  // 按月统计
  const monthlyStats = useMemo(() => {
    if (!expenses.length) return []

    const statsMap = new Map<string, { total: number; count: number; currency: string }>()

    expenses.forEach((expense) => {
      if (!expense.spending_time || !expense.amount) return

      try {
        const date = parseISO(expense.spending_time)
        const monthKey = format(date, 'yyyy-MM')
        const currency = expense.currency || 'CNY'

        const key = `${monthKey}-${currency}`
        const existing = statsMap.get(key) || { total: 0, count: 0, currency }

        statsMap.set(key, {
          total: existing.total + (expense.amount || 0),
          count: existing.count + 1,
          currency,
        })
      } catch {
        // 忽略无效日期
      }
    })

    const stats: MonthlyStatistic[] = Array.from(statsMap.entries())
      .map(([key, data]) => {
        // key 格式: "yyyy-MM-currency"，需要提取前两部分作为月份
        const parts = key.split('-')
        const month = `${parts[0]}-${parts[1]}` // yyyy-MM
        const year = parts[0]
        const monthNum = parseInt(parts[1])

        return {
          month,
          monthLabel: `${year}年${monthNum}月`,
          total: data.total,
          count: data.count,
          currency: data.currency,
        }
      })
      .sort((a, b) => b.month.localeCompare(a.month))

    return stats
  }, [expenses])

  // 按年统计
  const yearlyStats = useMemo(() => {
    if (!expenses.length) return []

    const statsMap = new Map<string, { total: number; count: number; currency: string }>()

    expenses.forEach((expense) => {
      if (!expense.spending_time || !expense.amount) return

      try {
        const date = parseISO(expense.spending_time)
        const yearKey = format(date, 'yyyy')
        const currency = expense.currency || 'CNY'

        const key = `${yearKey}-${currency}`
        const existing = statsMap.get(key) || { total: 0, count: 0, currency }

        statsMap.set(key, {
          total: existing.total + (expense.amount || 0),
          count: existing.count + 1,
          currency,
        })
      } catch {
        // 忽略无效日期
      }
    })

    const stats: YearlyStatistic[] = Array.from(statsMap.entries())
      .map(([key, data]) => {
        const [year] = key.split('-')
        return {
          year,
          yearLabel: `${year}年`,
          total: data.total,
          count: data.count,
          currency: data.currency,
        }
      })
      .sort((a, b) => b.year.localeCompare(a.year))

    return stats
  }, [expenses])

  // 按分类统计（当前月份）
  const categoryStats = useMemo(() => {
    if (!expenses.length) return []

    const currentMonth = format(new Date(), 'yyyy-MM')
    const currentMonthExpenses = expenses.filter((expense) => {
      if (!expense.spending_time) return false
      try {
        const date = parseISO(expense.spending_time)
        return format(date, 'yyyy-MM') === currentMonth
      } catch {
        return false
      }
    })

    const statsMap = new Map<string, { total: number; count: number }>()

    currentMonthExpenses.forEach((expense) => {
      if (!expense.category || !expense.amount) return

      const existing = statsMap.get(expense.category) || { total: 0, count: 0 }
      statsMap.set(expense.category, {
        total: existing.total + (expense.amount || 0),
        count: existing.count + 1,
      })
    })

    const total = Array.from(statsMap.values()).reduce((sum, stat) => sum + stat.total, 0)

    const stats: CategoryStatistic[] = Array.from(statsMap.entries())
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        percentage: total > 0 ? (data.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    return stats
  }, [expenses])

  // 总统计
  const totalStats = useMemo(() => {
    const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
    const count = expenses.length
    const avg = count > 0 ? total / count : 0

    // 计算有记录的月份数
    const monthsSet = new Set<string>()
    expenses.forEach((expense) => {
      if (!expense.spending_time) return
      try {
        const date = parseISO(expense.spending_time)
        const monthKey = format(date, 'yyyy-MM')
        monthsSet.add(monthKey)
      } catch {
        // 忽略无效日期
      }
    })
    const monthCount = monthsSet.size
    const avgMonthly = monthCount > 0 ? total / monthCount : 0

    // 按币种分组统计
    const byCurrency = expenses.reduce((acc, exp) => {
      const currency = exp.currency || 'CNY'
      if (!acc[currency]) {
        acc[currency] = { total: 0, count: 0 }
      }
      acc[currency].total += exp.amount || 0
      acc[currency].count += 1
      return acc
    }, {} as Record<string, { total: number; count: number }>)

    return {
      total,
      count,
      avg,
      avgMonthly,
      monthCount,
      byCurrency,
    }
  }, [expenses])

  return {
    monthlyStats,
    yearlyStats,
    categoryStats,
    totalStats,
    isLoading,
    error,
  }
}

