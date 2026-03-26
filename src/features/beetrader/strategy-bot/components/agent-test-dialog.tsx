import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Bot, Send, RotateCcw, Star, Loader2, Wrench, User, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import type { AgentPrompt } from '../hooks/use-agent-prompts'
import { AGENT_TOOLS } from './agent-config-dialog'

const ALL_TOOL_NAMES = AGENT_TOOLS.map((t) => t.name)

const CATEGORY_STYLE: Record<string, { dot: string; label: string }> = {
  info: { dot: 'bg-green-500', label: '查询' },
  trade: { dot: 'bg-blue-500', label: '交易' },
  control: { dot: 'bg-gray-500', label: '控制' },
}

interface ToolCallItem {
  name: string
  args: Record<string, unknown>
  result?: unknown
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCallItem[]
  rounds?: number
  timestamp: Date
  error?: boolean
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
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false)
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set(ALL_TOOL_NAMES))
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentPrompt = prompts.find((p) => p.id === selectedId)

  // 选择 Agent 模板时同步其 enabled_tools
  useEffect(() => {
    if (!open) return
    const def = prompts.find((p) => p.is_default)
    if (def) {
      setSelectedId(def.id)
      setEnabledTools(new Set(def.enabled_tools ?? ALL_TOOL_NAMES))
    }
  }, [open, prompts])

  const handleSelectPrompt = useCallback((v: string) => {
    const id = Number(v)
    setSelectedId(id)
    const p = prompts.find((x) => x.id === id)
    if (p) setEnabledTools(new Set(p.enabled_tools ?? ALL_TOOL_NAMES))
  }, [prompts])

  useEffect(() => {
    if (open) setCoin(defaultCoin)
  }, [open, defaultCoin])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const toggleTool = useCallback((name: string) => {
    setEnabledTools((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }, [])

  const toggleCategory = useCallback((category: string) => {
    const catTools = AGENT_TOOLS.filter((t) => t.category === category).map((t) => t.name)
    setEnabledTools((prev) => {
      const next = new Set(prev)
      const allOn = catTools.every((n) => next.has(n))
      catTools.forEach((n) => allOn ? next.delete(n) : next.add(n))
      return next
    })
  }, [])

  const toolStats = useMemo(() => ({
    enabled: enabledTools.size,
    total: ALL_TOOL_NAMES.length,
  }), [enabledTools])

  const enabledToolNames = useMemo(() => Array.from(enabledTools), [enabledTools])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const baseUrl = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'
      const apiKey = import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['X-API-Key'] = apiKey

      const systemText = currentPrompt?.system_prompt || ''
      const minRr = currentPrompt?.min_rr_ratio ?? 1.5

      // 构建历史（只传 user / assistant，不传 tool）
      const history = messages
        .filter((m) => m.role !== 'tool')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch(`${baseUrl}/api/strategy_bot/agent/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          coin,
          system_prompt: systemText || undefined,
          enabled_tools: enabledToolNames,
          history,
          min_rr_ratio: minRr,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(String(err.detail || err.error || `HTTP ${res.status}`))
      }

      const data: { content: string; tool_calls: ToolCallItem[]; rounds: number } = await res.json()

      // 渲染 tool calls（如果有）
      if (data.tool_calls && data.tool_calls.length > 0) {
        const toolMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'tool',
          content: data.tool_calls.map((tc) =>
            `🔧 ${tc.name}(${Object.keys(tc.args).length > 0 ? JSON.stringify(tc.args) : ''})\n→ ${JSON.stringify(tc.result, null, 2)}`
          ).join('\n\n'),
          toolCalls: data.tool_calls,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, toolMsg])
      }

      // 渲染 assistant 最终回复
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content || '(无文本响应)',
        rounds: data.rounds,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])

    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Agent 调用失败: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date(),
        error: true,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, coin, currentPrompt, messages, enabledToolNames])

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
            <Select value={selectedId?.toString() ?? ''} onValueChange={handleSelectPrompt}>
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
            <Badge variant='default' className='text-[10px] px-1.5 py-0'>
              OpenAI Agent
            </Badge>
            <Button variant='ghost' size='sm' className='h-7 text-[10px] ml-auto gap-1' onClick={handleReset}>
              <RotateCcw className='h-3 w-3' /> 清空
            </Button>
          </div>

          {/* Tools 选择面板 */}
          <Collapsible open={toolsPanelOpen} onOpenChange={setToolsPanelOpen} className='mt-1'>
            <CollapsibleTrigger asChild>
              <button className='flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full py-1'>
                {toolsPanelOpen ? <ChevronDown className='h-3 w-3' /> : <ChevronRight className='h-3 w-3' />}
                <Wrench className='h-3 w-3' />
                <span>可用 Tools</span>
                <Badge variant='outline' className='text-[10px] px-1 py-0 h-4'>
                  {toolStats.enabled}/{toolStats.total}
                </Badge>
                {toolStats.enabled < toolStats.total && (
                  <span className='text-yellow-500'>({toolStats.total - toolStats.enabled} 已禁用)</span>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className='border rounded-md p-2 mt-1 space-y-1.5 max-h-[200px] overflow-y-auto'>
                <div className='flex items-center gap-1 pb-1 border-b'>
                  <Button variant='ghost' size='sm' className='h-5 text-[10px] px-1.5' onClick={() => setEnabledTools(new Set(ALL_TOOL_NAMES))}>
                    全选
                  </Button>
                  <Button variant='ghost' size='sm' className='h-5 text-[10px] px-1.5' onClick={() => setEnabledTools(new Set())}>
                    全不选
                  </Button>
                  {currentPrompt?.enabled_tools && (
                    <Button variant='ghost' size='sm' className='h-5 text-[10px] px-1.5' onClick={() => setEnabledTools(new Set(currentPrompt.enabled_tools ?? ALL_TOOL_NAMES))}>
                      同步配置
                    </Button>
                  )}
                </div>

                {(['info', 'trade', 'control'] as const).map((cat) => {
                  const catTools = AGENT_TOOLS.filter((t) => t.category === cat)
                  const style = CATEGORY_STYLE[cat]
                  const allOn = catTools.every((t) => enabledTools.has(t.name))
                  return (
                    <div key={cat}>
                      <div className='flex items-center gap-1.5 py-0.5'>
                        <Switch checked={allOn} onCheckedChange={() => toggleCategory(cat)} className='scale-[0.55]' />
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        <span className='text-[10px] font-medium'>{style.label}</span>
                        <span className='text-[10px] text-muted-foreground'>
                          ({catTools.filter((t) => enabledTools.has(t.name)).length}/{catTools.length})
                        </span>
                      </div>
                      <div className='flex flex-wrap gap-1 pl-6 pb-1'>
                        {catTools.map((tool) => {
                          const on = enabledTools.has(tool.name)
                          return (
                            <button
                              key={tool.name}
                              onClick={() => toggleTool(tool.name)}
                              title={`${tool.desc}\n参数: ${tool.params}`}
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                                on
                                  ? 'bg-primary/10 border-primary/30 text-foreground'
                                  : 'bg-muted/30 border-transparent text-muted-foreground/40 line-through'
                              } hover:border-primary/50`}
                            >
                              {tool.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </DialogHeader>

        {/* 消息区域 */}
        <ScrollArea className='flex-1 min-h-0'>
          <div ref={scrollRef} className='p-4 space-y-3'>
            {messages.length === 0 && (
              <div className='text-center py-12 text-muted-foreground'>
                <Bot className='h-10 w-10 mx-auto mb-3 opacity-20' />
                <p className='text-sm'>向 Agent 发送指令来测试 Tool Call 能力</p>
                <p className='text-[10px] mt-1'>已启用 {toolStats.enabled} 个 Tools · 后端 OpenAI Agent 执行</p>
                <div className='mt-3 flex flex-wrap justify-center gap-1.5'>
                  {[
                    `查看 ${coin} 当前价格`,
                    '分析当前市场，给出交易建议',
                    '查看持仓和账户余额',
                    `帮我计算 ${coin} 做多入场 87000 止盈 90000 止损 85000 的盈亏比`,
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
                      Tool Calls ({msg.toolCalls?.length ?? 0})
                    </div>
                  )}
                  {msg.error && (
                    <div className='flex items-center gap-1 mb-1 text-[10px] text-red-500 font-medium'>
                      <AlertCircle className='h-2.5 w-2.5' />
                      Error
                    </div>
                  )}
                  <pre className='whitespace-pre-wrap font-mono leading-relaxed'>{msg.content}</pre>
                  <div className='flex items-center justify-end gap-2 mt-1'>
                    {msg.rounds != null && msg.rounds > 0 && (
                      <span className='text-[10px] text-blue-500'>{msg.rounds} 轮 tool calls</span>
                    )}
                    <span className='text-[10px] text-muted-foreground'>
                      {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
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
                  Agent 执行中 (OpenAI tool-calling)...
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
              placeholder={`向 Agent 发送指令... (如: 分析 ${coin} 并给出交易建议)`}
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
