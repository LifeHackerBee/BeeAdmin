import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, History } from 'lucide-react'
import { HistoryList } from './components/history-list'
import { WalletLiveQuery } from './components/wallet-live-query'

export function TraderAnalyzer() {
  return (
    <div className='flex h-full flex-col space-y-6 min-h-0'>
      <div className='flex items-center justify-between flex-shrink-0'>
        <div>
          <h2 className='text-xl font-semibold'>Trader 分析</h2>
          <p className='text-sm text-muted-foreground'>
            输入地址优先拉取实时数据，可选进行 AI 分析；查看历史记录
          </p>
        </div>
      </div>

      <Tabs defaultValue='analyze' className='flex-1 flex flex-col min-h-0'>
        <TabsList className='flex-shrink-0'>
          <TabsTrigger value='analyze'>
            <Search className='h-4 w-4 mr-2' />
            地址分析
          </TabsTrigger>
          <TabsTrigger value='history'>
            <History className='h-4 w-4 mr-2' />
            历史记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value='analyze' className='flex-1 overflow-y-auto mt-4'>
          <WalletLiveQuery />
        </TabsContent>

        <TabsContent value='history' className='flex-1 overflow-y-auto mt-4'>
          <HistoryList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
