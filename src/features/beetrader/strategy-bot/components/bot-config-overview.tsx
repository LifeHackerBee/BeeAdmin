import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Brain, Bot, FlaskConical, Zap, CheckCircle, Clock } from 'lucide-react'
import type { StrategyPrompt } from '../../signals/hooks/use-strategy-prompts'
import type { AgentPrompt } from '../hooks/use-agent-prompts'
import { AGENT_TOOLS } from './agent-config-dialog'

interface Props {
  strategyPrompts: StrategyPrompt[]
  agentPrompts: AgentPrompt[]
  runningJobs: number
  totalJobs?: number
  onOpenStrategyConfig: () => void
  onOpenAgentConfig: () => void
  onOpenAgentTest: () => void
  onOpenCVDScalper?: () => void
}

export function BotConfigOverview({
  strategyPrompts, agentPrompts, runningJobs,
  onOpenStrategyConfig, onOpenAgentConfig, onOpenAgentTest, onOpenCVDScalper,
}: Props) {
  const defaultStrategy = strategyPrompts.find((p) => p.is_default)
  const defaultAgent = agentPrompts.find((p) => p.is_default)
  const hasStrategy = !!defaultStrategy?.system_prompt
  const hasAgent = !!defaultAgent?.system_prompt
  const enabledToolNames = defaultAgent?.enabled_tools ?? null
  const enabledCount = enabledToolNames ? enabledToolNames.length : AGENT_TOOLS.length

  return (
    <div className='flex items-center gap-2 flex-wrap'>
      <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5' onClick={onOpenStrategyConfig}>
        <Brain className='h-3.5 w-3.5 text-purple-500' />
        AI 策略
        {hasStrategy ? (
          <CheckCircle className='h-3 w-3 text-green-500' />
        ) : (
          <Clock className='h-3 w-3 text-yellow-500' />
        )}
        {hasStrategy && (
          <span className='text-[10px] text-muted-foreground font-normal hidden sm:inline'>
            {defaultStrategy!.name}
          </span>
        )}
      </Button>

      <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5' onClick={onOpenAgentConfig}>
        <Bot className='h-3.5 w-3.5 text-blue-500' />
        Agent
        {hasAgent ? (
          <CheckCircle className='h-3 w-3 text-green-500' />
        ) : (
          <Clock className='h-3 w-3 text-yellow-500' />
        )}
        <Badge variant='secondary' className='text-[10px] px-1 py-0 h-4'>
          {enabledCount} tools
        </Badge>
      </Button>

      <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5' onClick={onOpenAgentTest}>
        <FlaskConical className='h-3.5 w-3.5 text-orange-500' />
        Agent 测试
        {runningJobs > 0 && (
          <Badge className='text-[10px] px-1 py-0 h-4 bg-green-500'>
            {runningJobs} 运行
          </Badge>
        )}
      </Button>

      {onOpenCVDScalper && (
        <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5' onClick={onOpenCVDScalper}>
          <Zap className='h-3.5 w-3.5 text-yellow-500' />
          CVD Scalper
        </Button>
      )}
    </div>
  )
}
