import { useState } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { ExchangeRateConverter } from './components/exchange-rate-converter'
import { MultiCurrencySummary } from './components/multi-currency-summary'

export function ExchangeRate() {
  const [baseCurrency, setBaseCurrency] = useState<string>('CNY')

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
          <h2 className='text-2xl font-bold tracking-tight'>汇率转换</h2>
          <p className='text-muted-foreground'>
            实时汇率转换和多币种统一换算
          </p>
        </div>

        <div className='grid gap-4 lg:grid-cols-2'>
          <ExchangeRateConverter />
          <MultiCurrencySummary
            baseCurrency={baseCurrency}
            onBaseCurrencyChange={setBaseCurrency}
          />
        </div>
      </Main>
    </>
  )
}

