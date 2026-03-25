import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bot, Plus, Star, Trash2, Wrench, FileText } from 'lucide-react'
import type { AgentPrompt } from '../hooks/use-agent-prompts'

export const AGENT_TOOLS = [
  { name: 'get_ai_strategy', desc: '获取最新 AI 策略缓存', params: 'coin', category: 'info' as const },
  { name: 'get_today_strategy', desc: '获取今日策略（北京8点起）', params: 'coin', category: 'info' as const },
  { name: 'get_strategy_1h', desc: '获取前1小时策略', params: 'coin', category: 'info' as const },
  { name: 'get_strategy_4h', desc: '获取前4小时策略', params: 'coin', category: 'info' as const },
  { name: 'refresh_strategy', desc: '强制重新分析（实时计算，不写库）', params: 'coin', category: 'info' as const },
  { name: 'get_current_price', desc: '查询币种实时价格', params: 'coin', category: 'info' as const },
  { name: 'get_position', desc: '查看当前持仓详情', params: '无', category: 'info' as const },
  { name: 'get_account_balance', desc: '查看账户余额和净值', params: '无', category: 'info' as const },
  { name: 'get_liquidation_price', desc: '查看当前仓位强平价', params: '无', category: 'info' as const },
  { name: 'get_market_indicators', desc: '获取多周期 Volume 和 MACD', params: 'coin, timeframes (5m/15m/1h)', category: 'info' as const },
  { name: 'get_timeframe_status', desc: '获取短线/中线/长线多周期状态', params: 'coin', category: 'info' as const },
  { name: 'get_staircase_pattern', desc: '获取阶梯形态 (4h/1d)', params: 'coin', category: 'info' as const },
  { name: 'get_resonance_analysis', desc: '获取共振分析 (评分/偏向/各指标信号)', params: 'coin', category: 'info' as const },
  { name: 'open_long', desc: '开多仓', params: 'entry_price, take_profit, stop_loss', category: 'trade' as const },
  { name: 'open_short', desc: '开空仓', params: 'entry_price, take_profit, stop_loss', category: 'trade' as const },
  { name: 'close_position', desc: '平仓（全部）', params: '无', category: 'trade' as const },
  { name: 'add_position', desc: '加仓（按比例）', params: 'scale_ratio (0.1-1.0)', category: 'trade' as const },
  { name: 'reduce_position', desc: '减仓（按比例）', params: 'scale_ratio (0.1-0.9)', category: 'trade' as const },
  { name: 'place_limit_order', desc: '挂限价单', params: 'side, price, size', category: 'trade' as const },
  { name: 'cancel_order', desc: '撤销挂单', params: 'order_id', category: 'trade' as const },
  { name: 'wait', desc: '观望，不执行任何交易', params: 'reason', category: 'control' as const },
]

const CATEGORY_STYLE = {
  info: { bg: 'bg-green-500/10 text-green-600', dot: 'bg-green-500/40', label: '信息查询' },
  trade: { bg: 'bg-blue-500/10 text-blue-600', dot: 'bg-blue-500/40', label: '交易操作' },
  control: { bg: 'bg-gray-500/10 text-gray-600', dot: 'bg-gray-500/40', label: '流程控制' },
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  prompts: AgentPrompt[]
  onCreatePrompt: (data: { name: string; description?: string; system_prompt: string }) => Promise<AgentPrompt | null>
  onUpdatePrompt: (id: number, data: { name?: string; description?: string; system_prompt?: string }) => Promise<AgentPrompt | null>
  onDeletePrompt: (id: number) => Promise<void>
  onSetDefault: (id: number) => Promise<void>
}

export function AgentConfigDialog({
  open, onOpenChange, prompts, onCreatePrompt, onUpdatePrompt, onDeletePrompt, onSetDefault,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [isNew, setIsNew] = useState(false)  // 是否处于新建模式
  const [dirty, setDirty] = useState(false)   // 是否有未保存修改

  useEffect(() => {
    if (!open || loaded) return
    setLoaded(true)
    setIsNew(false)
    setDirty(false)
    const def = prompts.find((p) => p.is_default)
    if (def) loadPrompt(def)
  }, [open, loaded, prompts]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) { setLoaded(false); setIsNew(false); setDirty(false) }
  }, [open])

  const loadPrompt = (p: AgentPrompt) => {
    setSelectedId(p.id)
    setEditName(p.name)
    setEditDesc(p.description)
    setSystemPrompt(p.system_prompt)
    setIsNew(false)
    setDirty(false)
  }

  const handleSelectPrompt = (id: string) => {
    const p = prompts.find((x) => x.id === Number(id))
    if (p) loadPrompt(p)
  }

  const markDirty = () => { if (!dirty) setDirty(true) }

  const handleSave = async () => {
    if (!systemPrompt.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        // 新建模式
        const created = await onCreatePrompt({
          name: editName.trim() || '新 Agent',
          description: editDesc.trim(),
          system_prompt: systemPrompt.trim(),
        })
        if (created) {
          setSelectedId(created.id)
          setIsNew(false)
        }
      } else if (selectedId) {
        // 更新模式
        await onUpdatePrompt(selectedId, {
          name: editName.trim() || undefined,
          description: editDesc.trim(),
          system_prompt: systemPrompt.trim(),
        })
      }
      setDirty(false)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const handleNew = () => {
    setSelectedId(null)
    setEditName('')
    setEditDesc('')
    setSystemPrompt('')
    setIsNew(true)
    setDirty(false)
  }

  const handleDelete = async () => {
    if (!selectedId) return
    await onDeletePrompt(selectedId)
    setSelectedId(null)
    setSystemPrompt('')
    setEditName('')
    setEditDesc('')
    setIsNew(false)
    setDirty(false)
    const remaining = prompts.filter((p) => p.id !== selectedId)
    if (remaining.length > 0) loadPrompt(remaining[0])
  }

  const current = prompts.find((p) => p.id === selectedId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Bot className='h-4 w-4' />
            交易执行 Agent 配置
          </DialogTitle>
        </DialogHeader>

        <p className='text-xs text-muted-foreground'>
          配置交易执行 Agent 的行为规则。Agent 接收 AI 策略信号 + 实时价格 + 账户状态，通过 Tool Call 执行具体交易动作。
        </p>

        {/* 模板选择器 */}
        <div className='flex items-center gap-2 flex-wrap'>
          {!isNew && (
            <Select value={selectedId?.toString() ?? ''} onValueChange={handleSelectPrompt}>
              <SelectTrigger className='h-8 text-xs flex-1 min-w-[200px]'>
                <SelectValue placeholder='选择 Agent 模板...' />
              </SelectTrigger>
              <SelectContent>
                {prompts.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    <span className='text-xs flex items-center gap-1'>
                      {p.is_default && <Star className='h-3 w-3 text-yellow-500 fill-yellow-500' />}
                      {p.name}
                      {p.description && <span className='text-muted-foreground ml-1'>— {p.description}</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isNew && (
            <Badge variant='secondary' className='text-xs px-2 py-1'>新建模板</Badge>
          )}

          <Button variant='outline' size='sm' className='h-8 text-xs gap-1' onClick={handleNew} disabled={saving || isNew}>
            <Plus className='h-3.5 w-3.5' /> 新建
          </Button>

          {current && !isNew && (
            <>
              <Button variant='outline' size='sm' className='h-8 text-xs gap-1' onClick={() => onSetDefault(current.id)} disabled={current.is_default}>
                <Star className='h-3.5 w-3.5' />
                {current.is_default ? '已是默认' : '设为默认'}
              </Button>
              <Button variant='ghost' size='sm' className='h-8 text-xs gap-1 text-red-500 hover:text-red-600' onClick={handleDelete}>
                <Trash2 className='h-3.5 w-3.5' /> 删除
              </Button>
            </>
          )}
          {isNew && (
            <Button variant='ghost' size='sm' className='h-8 text-xs' onClick={() => { setIsNew(false); const def = prompts.find((p) => p.is_default); if (def) loadPrompt(def) }}>
              取消新建
            </Button>
          )}
        </div>

        {/* 名称描述 — 始终显示 */}
        <div className='grid grid-cols-2 gap-2'>
          <div className='space-y-1'>
            <Label className='text-xs'>名称</Label>
            <Input value={editName} onChange={(e) => { setEditName(e.target.value); markDirty() }} className='h-8 text-xs' placeholder='Agent 名称' />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs'>描述</Label>
            <Input value={editDesc} onChange={(e) => { setEditDesc(e.target.value); markDirty() }} className='h-8 text-xs' placeholder='可选描述' />
          </div>
        </div>

        {/* Tabs: Agent Prompt / 可用 Tools */}
        <Tabs defaultValue='prompt' className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='prompt'>
              <FileText className='h-3.5 w-3.5 mr-1.5' />
              Agent Prompt
            </TabsTrigger>
            <TabsTrigger value='tools'>
              <Wrench className='h-3.5 w-3.5 mr-1.5' />
              可用 Tools ({AGENT_TOOLS.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Agent Prompt Tab ── */}
          <TabsContent value='prompt' className='space-y-2 mt-3'>
            <div className='flex items-center justify-between'>
              <p className='text-[10px] text-muted-foreground'>
                定义 Agent 的决策流程、交易规则和安全约束。Agent 根据此 Prompt 决定调用哪些 Tools。
              </p>
              <Badge variant='outline' className='text-[10px] px-1.5 py-0 h-4 shrink-0'>
                {systemPrompt.length} 字符
              </Badge>
            </div>
            <Textarea
              value={systemPrompt}
              onChange={(e) => { setSystemPrompt(e.target.value); markDirty() }}
              placeholder={`定义交易执行 Agent 的行为规则。\n\n示例：\n你是交易执行 Agent，根据 AI 策略信号决定交易动作。\n\n规则:\n1. 先调用 get_ai_strategy 获取最新策略信号\n2. 调用 get_current_price 获取实时价格\n3. 调用 get_position 检查当前持仓\n4. 信号为"做多"且实时价在入场区间内且无持仓 → 调用 open_long\n5. 信号为"做空"且实时价在入场区间内且无持仓 → 调用 open_short\n6. 有持仓且实时价触及止损位 → 调用 close_position\n7. 有持仓且信号建议加仓 → 调用 add_position\n8. 信号为"观望"或实时价不在入场区间 → 调用 wait\n9. 入场价与实时价偏差 > 3% → 强制 wait`}
              rows={18}
              className='font-mono text-xs'
            />
          </TabsContent>

          {/* ── 可用 Tools Tab ── */}
          <TabsContent value='tools' className='space-y-2 mt-3'>
            <p className='text-[10px] text-muted-foreground'>
              Agent 可调用以下 Tools 执行交易操作和信息查询。在 Prompt 中引用这些 Tool 名称来定义决策规则。
            </p>
            <div className='border rounded-md overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50'>
                    <TableHead className='text-[10px] h-7 w-[150px]'>Tool</TableHead>
                    <TableHead className='text-[10px] h-7'>说明</TableHead>
                    <TableHead className='text-[10px] h-7 w-[200px]'>参数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AGENT_TOOLS.map((tool) => (
                    <TableRow key={tool.name}>
                      <TableCell className='py-1 px-2'>
                        <code className={`text-[10px] font-mono px-1 py-0.5 rounded ${CATEGORY_STYLE[tool.category].bg}`}>
                          {tool.name}
                        </code>
                      </TableCell>
                      <TableCell className='py-1 px-2 text-[10px] text-muted-foreground'>{tool.desc}</TableCell>
                      <TableCell className='py-1 px-2 text-[10px] font-mono text-muted-foreground'>{tool.params}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className='flex gap-3 text-[10px] text-muted-foreground'>
              {Object.values(CATEGORY_STYLE).map((s) => (
                <span key={s.label} className='flex items-center gap-1'>
                  <span className={`inline-block w-2 h-2 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className='flex items-center'>
          {dirty && <span className='text-[10px] text-yellow-500 mr-auto'>有未保存的修改</span>}
          <Button variant='outline' onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving || !systemPrompt.trim() || (!isNew && !selectedId)}>
            {saving ? '保存中...' : isNew ? '创建' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
