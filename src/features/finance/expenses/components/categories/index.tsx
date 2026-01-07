import { useEffect } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { CategoriesTable } from '../categories-table'
import { useInitDefaultCategories } from '../../hooks/use-init-default-categories'
import { useExpenseCategories } from '../../hooks/use-expense-categories'

export function Categories() {
  const { data: categories = [], isLoading } = useExpenseCategories()
  const initMutation = useInitDefaultCategories()

  // 如果用户没有分类，自动初始化默认分类
  useEffect(() => {
    if (!isLoading && categories.length === 0 && !initMutation.isPending && !initMutation.isSuccess) {
      initMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, categories.length])

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
          <h2 className='text-2xl font-bold tracking-tight'>记账类型管理</h2>
          <p className='text-muted-foreground'>
            管理您的记账分类类型，包括创建、编辑和删除分类
          </p>
        </div>
        <CategoriesTable />
      </Main>
    </>
  )
}

