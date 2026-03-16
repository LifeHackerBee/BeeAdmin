import { Bot } from 'lucide-react'
import { StrategyBotPanel } from './components/strategy-bot-panel'

export function StrategyBot() {
  return (
    <div className='flex flex-col space-y-3'>
      <div className='flex items-center gap-2'>
        <Bot className='h-5 w-5' />
        <h1 className='text-xl font-bold'>交易机器人</h1>
        <span className='text-sm text-muted-foreground'>基于大镖客策略的量化交易测试</span>
      </div>
      <StrategyBotPanel />
    </div>
  )
}
