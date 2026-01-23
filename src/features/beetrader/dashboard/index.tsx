import { useDashboardStats } from './hooks/use-dashboard-stats'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BacktestSection } from './components/backtest-section'
import { TraderAnalysisSection } from './components/trader-analysis-section'
import { WalletEventSection } from './components/wallet-event-section'
import { TrackerTaskSection } from './components/tracker-task-section'
import { WalletsSection } from './components/wallets-section'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BeeTraderDashboard() {
  const { backtest, traderAnalysis, walletEvent, trackerTask, wallets, isLoading } =
    useDashboardStats()

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>BeeTrader 仪表盘</h2>
          <p className='text-muted-foreground'>
            实时监控交易数据、钱包追踪和回测任务
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => window.location.reload()}
        >
          <RefreshCw className='h-4 w-4 mr-2' />
          刷新数据
        </Button>
      </div>

      <Tabs defaultValue='overview' className='space-y-4'>
        <TabsList className='grid w-full grid-cols-6'>
          <TabsTrigger value='overview'>总览</TabsTrigger>
          <TabsTrigger value='backtest'>回测任务</TabsTrigger>
          <TabsTrigger value='analysis'>交易者分析</TabsTrigger>
          <TabsTrigger value='events'>仓位事件</TabsTrigger>
          <TabsTrigger value='tracker'>追踪任务</TabsTrigger>
          <TabsTrigger value='wallets'>钱包管理</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-6'>
          <div className='grid gap-6'>
            <div>
              <h3 className='text-lg font-semibold mb-4'>钱包管理</h3>
              <WalletsSection data={wallets} isLoading={isLoading} />
            </div>
            
            <div>
              <h3 className='text-lg font-semibold mb-4'>交易者分析</h3>
              <TraderAnalysisSection
                data={traderAnalysis}
                isLoading={isLoading}
              />
            </div>

            <div>
              <h3 className='text-lg font-semibold mb-4'>仓位事件监控</h3>
              <WalletEventSection data={walletEvent} isLoading={isLoading} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value='backtest' className='space-y-4'>
          <BacktestSection data={backtest} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value='analysis' className='space-y-4'>
          <TraderAnalysisSection data={traderAnalysis} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value='events' className='space-y-4'>
          <WalletEventSection data={walletEvent} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value='tracker' className='space-y-4'>
          <TrackerTaskSection data={trackerTask} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value='wallets' className='space-y-4'>
          <WalletsSection data={wallets} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
