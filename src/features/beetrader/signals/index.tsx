import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/_authenticated/beetrader/signals'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Radar } from 'lucide-react'
import { RadarJobsTab } from './components/radar-jobs-tab'
import { Macroscopic } from '../macroscopic'
import { Candles } from '../candles'
import { MarketDepth } from '../market/components/market-depth'
import { UnifiedAnalysis } from './components/unified-analysis'

export function TradingSignals() {
  const { tab } = Route.useSearch()
  const navigate = useNavigate()
  const activeTab = tab ?? 'analyze'

  const handleTabChange = (value: string) => {
    navigate({ search: { tab: value } as any, replace: true })
  }

  return (
    <div className='flex flex-col space-y-3'>
      {/* 头部 */}
      <div className='flex-shrink-0 space-y-2'>
        <div className='flex items-center gap-2'>
          <Radar className='h-5 w-5' />
          <h1 className='text-xl font-bold'>交易分析中心</h1>
          <span className='text-sm text-muted-foreground'>市场观察与交易指标分析</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
        <TabsList>
          <TabsTrigger value='market'>市场观察</TabsTrigger>
          <TabsTrigger value='analyze'>交易分析</TabsTrigger>
          <TabsTrigger value='jobs'>后台任务</TabsTrigger>
        </TabsList>

        <TabsContent value='market' className='space-y-6'>
          {/* 宏观市场 */}
          <div className='flex flex-col bg-card rounded-lg border p-6 shadow-sm'>
            <div className='mb-4'>
              <h3 className='text-xl font-semibold'>宏观市场</h3>
            </div>
            <Macroscopic />
          </div>

          {/* K线观察 */}
          <div
            className='flex flex-col bg-card rounded-lg border p-6 shadow-sm'
            style={{ height: '560px', minHeight: '480px' }}
          >
            <div className='mb-4 flex-shrink-0'>
              <h3 className='text-xl font-semibold'>K线观察</h3>
            </div>
            <div className='flex-1 min-h-0 overflow-hidden'>
              <Candles />
            </div>
          </div>

          {/* 市场深度分析 */}
          <div className='flex flex-col bg-card rounded-lg border p-6 shadow-sm'>
            <MarketDepth />
          </div>
        </TabsContent>

        <TabsContent value='analyze' className='space-y-3'>
          <UnifiedAnalysis />
        </TabsContent>

        <TabsContent value='jobs'>
          <RadarJobsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
