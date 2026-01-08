import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { useFireCalculator } from './hooks/use-fire-calculator'
import { FireInputs } from './components/fire-inputs'
import { FireSummary } from './components/fire-summary'
import { FireChart } from './components/fire-chart'

export function Fire() {
  const { params, summary, simulationData, updateParam } = useFireCalculator()

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
          <h2 className='text-2xl font-bold tracking-tight'>FIRE 计算器</h2>
          <p className='text-muted-foreground'>
            财务独立，提前退休 | 您的个性化路径规划
          </p>
        </div>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          <div className='flex flex-col gap-6'>
            <FireInputs params={params} onParamChange={updateParam} />
          </div>

          <div className='flex flex-col gap-6'>
            <FireSummary summary={summary} params={params} />
            <FireChart
              simulationData={simulationData}
              fireTarget={summary.targetAssetsNetWindfall}
            />
          </div>
        </div>
      </Main>
    </>
  )
}
