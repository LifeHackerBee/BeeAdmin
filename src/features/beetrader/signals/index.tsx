import { Radar } from 'lucide-react'
import { UnifiedAnalysis } from './components/unified-analysis'

export function TradingSignals() {
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

      <UnifiedAnalysis />
    </div>
  )
}
