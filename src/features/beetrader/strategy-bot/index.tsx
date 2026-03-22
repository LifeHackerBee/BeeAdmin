import { useState } from 'react'
import { Bot } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { StrategyBotPanel } from './components/strategy-bot-panel'
import type { BotMode } from './hooks/use-strategy-bot-jobs'

export function StrategyBot() {
  const [mode, setMode] = useState<BotMode>('paper')

  return (
    <div className='flex flex-col space-y-3'>
      <div className='flex items-center gap-2'>
        <Bot className='h-5 w-5' />
        <h1 className='text-xl font-bold'>交易机器人</h1>
        <span className='text-sm text-muted-foreground'>基于大镖客策略的量化交易</span>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as BotMode)}>
        <TabsList>
          <TabsTrigger value='paper'>模拟交易</TabsTrigger>
          <TabsTrigger value='live' className='gap-1.5'>
            现网交易
            <Badge variant='destructive' className='text-[10px] px-1 py-0 h-4'>LIVE</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value='paper' className='mt-3'>
          <StrategyBotPanel mode='paper' />
        </TabsContent>
        <TabsContent value='live' className='mt-3'>
          <StrategyBotPanel mode='live' />
        </TabsContent>
      </Tabs>
    </div>
  )
}
