import { useMemo } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { useExpenseStatistics } from './hooks/use-expense-statistics'
import { useExpenses } from '../expenses/hooks/use-expenses'
import { TotalExpenseSummary } from './components/total-expense-summary'
import { ExpenseDetails } from './components/expense-details'
import { BudgetProgress } from './components/budget-progress'
import { format, parseISO } from 'date-fns'

export function Statistics() {
  const { monthlyStats, categoryStats, totalStats, isLoading, error } =
    useExpenseStatistics()
  const { data: expenses = [] } = useExpenses()
  const selectedCurrency = 'CNY' // 默认使用人民币

  // 计算当前月份的支出数据
  const currentMonthData = useMemo(() => {
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

    // 计算总额（只计算CNY）
    const total = currentMonthExpenses
      .filter((exp) => (exp.currency || 'CNY') === 'CNY')
      .reduce((sum, exp) => sum + (exp.amount || 0), 0)

    // 按分类计算（只计算CNY）
    const byCategory: Record<string, number> = {}
    currentMonthExpenses
      .filter((exp) => (exp.currency || 'CNY') === 'CNY')
      .forEach((expense) => {
        if (!expense.category || !expense.amount) return
        const category = expense.category
        byCategory[category] = (byCategory[category] || 0) + (expense.amount || 0)
      })

    return { total, byCategory }
  }, [expenses])

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>支出统计</h2>
          <p className='text-muted-foreground'>
            按月份查看您的支出统计和预算进度
          </p>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : error ? (
          <div className='flex items-center justify-center py-12'>
            <p className='text-destructive'>
              加载失败: {error instanceof Error ? error.message : '未知错误'}
            </p>
          </div>
        ) : (
          <>
            <TotalExpenseSummary
              avgMonthly={totalStats.avgMonthly}
              monthCount={totalStats.monthCount}
              byCurrency={totalStats.byCurrency}
            />

            <BudgetProgress
              currentMonthTotal={currentMonthData.total}
              currentMonthByCategory={currentMonthData.byCategory}
              allExpenses={expenses}
              currency={selectedCurrency}
            />

            <ExpenseDetails
              monthlyData={monthlyStats}
              categoryData={categoryStats}
              currency={selectedCurrency}
            />
          </>
        )}
      </Main>
    </>
  )
}

