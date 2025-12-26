import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useExpenseStatistics } from './hooks/use-expense-statistics'
import { MonthlyChart } from './components/monthly-chart'
import { YearlyChart } from './components/yearly-chart'
import { CategoryChart } from './components/category-chart'
import { StatisticsSummary } from './components/statistics-summary'
import { ExchangeRateSummary } from './components/exchange-rate-summary'

export function Statistics() {
  const { monthlyStats, yearlyStats, categoryStats, totalStats, isLoading, error } =
    useExpenseStatistics()
  const selectedCurrency = 'CNY' // 默认使用人民币

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
            按月份和年份查看您的支出统计
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
            <StatisticsSummary
              total={totalStats.total}
              count={totalStats.count}
              avg={totalStats.avg}
              avgMonthly={totalStats.avgMonthly}
              monthCount={totalStats.monthCount}
              byCurrency={totalStats.byCurrency}
            />

            <ExchangeRateSummary />

            <Tabs defaultValue='monthly' className='space-y-4'>
              <TabsList>
                <TabsTrigger value='monthly'>月度统计</TabsTrigger>
                <TabsTrigger value='yearly'>年度统计</TabsTrigger>
                <TabsTrigger value='category'>分类统计</TabsTrigger>
              </TabsList>

              <TabsContent value='monthly' className='space-y-4'>
                <MonthlyChart data={monthlyStats} currency={selectedCurrency} />
              </TabsContent>

              <TabsContent value='yearly' className='space-y-4'>
                <YearlyChart data={yearlyStats} currency={selectedCurrency} />
              </TabsContent>

              <TabsContent value='category' className='space-y-4'>
                <CategoryChart data={categoryStats} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </Main>
    </>
  )
}

