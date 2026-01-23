import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'

export function Dashboard() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mx-auto flex w-full max-w-4xl flex-col gap-10 py-6'>
          <div className='text-center'>
            <h1 className='text-3xl font-bold tracking-tight'>
              欢迎使用BeeAdmin 黑客蜂管理后台
            </h1>
            <p className='mt-3 text-sm text-muted-foreground'>
              从左侧导航进入各业务模块，快速开始管理和分析。
            </p>
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-lg border bg-card p-4 shadow-sm'>
              <div className='text-base font-semibold'>Trader 模块</div>
              <p className='mt-2 text-sm text-muted-foreground'>
                追踪 Hyperliquid 的巨鲸地址，结合策略信号执行交易。
              </p>
            </div>
            <div className='rounded-lg border bg-card p-4 shadow-sm'>
              <div className='text-base font-semibold'>资产管理</div>
              <p className='mt-2 text-sm text-muted-foreground'>
                管理家庭资产、投资与负债，全局掌握资金结构。
              </p>
            </div>
            <div className='rounded-lg border bg-card p-4 shadow-sm'>
              <div className='text-base font-semibold'>目标管理</div>
              <p className='mt-2 text-sm text-muted-foreground'>
                跟踪 FIRE 人生目标与阶段进度，明确行动计划。
              </p>
            </div>
            <div className='rounded-lg border bg-card p-4 shadow-sm'>
              <div className='text-base font-semibold'>AI 应用</div>
              <p className='mt-2 text-sm text-muted-foreground'>
                对接实用 AI 服务，提升生活与工作效率。
              </p>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}
