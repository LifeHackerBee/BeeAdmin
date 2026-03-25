import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Bot, Send, RotateCcw, Star, Loader2, Wrench, User, AlertCircle } from 'lucide-react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import type { AgentPrompt } from '../hooks/use-agent-prompts'
import { AGENT_TOOLS } from './agent-config-dialog'

interface ToolCall {
  name: string
  args: Record<string, unknown>
  result?: unknown
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  timestamp: Date
  error?: boolean
}

// 模拟 tool 执行结果
async function executeToolCall(name: string, args: Record<string, unknown>, coin: string): Promise<unknown> {
  const baseUrl = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'
  const apiKey = import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['X-API-Key'] = apiKey

  switch (name) {
    case 'get_current_price': {
      const c = (args.coin as string) || coin
      try {
        const res = await fetch(`${baseUrl}/api/hyperliquid/market/price/${c}`, { headers })
        const data = await res.json()
        return { coin: c, price: data.price ?? 'N/A' }
      } catch {
        return { error: `无法获取 ${c} 价格` }
      }
    }
    case 'get_ai_strategy': {
      try {
        const res = await hyperliquidApiGet<{ success: boolean; data?: unknown }>(`/api/strategy_bot/jobs`)
        const jobs = (res as { jobs?: { coin: string; last_signal_json?: unknown }[] }).jobs ?? []
        const job = jobs.find((j: { coin: string }) => j.coin === coin)
        if (job?.last_signal_json) return job.last_signal_json
        return { info: `${coin} 暂无最新策略信号` }
      } catch {
        return { error: '获取策略信号失败' }
      }
    }
    case 'get_position': {
      try {
        const res = await hyperliquidApiGet<{ success: boolean; data?: unknown }>(`/api/strategy_bot/jobs`)
        const jobs = (res as { jobs?: { coin: string; has_open_position?: boolean; open_task_id?: number }[] }).jobs ?? []
        const job = jobs.find((j: { coin: string }) => j.coin === coin)
        if (!job) return { has_position: false, coin }
        return {
          coin,
          has_position: job.has_open_position ?? false,
          open_task_id: job.open_task_id,
        }
      } catch {
        return { error: '获取持仓信息失败' }
      }
    }
    case 'get_account_balance': {
      try {
        const res = await hyperliquidApiGet<{ success: boolean; data?: unknown }>(`/api/strategy_bot/jobs`)
        const jobs = (res as { jobs?: { coin: string; account_balance?: number; account_initial_balance?: number; total_pnl?: number }[] }).jobs ?? []
        const job = jobs.find((j: { coin: string }) => j.coin === coin)
        if (!job) return { error: `未找到 ${coin} 机器人` }
        return {
          coin,
          balance: job.account_balance,
          initial_balance: job.account_initial_balance,
          total_pnl: job.total_pnl,
        }
      } catch {
        return { error: '获取账户余额失败' }
      }
    }
    case 'wait':
      return { status: 'waiting', reason: args.reason || '观望中' }
    case 'open_long':
    case 'open_short':
    case 'close_position':
    case 'add_position':
    case 'reduce_position':
    case 'place_limit_order':
    case 'cancel_order':
      return { status: 'simulated', action: name, args, note: '测试模式 — 未执行真实交易' }
    case 'get_liquidation_price':
      return { liquidation_price: null, note: '模拟模式无强平价' }
    default:
      return { error: `未知 tool: ${name}` }
  }
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  prompts: AgentPrompt[]
  defaultCoin?: string
}

export function AgentTestDialog({ open, onOpenChange, prompts, defaultCoin = 'BTC' }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [coin, setCoin] = useState(defaultCoin)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const def = prompts.find((p) => p.is_default)
    if (def) setSelectedId(def.id)
  }, [open, prompts])

  useEffect(() => {
    if (open) setCoin(defaultCoin)
  }, [open, defaultCoin])

  // 自动滚到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const currentPrompt = prompts.find((p) => p.id === selectedId)

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      // 调用后端 Agent 测试接口 (如果存在)，否则用前端模拟
      const agentPromptText = currentPrompt?.system_prompt || ''
      const systemText = agentPromptText || `你是交易执行 Agent。根据用户指令和市场数据决定交易操作。可用 tools: ${AGENT_TOOLS.map((t) => t.name).join(', ')}`

      const baseUrl = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'
      const apiKey = import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['X-API-Key'] = apiKey

      // 尝试调用后端 agent/test 端点
      let agentResponse: { content?: string; tool_calls?: { name: string; args: Record<string, unknown> }[]; error?: string } | null = null
      try {
        const res = await fetch(`${baseUrl}/api/strategy_bot/agent/test`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: text,
            coin,
            system_prompt: systemText,
            history: messages.filter((m) => m.role !== 'tool').slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        })
        if (res.ok) {
          agentResponse = await res.json()
        }
      } catch {
        // 后端未部署 agent/test 端点，用前端模拟
      }

      if (agentResponse && !agentResponse.error) {
        // 后端返回了 agent 响应
        const toolCalls = (agentResponse.tool_calls || []).map((tc) => ({
          name: tc.name,
          args: tc.args,
        }))

        // 执行 tool calls 获取结果
        const executedToolCalls: ToolCall[] = []
        for (const tc of toolCalls) {
          const result = await executeToolCall(tc.name, tc.args, coin)
          executedToolCalls.push({ ...tc, result })
        }

        if (executedToolCalls.length > 0) {
          const toolMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'tool',
            content: executedToolCalls.map((tc) =>
              `🔧 ${tc.name}(${Object.keys(tc.args).length > 0 ? JSON.stringify(tc.args) : ''})\n→ ${JSON.stringify(tc.result, null, 2)}`
            ).join('\n\n'),
            toolCalls: executedToolCalls,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, toolMsg])
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: agentResponse.content || '(无文本响应)',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } else {
        // 前端模拟模式：根据关键词模拟 tool call
        const simulatedCalls = simulateToolCalls(text, coin)

        if (simulatedCalls.length > 0) {
          const executedToolCalls: ToolCall[] = []
          for (const tc of simulatedCalls) {
            const result = await executeToolCall(tc.name, tc.args, coin)
            executedToolCalls.push({ ...tc, result })
          }

          const toolMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'tool',
            content: executedToolCalls.map((tc) =>
              `🔧 ${tc.name}(${Object.keys(tc.args).length > 0 ? JSON.stringify(tc.args) : ''})\n→ ${JSON.stringify(tc.result, null, 2)}`
            ).join('\n\n'),
            toolCalls: executedToolCalls,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, toolMsg])
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: agentResponse?.error
            ? `⚠️ 后端 Agent 测试端点未就绪，使用前端模拟模式。\n\n${generateSimulatedResponse(text, simulatedCalls)}`
            : generateSimulatedResponse(text, simulatedCalls),
          timestamp: new Date(),
          error: !!agentResponse?.error,
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `执行出错: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date(),
        error: true,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, coin, currentPrompt, messages])

  const handleReset = () => {
    setMessages([])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl h-[85vh] flex flex-col p-0'>
        <DialogHeader className='px-4 pt-4 pb-2 border-b shrink-0'>
          <DialogTitle className='flex items-center gap-2 text-sm'>
            <Bot className='h-4 w-4' />
            交易执行 Agent 测试
          </DialogTitle>
          <div className='flex items-center gap-2 mt-1'>
            <Select value={selectedId?.toString() ?? ''} onValueChange={(v) => setSelectedId(Number(v))}>
              <SelectTrigger className='h-7 text-[10px] w-[160px]'>
                <SelectValue placeholder='选择配置...' />
              </SelectTrigger>
              <SelectContent>
                {prompts.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    <span className='text-[10px] flex items-center gap-1'>
                      {p.is_default && <Star className='h-2.5 w-2.5 text-yellow-500 fill-yellow-500' />}
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={coin}
              onChange={(e) => setCoin(e.target.value.toUpperCase())}
              className='h-7 text-[10px] w-[80px] font-mono'
              placeholder='BTC'
            />
            <Badge variant={currentPrompt?.system_prompt ? 'default' : 'secondary'} className='text-[10px] px-1.5 py-0'>
              {currentPrompt?.system_prompt ? 'Agent 已配置' : '模拟模式'}
            </Badge>
            <Button variant='ghost' size='sm' className='h-7 text-[10px] ml-auto gap-1' onClick={handleReset}>
              <RotateCcw className='h-3 w-3' /> 清空
            </Button>
          </div>
        </DialogHeader>

        {/* 消息区域 */}
        <ScrollArea className='flex-1 min-h-0'>
          <div ref={scrollRef} className='p-4 space-y-3'>
            {messages.length === 0 && (
              <div className='text-center py-12 text-muted-foreground'>
                <Bot className='h-10 w-10 mx-auto mb-3 opacity-20' />
                <p className='text-sm'>向 Agent 发送指令来测试 Tool Call 能力</p>
                <div className='mt-3 flex flex-wrap justify-center gap-1.5'>
                  {[
                    '查看 BTC 当前价格',
                    '分析当前市场，给出交易建议',
                    '查看持仓和账户余额',
                    '开多 BTC，止盈 90000，止损 85000',
                  ].map((hint) => (
                    <button
                      key={hint}
                      className='text-[10px] px-2 py-1 rounded-full border hover:bg-muted transition-colors'
                      onClick={() => { setInput(hint); inputRef.current?.focus() }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role !== 'user' && (
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white ${
                    msg.role === 'tool' ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {msg.role === 'tool' ? <Wrench className='h-3 w-3' /> : <Bot className='h-3 w-3' />}
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : msg.role === 'tool'
                      ? 'bg-orange-500/10 border border-orange-500/20'
                      : msg.error
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-muted'
                }`}>
                  {msg.role === 'tool' && (
                    <div className='flex items-center gap-1 mb-1 text-[10px] text-orange-600 font-medium'>
                      <Wrench className='h-2.5 w-2.5' />
                      Tool Calls
                    </div>
                  )}
                  {msg.error && (
                    <div className='flex items-center gap-1 mb-1 text-[10px] text-red-500 font-medium'>
                      <AlertCircle className='h-2.5 w-2.5' />
                      Error
                    </div>
                  )}
                  <pre className='whitespace-pre-wrap font-mono leading-relaxed'>{msg.content}</pre>
                  <div className='text-[10px] text-muted-foreground mt-1 text-right'>
                    {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className='shrink-0 w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white'>
                    <User className='h-3 w-3' />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className='flex gap-2'>
                <div className='shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white'>
                  <Bot className='h-3 w-3' />
                </div>
                <div className='bg-muted rounded-lg px-3 py-2 text-xs flex items-center gap-1.5'>
                  <Loader2 className='h-3 w-3 animate-spin' />
                  Agent 思考中...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 输入区域 */}
        <div className='border-t p-3 shrink-0'>
          <div className='flex gap-2'>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`向 Agent 发送指令... (如: 查看 ${coin} 现价)`}
              className='text-xs'
              disabled={loading}
            />
            <Button size='sm' onClick={handleSend} disabled={loading || !input.trim()}>
              <Send className='h-3.5 w-3.5' />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 前端模拟: 根据用户输入推断要调用的 tools
function simulateToolCalls(text: string, coin: string): { name: string; args: Record<string, unknown> }[] {
  const calls: { name: string; args: Record<string, unknown> }[] = []
  const lower = text.toLowerCase()

  if (lower.includes('价格') || lower.includes('price') || lower.includes('现价')) {
    calls.push({ name: 'get_current_price', args: { coin } })
  }
  if (lower.includes('策略') || lower.includes('信号') || lower.includes('分析') || lower.includes('建议')) {
    calls.push({ name: 'get_ai_strategy', args: {} })
  }
  if (lower.includes('持仓') || lower.includes('position') || lower.includes('仓位')) {
    calls.push({ name: 'get_position', args: {} })
  }
  if (lower.includes('余额') || lower.includes('账户') || lower.includes('balance') || lower.includes('资产')) {
    calls.push({ name: 'get_account_balance', args: {} })
  }
  if (lower.includes('强平') || lower.includes('liquidat')) {
    calls.push({ name: 'get_liquidation_price', args: {} })
  }
  if (lower.includes('开多') || lower.includes('做多') || lower.includes('buy') || lower.includes('long')) {
    calls.push({ name: 'open_long', args: { entry_price: 'market', take_profit: 0, stop_loss: 0 } })
  }
  if (lower.includes('开空') || lower.includes('做空') || lower.includes('sell') || lower.includes('short')) {
    calls.push({ name: 'open_short', args: { entry_price: 'market', take_profit: 0, stop_loss: 0 } })
  }
  if (lower.includes('平仓') || lower.includes('close')) {
    calls.push({ name: 'close_position', args: {} })
  }
  if (lower.includes('加仓') || lower.includes('add')) {
    calls.push({ name: 'add_position', args: { scale_ratio: 0.5 } })
  }
  if (lower.includes('减仓') || lower.includes('reduce')) {
    calls.push({ name: 'reduce_position', args: { scale_ratio: 0.5 } })
  }

  // 默认: 如果没匹配到任何 tool，至少获取价格
  if (calls.length === 0) {
    calls.push({ name: 'get_current_price', args: { coin } })
  }

  return calls
}

function generateSimulatedResponse(_text: string, toolCalls: { name: string; args: Record<string, unknown> }[]): string {
  const toolNames = toolCalls.map((tc) => tc.name)
  const parts: string[] = []

  if (toolNames.includes('open_long') || toolNames.includes('open_short')) {
    parts.push('📋 已模拟执行交易指令（测试模式，未实际下单）。')
  }
  if (toolNames.includes('get_ai_strategy')) {
    parts.push('已获取最新 AI 策略信号，请查看上方 Tool Call 返回数据。')
  }
  if (toolNames.includes('get_current_price')) {
    parts.push('已查询实时价格。')
  }
  if (toolNames.includes('get_position') || toolNames.includes('get_account_balance')) {
    parts.push('已查询账户/持仓状态。')
  }
  if (toolNames.includes('close_position')) {
    parts.push('📋 已模拟平仓（测试模式）。')
  }
  if (toolNames.includes('wait')) {
    parts.push('当前建议观望，暂不执行交易。')
  }

  if (parts.length === 0) {
    parts.push('已处理您的请求。')
  }

  return parts.join('\n')
}
