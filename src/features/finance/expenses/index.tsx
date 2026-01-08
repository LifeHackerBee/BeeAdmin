import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExpensesDialogs } from './components/expenses-dialogs'
import { ExpensesPrimaryButtons } from './components/expenses-primary-buttons'
import { ExpensesProvider } from './components/expenses-provider'
import { ExpensesTable } from './components/expenses-table'
import { RecurringRulesTable } from './components/recurring-rules-table'
import { RecurringExecutionsTable } from './components/recurring-executions-table'
import { useExpenses } from './hooks/use-expenses'

export function Expenses() {
  const { data: expenses = [], isLoading, error } = useExpenses()

  return (
    <ExpensesProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>记账管理</h2>
            <p className='text-muted-foreground'>
              管理和查看您的家庭开支记录
            </p>
          </div>
          <ExpensesPrimaryButtons />
        </div>
        <Tabs defaultValue='overview' className='w-full'>
          <TabsList>
            <TabsTrigger value='overview'>账单清单总览</TabsTrigger>
            <TabsTrigger value='rules'>周期性记账规则</TabsTrigger>
            <TabsTrigger value='executions'>周期性机制执行记录</TabsTrigger>
          </TabsList>
          <TabsContent value='overview' className='mt-4'>
        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : error ? (
          <div className='flex items-center justify-center py-12'>
            <p className='text-destructive'>加载失败: {error instanceof Error ? error.message : '未知错误'}</p>
          </div>
        ) : (
            <ExpensesTable data={expenses} />
            )}
          </TabsContent>
          <TabsContent value='rules' className='mt-4'>
            <RecurringRulesTable />
          </TabsContent>
          <TabsContent value='executions' className='mt-4'>
            <RecurringExecutionsTable />
          </TabsContent>
        </Tabs>
      </Main>

      <ExpensesDialogs />
    </ExpensesProvider>
  )
}

