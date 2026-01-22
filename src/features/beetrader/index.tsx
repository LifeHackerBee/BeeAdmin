import { Outlet } from '@tanstack/react-router'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'

export function BeeTrader() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
        </div>
      </Header>

      {/* ===== Content ===== */}
      <Main>
        <div className='flex flex-col space-y-6'>
          <div className='flex-shrink-0'>
            <h1 className='text-2xl font-bold tracking-tight'>BeeTrader</h1>
            <p className='text-muted-foreground'>
              Web3 交易分析与策略管理平台
            </p>
          </div>
          <Separator className='flex-shrink-0' />
          <div>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}

