import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { useAssets } from './hooks/use-assets'
import { AssetsProvider } from './components/assets-provider'
import { AssetsTable } from './components/assets-table'
import { AssetsPrimaryButtons } from './components/assets-primary-buttons'
import { AssetsDialogs } from './components/assets-dialogs'

export function Assets() {
  const { data: assets = [], isLoading, error } = useAssets()

  return (
    <AssetsProvider>
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
            <h2 className='text-2xl font-bold tracking-tight'>资产管理</h2>
            <p className='text-muted-foreground'>
              管理和跟踪您的各类资产（现金、投资、房产等）
            </p>
          </div>
          <AssetsPrimaryButtons />
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
          <AssetsTable data={assets} />
        )}

        <AssetsDialogs />
      </Main>
    </AssetsProvider>
  )
}
