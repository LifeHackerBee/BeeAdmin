import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { useLiabilities } from './hooks/use-liabilities'
import { LiabilitiesProvider } from './components/liabilities-provider'
import { LiabilitiesTable } from './components/liabilities-table'
import { LiabilitiesPrimaryButtons } from './components/liabilities-primary-buttons'
import { LiabilitiesDialogs } from './components/liabilities-dialogs'

export function Liabilities() {
  const { data: liabilities = [], isLoading, error } = useLiabilities()

  return (
    <LiabilitiesProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>负债管理</h2>
            <p className='text-muted-foreground'>
              管理和跟踪您的各类负债（房贷、车贷等）
            </p>
          </div>
          <LiabilitiesPrimaryButtons />
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
          <LiabilitiesTable data={liabilities} />
        )}

        <LiabilitiesDialogs />
      </Main>
    </LiabilitiesProvider>
  )
}
