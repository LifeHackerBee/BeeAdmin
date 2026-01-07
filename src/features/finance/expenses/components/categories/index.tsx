import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { CategoriesTable } from '../categories-table'

export function Categories() {
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

