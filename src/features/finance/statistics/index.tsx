import { useMemo, useState } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useExpenseStatistics } from './hooks/use-expense-statistics'
import { useExpenses } from '../expenses/hooks/use-expenses'
import { TotalExpenseSummary } from './components/total-expense-summary'
import { ExpenseDetails } from './components/expense-details'
import { BudgetProgress } from './components/budget-progress'
import { CategoryAnalysis } from './components/category-analysis'
import { ExchangeRateConverter } from '../exchange-rate/components/exchange-rate-converter'
import { MultiCurrencySummary } from '../exchange-rate/components/multi-currency-summary'
import { useExchangeRates } from '../exchange-rate/hooks/use-exchange-rates'
import { format, parseISO } from 'date-fns'

export function Statistics() {
  const { monthlyStats, totalStats, isLoading, error } =
    useExpenseStatistics()
  const { data: expenses = [] } = useExpenses()
  const selectedCurrency = 'CNY' // 默认使用人民币
  const [baseCurrency, setBaseCurrency] = useState<string>('CNY')
  const { data: exchangeRates } = useExchangeRates(selectedCurrency)

  // 转换金额到目标币种
  const convertAmount = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency || !exchangeRates) return amount
    
    if (exchangeRates.base === toCurrency) {
      const rate = exchangeRates.rates[fromCurrency]
      if (rate) {
        return amount / rate
      }
    }
    
    return amount
  }

  // 计算当前月份的支出数据（统一转换为 CNY）
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

    // 计算总额（转换为 CNY）
    const total = currentMonthExpenses.reduce((sum, exp) => {
      if (!exp.amount) return sum
      const expenseCurrency = exp.currency || 'CNY'
      const convertedAmount = convertAmount(exp.amount, expenseCurrency, selectedCurrency)
      return sum + convertedAmount
    }, 0)

    // 按分类计算（转换为 CNY）
    const byCategory: Record<string, number> = {}
    currentMonthExpenses.forEach((expense) => {
      if (!expense.category || !expense.amount) return
      const expenseCurrency = expense.currency || 'CNY'
      const convertedAmount = convertAmount(expense.amount, expenseCurrency, selectedCurrency)
      const category = expense.category
      byCategory[category] = (byCategory[category] || 0) + convertedAmount
    })

    return { total, byCategory }
  }, [expenses, selectedCurrency, exchangeRates])

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>支出统计</h2>
          <p className='text-muted-foreground'>
            按月份查看您的支出统计和预算进度，支持多币种汇率转换
          </p>
        </div>

        <Tabs defaultValue='statistics' className='w-full'>
          <TabsList>
            <TabsTrigger value='statistics'>支出统计</TabsTrigger>
            <TabsTrigger value='exchange'>汇率转换</TabsTrigger>
          </TabsList>

          <TabsContent value='statistics' className='space-y-4 sm:space-y-6'>
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
                  currency={selectedCurrency}
                />

                <CategoryAnalysis currency={selectedCurrency} />
              </>
            )}
          </TabsContent>

          <TabsContent value='exchange' className='space-y-4 sm:space-y-6'>
            <div className='grid gap-4 lg:grid-cols-2'>
              <ExchangeRateConverter />
              <MultiCurrencySummary
                baseCurrency={baseCurrency}
                onBaseCurrencyChange={setBaseCurrency}
              />
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

