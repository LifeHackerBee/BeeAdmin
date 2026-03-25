import { Radar, BarChart3, Clock, Timer } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UnifiedAnalysis } from './components/unified-analysis'
import { AnalysisHistoryTab } from './components/analysis-history-tab'
import { ScheduledAnalysisTab } from './components/scheduled-analysis-tab'

const APP_VERSION = __APP_VERSION__

export function TradingSignals() {
  return (
    <div className='flex flex-col space-y-3'>
      {/* 头部 */}
      <div className='flex-shrink-0 space-y-2'>
        <div className='flex items-center gap-2'>
          <Radar className='h-5 w-5' />
          <h1 className='text-xl font-bold'>交易分析中心</h1>
          <span className='text-xs text-muted-foreground/50 tabular-nums'>v{APP_VERSION}</span>
          <span className='text-sm text-muted-foreground'>市场观察与交易指标分析</span>
        </div>
      </div>

      <Tabs defaultValue='realtime' className='w-full'>
        <TabsList>
          <TabsTrigger value='realtime' className='gap-1.5'>
            <BarChart3 className='h-3.5 w-3.5' />
            实时分析
          </TabsTrigger>
          <TabsTrigger value='history' className='gap-1.5'>
            <Clock className='h-3.5 w-3.5' />
            历史分析
          </TabsTrigger>
          <TabsTrigger value='scheduled' className='gap-1.5'>
            <Timer className='h-3.5 w-3.5' />
            定时分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value='realtime' className='mt-3'>
          <UnifiedAnalysis />
        </TabsContent>

        <TabsContent value='history' className='mt-3'>
          <AnalysisHistoryTab />
        </TabsContent>

        <TabsContent value='scheduled' className='mt-3'>
          <ScheduledAnalysisTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
