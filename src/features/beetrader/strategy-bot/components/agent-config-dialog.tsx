import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
import { Bot, Star } from 'lucide-react'
import type { StrategyPrompt } from '../../signals/hooks/use-strategy-prompts'

export const AGENT_TOOLS = [
  { name: 'get_ai_strategy', desc: '获取 AI 策略分析信号', params: '无', category: 'info' as const },
  { name: 'get_current_price', desc: '查询币种实时价格', params: 'coin', category: 'info' as const },
  { name: 'get_position', desc: '查看当前持仓详情', params: '无', category: 'info' as const },
  { name: 'get_account_balance', desc: '查看账户余额和净值', params: '无', category: 'info' as const },
  { name: 'get_liquidation_price', desc: '查看当前仓位强平价', params: '无', category: 'info' as const },
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
  prompts: StrategyPrompt[]
  onUpdatePrompt: (id: number, data: { agent_prompt?: string }) => Promise<StrategyPrompt | null>
}

export function AgentConfigDialog({ open, onOpenChange, prompts, onUpdatePrompt }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [agentPrompt, setAgentPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    setLoaded(true)
    const def = prompts.find((p) => p.is_default)
    if (def) {
      setSelectedId(def.id)
      setAgentPrompt(def.agent_prompt || '')
    }
  }, [open, loaded, prompts]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) setLoaded(false)
  }, [open])

  const handleSelectPrompt = (id: string) => {
    const p = prompts.find((x) => x.id === Number(id))
    if (p) {
      setSelectedId(p.id)
      setAgentPrompt(p.agent_prompt || '')
    }
  }

  const handleSave = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      await onUpdatePrompt(selectedId, { agent_prompt: agentPrompt.trim() })
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
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

        {/* 选择关联的策略配置 */}
        <div className='flex items-center gap-2'>
          <Label className='text-xs shrink-0'>关联策略:</Label>
          <Select value={selectedId?.toString() ?? ''} onValueChange={handleSelectPrompt}>
            <SelectTrigger className='h-8 text-xs flex-1'>
              <SelectValue placeholder='选择策略配置...' />
            </SelectTrigger>
            <SelectContent>
              {prompts.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  <span className='text-xs flex items-center gap-1'>
                    {p.is_default && <Star className='h-3 w-3 text-yellow-500 fill-yellow-500' />}
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {current && (
            <Badge variant={current.agent_prompt ? 'default' : 'secondary'} className='text-[10px] shrink-0'>
              {current.agent_prompt ? '已配置' : '未配置'}
            </Badge>
          )}
        </div>

        {/* 可用 Tools 列表 */}
        <div className='space-y-1.5'>
          <Label className='text-xs font-medium'>可用 Tools ({AGENT_TOOLS.length})</Label>
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
        </div>

        {/* Agent Prompt 编辑 */}
        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <Label className='text-xs font-medium'>Agent System Prompt</Label>
            <Badge variant='outline' className='text-[10px] px-1.5 py-0 h-4'>
              {agentPrompt.length} 字符
            </Badge>
          </div>
          <Textarea
            value={agentPrompt}
            onChange={(e) => setAgentPrompt(e.target.value)}
            placeholder={`定义交易执行 Agent 的行为规则。\n\n示例：\n你是交易执行 Agent，根据 AI 策略信号决定交易动作。\n\n规则:\n1. 先调用 get_ai_strategy 获取最新策略信号\n2. 调用 get_current_price 获取实时价格\n3. 调用 get_position 检查当前持仓\n4. 信号为"做多"且实时价在入场区间内且无持仓 → 调用 open_long\n5. 信号为"做空"且实时价在入场区间内且无持仓 → 调用 open_short\n6. 有持仓且实时价触及止损位 → 调用 close_position\n7. 有持仓且信号建议加仓 → 调用 add_position\n8. 信号为"观望"或实时价不在入场区间 → 调用 wait\n9. 入场价与实时价偏差 > 3% → 强制 wait`}
            rows={14}
            className='font-mono text-xs'
          />
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving || !selectedId}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
