import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Bot, FlaskConical, Settings, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { StrategyPrompt } from '../../signals/hooks/use-strategy-prompts'
import type { AgentPrompt } from '../hooks/use-agent-prompts'
import { AGENT_TOOLS } from './agent-config-dialog'

interface Props {
  strategyPrompts: StrategyPrompt[]
  agentPrompts: AgentPrompt[]
  runningJobs: number
  totalJobs: number
  onOpenStrategyConfig: () => void
  onOpenAgentConfig: () => void
  onOpenAgentTest: () => void
}

export function BotConfigOverview({
  strategyPrompts, agentPrompts, runningJobs, totalJobs,
  onOpenStrategyConfig, onOpenAgentConfig, onOpenAgentTest,
}: Props) {
  const defaultStrategy = strategyPrompts.find((p) => p.is_default)
  const defaultAgent = agentPrompts.find((p) => p.is_default)
  const hasStrategy = !!defaultStrategy?.system_prompt
  const hasAgent = !!defaultAgent?.system_prompt
  const tradeTools = AGENT_TOOLS.filter((t) => t.category === 'trade').length
  const infoTools = AGENT_TOOLS.filter((t) => t.category === 'info').length

  return (
    <Card>
      <div className='flex items-center gap-2 px-4 pt-3 pb-2 border-b'>
        <Settings className='h-4 w-4 text-blue-500' />
        <span className='text-sm font-medium'>机器人配置</span>
      </div>
      <CardContent className='p-3'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>

          {/* AI 交易策略 */}
          <button
            onClick={onOpenStrategyConfig}
            className='text-left border rounded-lg p-3 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors group'
          >
            <div className='flex items-center gap-2 mb-2'>
              <div className='w-7 h-7 rounded-md bg-purple-500/10 flex items-center justify-center'>
                <Brain className='h-4 w-4 text-purple-500' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-xs font-medium flex items-center gap-1.5'>
                  AI 交易策略
                  {hasStrategy ? (
                    <CheckCircle className='h-3 w-3 text-green-500' />
                  ) : (
                    <XCircle className='h-3 w-3 text-red-500' />
                  )}
                </div>
              </div>
            </div>
            {hasStrategy ? (
              <div className='space-y-1'>
                <p className='text-[10px] text-muted-foreground line-clamp-2'>
                  {defaultStrategy!.name} — {defaultStrategy!.system_prompt.slice(0, 60)}...
                </p>
                <div className='flex items-center gap-2 text-[10px]'>
                  <Badge variant='secondary' className='text-[10px] px-1 py-0 h-4'>
                    {defaultStrategy!.system_prompt.length} 字符
                  </Badge>
                  <span className='text-muted-foreground'>
                    {strategyPrompts.length} 个模板
                  </span>
                </div>
              </div>
            ) : (
              <p className='text-[10px] text-muted-foreground'>
                未配置策略 Prompt，点击配置
              </p>
            )}
          </button>

          {/* 交易执行 Agent */}
          <button
            onClick={onOpenAgentConfig}
            className='text-left border rounded-lg p-3 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors group'
          >
            <div className='flex items-center gap-2 mb-2'>
              <div className='w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center'>
                <Bot className='h-4 w-4 text-blue-500' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-xs font-medium flex items-center gap-1.5'>
                  交易执行 Agent
                  {hasAgent ? (
                    <CheckCircle className='h-3 w-3 text-green-500' />
                  ) : (
                    <Clock className='h-3 w-3 text-yellow-500' />
                  )}
                </div>
              </div>
            </div>
            <div className='space-y-1'>
              {hasAgent ? (
                <p className='text-[10px] text-muted-foreground line-clamp-2'>
                  {defaultAgent!.name} — {defaultAgent!.system_prompt.slice(0, 60)}...
                </p>
              ) : (
                <p className='text-[10px] text-muted-foreground'>
                  Agent Prompt 未配置，使用内置规则
                </p>
              )}
              <div className='flex items-center gap-2 text-[10px]'>
                <Badge variant='secondary' className='text-[10px] px-1 py-0 h-4'>
                  {AGENT_TOOLS.length} tools
                </Badge>
                <span className='text-muted-foreground'>
                  {tradeTools} 交易 · {infoTools} 查询
                  {agentPrompts.length > 0 && ` · ${agentPrompts.length} 个模板`}
                </span>
              </div>
            </div>
          </button>

          {/* Agent 测试 */}
          <button
            onClick={onOpenAgentTest}
            className='text-left border rounded-lg p-3 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors group'
          >
            <div className='flex items-center gap-2 mb-2'>
              <div className='w-7 h-7 rounded-md bg-orange-500/10 flex items-center justify-center'>
                <FlaskConical className='h-4 w-4 text-orange-500' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-xs font-medium'>Agent 测试</div>
              </div>
            </div>
            <div className='space-y-1'>
              <p className='text-[10px] text-muted-foreground'>
                Chatbot 形式测试 Agent Tool Call 能力，验证策略信号 → 交易执行链路
              </p>
              <div className='flex items-center gap-2 text-[10px]'>
                {runningJobs > 0 ? (
                  <Badge className='text-[10px] px-1 py-0 h-4 bg-green-500'>
                    {runningJobs} 运行中
                  </Badge>
                ) : (
                  <Badge variant='secondary' className='text-[10px] px-1 py-0 h-4'>
                    {totalJobs} 个机器人
                  </Badge>
                )}
                <span className='text-muted-foreground'>
                  支持实时价格查询
                </span>
              </div>
            </div>
          </button>

        </div>
      </CardContent>
    </Card>
  )
}
