import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bot, Plus, Star, Trash2, Wrench, FileText, Shield, Info, Zap, ChevronRight, GripVertical } from 'lucide-react'
import type { AgentPrompt } from '../hooks/use-agent-prompts'
import { useAgentSkills, type AgentSkill } from '../hooks/use-agent-skills'

export const AGENT_TOOLS = [
  { name: 'get_current_price', desc: '查询币种实时价格', params: 'coin', category: 'info' as const },
  { name: 'get_strategy', desc: '获取 AI 策略缓存（支持不同时段）', params: 'coin, period (latest/today/1h/4h)', category: 'info' as const },
  { name: 'refresh_strategy', desc: '强制重新分析全量指标（实时计算，不写库）', params: 'coin', category: 'info' as const },
  { name: 'get_account_state', desc: '查看账户余额、持仓详情、强平价、绩效', params: 'coin', category: 'info' as const },
  { name: 'analyze_market', desc: '获取多周期状态、阶梯形态、共振分析、指标数据', params: 'coin', category: 'info' as const },
  { name: 'get_volume_flow', desc: '获取5分钟量级变化：量比、异常放量、多空方向', params: 'coin', category: 'info' as const },
  { name: 'calculate_risk_reward', desc: '计算盈亏比并校验是否满足最低要求', params: 'entry_price, take_profit, stop_loss, direction', category: 'trade' as const },
  { name: 'open_position', desc: '开仓（多/空）', params: 'direction (long/short), entry_price, take_profit, stop_loss', category: 'trade' as const },
  { name: 'close_position', desc: '平仓（全部）', params: '无', category: 'trade' as const },
  { name: 'scale_position', desc: '加仓或减仓（按比例）', params: 'action (add/reduce), scale_ratio (0.1-1.0)', category: 'trade' as const },
  { name: 'manage_order', desc: '挂限价单或撤销挂单', params: 'action (place/cancel), side?, price?, size?, order_id?', category: 'trade' as const },
  { name: 'wait', desc: '观望，不执行任何交易', params: 'reason', category: 'control' as const },
]

const ALL_TOOL_NAMES = AGENT_TOOLS.map((t) => t.name)

const CATEGORY_STYLE = {
  info: { bg: 'bg-green-500/10 text-green-600', dot: 'bg-green-500/40', label: '信息查询' },
  trade: { bg: 'bg-blue-500/10 text-blue-600', dot: 'bg-blue-500/40', label: '交易操作' },
  control: { bg: 'bg-gray-500/10 text-gray-600', dot: 'bg-gray-500/40', label: '流程控制' },
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  prompts: AgentPrompt[]
  onCreatePrompt: (data: { name: string; description?: string; system_prompt: string; enabled_tools?: string[] | null; min_rr_ratio?: number | null }) => Promise<AgentPrompt | null>
  onUpdatePrompt: (id: number, data: { name?: string; description?: string; system_prompt?: string; enabled_tools?: string[] | null; min_rr_ratio?: number | null }) => Promise<AgentPrompt | null>
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
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set(ALL_TOOL_NAMES))
  const [minRrRatio, setMinRrRatio] = useState('1.5')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [dirty, setDirty] = useState(false)
  const agentSkills = useAgentSkills(open)

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
    setEnabledTools(new Set(p.enabled_tools ?? ALL_TOOL_NAMES))
    setMinRrRatio(String(p.min_rr_ratio ?? 1.5))
    setIsNew(false)
    setDirty(false)
  }

  const handleSelectPrompt = (id: string) => {
    const p = prompts.find((x) => x.id === Number(id))
    if (p) loadPrompt(p)
  }

  const markDirty = () => { if (!dirty) setDirty(true) }

  const toggleTool = (name: string) => {
    setEnabledTools((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
    markDirty()
  }

  const toggleCategory = (category: string) => {
    const categoryTools = AGENT_TOOLS.filter((t) => t.category === category).map((t) => t.name)
    const allEnabled = categoryTools.every((n) => enabledTools.has(n))
    setEnabledTools((prev) => {
      const next = new Set(prev)
      categoryTools.forEach((n) => allEnabled ? next.delete(n) : next.add(n))
      return next
    })
    markDirty()
  }

  const handleSave = async () => {
    if (!systemPrompt.trim()) return
    setSaving(true)
    const toolsPayload = enabledTools.size === ALL_TOOL_NAMES.length ? null : Array.from(enabledTools)
    const rrPayload = parseFloat(minRrRatio)
    try {
      if (isNew) {
        const created = await onCreatePrompt({
          name: editName.trim() || '新 Agent',
          description: editDesc.trim(),
          system_prompt: systemPrompt.trim(),
          enabled_tools: toolsPayload,
          min_rr_ratio: rrPayload >= 0 ? rrPayload : 1.5,
        })
        if (created) {
          setSelectedId(created.id)
          setIsNew(false)
        }
      } else if (selectedId) {
        await onUpdatePrompt(selectedId, {
          name: editName.trim() || undefined,
          description: editDesc.trim(),
          system_prompt: systemPrompt.trim(),
          enabled_tools: toolsPayload,
          min_rr_ratio: rrPayload >= 0 ? rrPayload : 1.5,
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
    setEnabledTools(new Set(ALL_TOOL_NAMES))
    setMinRrRatio('1.5')
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
    setEnabledTools(new Set(ALL_TOOL_NAMES))
    setMinRrRatio('1.5')
    setIsNew(false)
    setDirty(false)
    const remaining = prompts.filter((p) => p.id !== selectedId)
    if (remaining.length > 0) loadPrompt(remaining[0])
  }

  const current = prompts.find((p) => p.id === selectedId)

  const toolStats = useMemo(() => {
    const enabled = enabledTools.size
    const total = ALL_TOOL_NAMES.length
    const byCategory = {
      info: AGENT_TOOLS.filter((t) => t.category === 'info' && enabledTools.has(t.name)).length,
      trade: AGENT_TOOLS.filter((t) => t.category === 'trade' && enabledTools.has(t.name)).length,
      control: AGENT_TOOLS.filter((t) => t.category === 'control' && enabledTools.has(t.name)).length,
    }
    return { enabled, total, byCategory }
  }, [enabledTools])

  const parsedRr = parseFloat(minRrRatio) || 0

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

        {/* 名称描述 */}
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

        {/* Tabs: Agent Prompt / Tools 配置 / Skills / 交易参数 */}
        <Tabs defaultValue='prompt' className='w-full'>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger value='prompt'>
              <FileText className='h-3.5 w-3.5 mr-1.5' />
              Prompt
            </TabsTrigger>
            <TabsTrigger value='tools'>
              <Wrench className='h-3.5 w-3.5 mr-1.5' />
              Tools ({toolStats.enabled}/{toolStats.total})
            </TabsTrigger>
            <TabsTrigger value='skills'>
              <Zap className='h-3.5 w-3.5 mr-1.5' />
              Skills ({agentSkills.skills.filter(s => s.is_enabled).length})
            </TabsTrigger>
            <TabsTrigger value='params'>
              <Shield className='h-3.5 w-3.5 mr-1.5' />
              交易参数
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
              placeholder={`定义交易执行 Agent 的行为规则。\n\n示例：\n你是交易执行 Agent，根据 AI 策略信号决定交易动作。\n\n规则:\n1. 先调用 get_ai_strategy 获取最新策略信号\n2. 调用 get_current_price 获取实时价格\n3. 调用 get_position 检查当前持仓\n4. 调用 calculate_risk_reward 校验盈亏比\n5. 信号为"做多"且盈亏比达标且无持仓 → 调用 open_long\n6. 信号为"做空"且盈亏比达标且无持仓 → 调用 open_short\n7. 有持仓且实时价触及止损位 → 调用 close_position\n8. 信号为"观望"或盈亏比不达标 → 调用 wait`}
              rows={18}
              className='font-mono text-xs'
            />
          </TabsContent>

          {/* ── Tools 配置 Tab ── */}
          <TabsContent value='tools' className='space-y-3 mt-3'>
            <div className='flex items-center justify-between'>
              <p className='text-[10px] text-muted-foreground'>
                启用/禁用 Agent 可调用的 Tools。禁用的 Tool 不会出现在 Agent 的可用工具列表中。
              </p>
              <div className='flex gap-1'>
                <Button
                  variant='ghost' size='sm' className='h-6 text-[10px] px-2'
                  onClick={() => { setEnabledTools(new Set(ALL_TOOL_NAMES)); markDirty() }}
                >
                  全选
                </Button>
                <Button
                  variant='ghost' size='sm' className='h-6 text-[10px] px-2'
                  onClick={() => { setEnabledTools(new Set()); markDirty() }}
                >
                  全不选
                </Button>
              </div>
            </div>

            {(['info', 'trade', 'control'] as const).map((cat) => {
              const catTools = AGENT_TOOLS.filter((t) => t.category === cat)
              const style = CATEGORY_STYLE[cat]
              const allOn = catTools.every((t) => enabledTools.has(t.name))
              const someOn = catTools.some((t) => enabledTools.has(t.name))
              return (
                <div key={cat} className='space-y-1'>
                  <div className='flex items-center gap-2 py-1'>
                    <Switch
                      checked={allOn}
                      onCheckedChange={() => toggleCategory(cat)}
                      className='scale-75'
                    />
                    <span className={`inline-block w-2 h-2 rounded-full ${style.dot}`} />
                    <span className='text-xs font-medium'>{style.label}</span>
                    <Badge variant='outline' className='text-[10px] px-1 py-0 h-4'>
                      {catTools.filter((t) => enabledTools.has(t.name)).length}/{catTools.length}
                    </Badge>
                    {!allOn && someOn && <span className='text-[10px] text-yellow-500'>部分启用</span>}
                  </div>
                  <div className='grid grid-cols-1 gap-0.5 pl-8'>
                    {catTools.map((tool) => {
                      const on = enabledTools.has(tool.name)
                      return (
                        <div
                          key={tool.name}
                          className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-muted/50 transition-colors ${!on ? 'opacity-40' : ''}`}
                          onClick={() => toggleTool(tool.name)}
                        >
                          <Switch checked={on} onCheckedChange={() => toggleTool(tool.name)} className='scale-[0.6]' />
                          <code className={`text-[10px] font-mono px-1 py-0.5 rounded ${style.bg}`}>
                            {tool.name}
                          </code>
                          <span className='text-[10px] text-muted-foreground flex-1'>{tool.desc}</span>
                          <span className='text-[10px] font-mono text-muted-foreground/60'>{tool.params}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {enabledTools.size === 0 && (
              <Alert>
                <Info className='h-3 w-3' />
                <AlertDescription className='text-[11px]'>
                  未启用任何 Tool，Agent 将无法执行任何操作。
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* ── Skills Tab ── */}
          <TabsContent value='skills' className='space-y-3 mt-3'>
            <p className='text-[10px] text-muted-foreground'>
              Skills 是多个 Tools 的编排组合。Agent 调用一个 Skill = 自动按顺序执行多个 Tools 并汇总结果，减少 LLM 调用轮次。
            </p>

            {agentSkills.skills.map((skill) => (
              <div key={skill.id} className={`border rounded-lg p-3 space-y-2 transition-opacity ${!skill.is_enabled ? 'opacity-40' : ''}`}>
                <div className='flex items-center gap-2'>
                  <Switch
                    checked={skill.is_enabled}
                    onCheckedChange={(v) => agentSkills.updateSkill(skill.id, { is_enabled: v })}
                    className='scale-75'
                  />
                  <Zap className='h-3.5 w-3.5 text-purple-500' />
                  <span className='text-xs font-medium flex-1'>{skill.display_name}</span>
                  {skill.is_builtin && <Badge variant='outline' className='text-[10px] px-1 py-0 h-4'>内置</Badge>}
                  <Badge variant='secondary' className='text-[10px] px-1 py-0 h-4'>
                    {skill.steps.length} 步骤
                  </Badge>
                  {!skill.is_builtin && (
                    <Button variant='ghost' size='sm' className='h-6 text-[10px] px-1.5 text-red-500 hover:text-red-600'
                      onClick={() => agentSkills.deleteSkill(skill.id)}>
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  )}
                </div>
                <p className='text-[10px] text-muted-foreground pl-8'>{skill.description}</p>

                {/* 参数 */}
                {skill.parameters.length > 0 && (
                  <div className='pl-8 flex flex-wrap gap-1'>
                    {skill.parameters.map((p) => (
                      <span key={p.name} className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted'>
                        {p.name}: {p.type}{p.required ? '' : '?'}
                      </span>
                    ))}
                  </div>
                )}

                {/* 步骤流程图 */}
                <div className='pl-8 space-y-0.5'>
                  {skill.steps.map((step, i) => (
                    <div key={i} className='flex items-center gap-1.5 text-[10px]'>
                      <span className='text-muted-foreground w-4 text-right'>{i + 1}.</span>
                      <code className='font-mono px-1 py-0.5 rounded bg-blue-500/10 text-blue-600'>{step.tool}</code>
                      <ChevronRight className='h-2.5 w-2.5 text-muted-foreground' />
                      <span className='text-muted-foreground'>{step.label}</span>
                      {step.condition && (
                        <span className='text-yellow-500 text-[9px]'>(条件执行)</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 编辑面板（自定义 skill 可编辑 steps） */}
                {!skill.is_builtin && (
                  <SkillStepEditor skill={skill} tools={AGENT_TOOLS} onSave={agentSkills.updateSkill} />
                )}
              </div>
            ))}

            {agentSkills.skills.length === 0 && !agentSkills.loading && (
              <div className='text-center py-6 text-muted-foreground text-xs'>
                加载中...
              </div>
            )}

            {/* 创建自定义 Skill */}
            <CreateSkillInline tools={AGENT_TOOLS} onCreate={agentSkills.createSkill} />
          </TabsContent>

          {/* ── 交易参数 Tab ── */}
          <TabsContent value='params' className='space-y-4 mt-3'>
            <p className='text-[10px] text-muted-foreground'>
              Agent 级别的交易参数配置。这些参数作为默认值应用于所有使用此 Agent 模板的机器人。
            </p>

            {/* 盈亏比配置 */}
            <div className='border rounded-lg p-4 space-y-3'>
              <div className='flex items-center gap-2'>
                <Shield className='h-4 w-4 text-blue-500' />
                <span className='text-sm font-medium'>盈亏比 (Risk/Reward Ratio)</span>
              </div>
              <p className='text-[10px] text-muted-foreground'>
                开仓前校验盈亏比是否满足最低要求。不满足时自动调整止盈价使其达标，无法调整则拒绝交易。
              </p>
              <div className='space-y-1'>
                <Label className='text-xs'>最低盈亏比</Label>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    value={minRrRatio}
                    onChange={(e) => { setMinRrRatio(e.target.value); markDirty() }}
                    min={0}
                    max={10}
                    step={0.1}
                    className='w-32 h-8 text-xs'
                    placeholder='1.5'
                  />
                  <span className='text-xs text-muted-foreground'>: 1</span>
                  <div className='flex gap-1 ml-2'>
                    {[1, 1.5, 2, 2.5, 3].map((v) => (
                      <Button
                        key={v}
                        variant={String(v) === minRrRatio ? 'default' : 'outline'}
                        size='sm'
                        className='h-6 text-[10px] px-2'
                        onClick={() => { setMinRrRatio(String(v)); markDirty() }}
                      >
                        {v}:1
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 盈亏比说明 */}
              <div className='bg-muted/50 rounded-md p-3 space-y-2'>
                <div className='text-[10px] font-medium'>盈亏比计算方式</div>
                <div className='grid grid-cols-2 gap-2 text-[10px] text-muted-foreground'>
                  <div>
                    <span className='font-medium text-green-600'>做多 (Long)</span>
                    <div>收益 = (止盈 - 入场) / 入场</div>
                    <div>风险 = (入场 - 止损) / 入场</div>
                  </div>
                  <div>
                    <span className='font-medium text-red-600'>做空 (Short)</span>
                    <div>收益 = (入场 - 止盈) / 入场</div>
                    <div>风险 = (止损 - 入场) / 入场</div>
                  </div>
                </div>
                <div className='text-[10px] text-muted-foreground'>
                  盈亏比 = 收益 / 风险。例如 2:1 表示潜在收益是潜在风险的 2 倍。
                </div>
              </div>

              {/* 行为说明 */}
              <Alert>
                <Info className='h-3 w-3' />
                <AlertDescription className='text-[11px] space-y-1'>
                  {parsedRr > 0 ? (
                    <>
                      <div>当前设置: 盈亏比 &gt;= <strong>{parsedRr}:1</strong> 才允许开仓</div>
                      <div className='text-muted-foreground'>
                        不满足时: 自动将止盈价拉远至刚好满足 {parsedRr}:1 → 若仍无法满足则拒绝开仓
                      </div>
                    </>
                  ) : (
                    <div>盈亏比检查已关闭，Agent 将完全信任 AI 信号的止盈止损</div>
                  )}
                </AlertDescription>
              </Alert>
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


// ── 自定义 Skill 步骤编辑器 ──

function SkillStepEditor({ skill, tools, onSave }: {
  skill: AgentSkill
  tools: typeof AGENT_TOOLS
  onSave: (id: number, data: { steps?: AgentSkill['steps'] }) => Promise<unknown>
}) {
  const [open, setOpen] = useState(false)
  const [steps, setSteps] = useState(skill.steps)
  const [saving, setSaving] = useState(false)

  const addStep = () => {
    setSteps([...steps, { label: '', tool: tools[0]?.name || '', args: {}, output_key: `step_${steps.length + 1}` }])
  }

  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i))

  const updateStep = (i: number, patch: Partial<AgentSkill['steps'][0]>) => {
    setSteps(steps.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(skill.id, { steps }) } catch { /* */ }
    finally { setSaving(false); setOpen(false) }
  }

  if (!open) {
    return (
      <Button variant='outline' size='sm' className='h-6 text-[10px] ml-8' onClick={() => setOpen(true)}>
        编辑步骤
      </Button>
    )
  }

  return (
    <div className='ml-8 border rounded-md p-2 space-y-2 bg-muted/30'>
      {steps.map((step, i) => (
        <div key={i} className='flex items-center gap-1.5'>
          <GripVertical className='h-3 w-3 text-muted-foreground/40' />
          <Input value={step.label} onChange={(e) => updateStep(i, { label: e.target.value })}
            className='h-6 text-[10px] flex-1' placeholder='步骤名称' />
          <Select value={step.tool} onValueChange={(v) => updateStep(i, { tool: v })}>
            <SelectTrigger className='h-6 text-[10px] w-[160px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tools.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  <span className='text-[10px] font-mono'>{t.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={step.output_key} onChange={(e) => updateStep(i, { output_key: e.target.value })}
            className='h-6 text-[10px] w-[80px] font-mono' placeholder='output_key' />
          <Button variant='ghost' size='sm' className='h-6 w-6 p-0 text-red-500' onClick={() => removeStep(i)}>
            <Trash2 className='h-3 w-3' />
          </Button>
        </div>
      ))}
      <div className='flex gap-1.5'>
        <Button variant='outline' size='sm' className='h-6 text-[10px] gap-1' onClick={addStep}>
          <Plus className='h-3 w-3' /> 添加步骤
        </Button>
        <Button size='sm' className='h-6 text-[10px]' onClick={handleSave} disabled={saving}>
          {saving ? '保存...' : '保存'}
        </Button>
        <Button variant='ghost' size='sm' className='h-6 text-[10px]' onClick={() => { setSteps(skill.steps); setOpen(false) }}>
          取消
        </Button>
      </div>
    </div>
  )
}


// ── 创建自定义 Skill ──

function CreateSkillInline({ tools, onCreate }: {
  tools: typeof AGENT_TOOLS
  onCreate: (data: { name: string; display_name: string; description?: string; steps?: AgentSkill['steps']; parameters?: AgentSkill['parameters'] }) => Promise<unknown>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [desc, setDesc] = useState('')
  const [steps, setSteps] = useState<AgentSkill['steps']>([
    { label: '', tool: tools[0]?.name || '', args: {}, output_key: 'step_1' },
  ])
  const [creating, setCreating] = useState(false)

  const addStep = () => {
    setSteps([...steps, { label: '', tool: tools[0]?.name || '', args: {}, output_key: `step_${steps.length + 1}` }])
  }
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i))
  const updateStep = (i: number, patch: Partial<AgentSkill['steps'][0]>) => {
    setSteps(steps.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }

  const handleCreate = async () => {
    if (!name.trim() || !displayName.trim()) return
    setCreating(true)
    try {
      await onCreate({
        name: `skill_${name.trim().toLowerCase().replace(/\s+/g, '_')}`,
        display_name: displayName.trim(),
        description: desc.trim(),
        parameters: [{ name: 'coin', type: 'string', required: true, description: '币种' }],
        steps: steps.filter((s) => s.tool),
      })
      setName(''); setDisplayName(''); setDesc('')
      setSteps([{ label: '', tool: tools[0]?.name || '', args: {}, output_key: 'step_1' }])
      setOpen(false)
    } catch { /* */ }
    finally { setCreating(false) }
  }

  if (!open) {
    return (
      <Button variant='outline' size='sm' className='w-full h-8 text-xs gap-1' onClick={() => setOpen(true)}>
        <Plus className='h-3.5 w-3.5' /> 创建自定义 Skill
      </Button>
    )
  }

  return (
    <div className='border rounded-lg p-3 space-y-2 border-dashed border-purple-500/30'>
      <div className='flex items-center gap-2'>
        <Zap className='h-3.5 w-3.5 text-purple-500' />
        <span className='text-xs font-medium'>新建 Skill</span>
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <Input value={name} onChange={(e) => setName(e.target.value)}
          className='h-7 text-[10px] font-mono' placeholder='标识符 (如 my_check)' />
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          className='h-7 text-[10px]' placeholder='显示名称' />
      </div>
      <Input value={desc} onChange={(e) => setDesc(e.target.value)}
        className='h-7 text-[10px]' placeholder='描述 (LLM 用来判断何时调用)' />

      <div className='space-y-1'>
        <div className='text-[10px] font-medium text-muted-foreground'>执行步骤</div>
        {steps.map((step, i) => (
          <div key={i} className='flex items-center gap-1.5'>
            <span className='text-[10px] text-muted-foreground w-4 text-right'>{i + 1}.</span>
            <Input value={step.label} onChange={(e) => updateStep(i, { label: e.target.value })}
              className='h-6 text-[10px] flex-1' placeholder='步骤名称' />
            <Select value={step.tool} onValueChange={(v) => updateStep(i, { tool: v })}>
              <SelectTrigger className='h-6 text-[10px] w-[150px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tools.map((t) => (
                  <SelectItem key={t.name} value={t.name}>
                    <span className='text-[10px] font-mono'>{t.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant='ghost' size='sm' className='h-6 w-6 p-0 text-red-500' onClick={() => removeStep(i)}>
              <Trash2 className='h-3 w-3' />
            </Button>
          </div>
        ))}
        <Button variant='outline' size='sm' className='h-6 text-[10px] gap-1' onClick={addStep}>
          <Plus className='h-3 w-3' /> 添加步骤
        </Button>
      </div>

      <div className='flex gap-1.5'>
        <Button size='sm' className='h-7 text-[10px]' onClick={handleCreate}
          disabled={creating || !name.trim() || !displayName.trim()}>
          {creating ? '创建中...' : '创建'}
        </Button>
        <Button variant='ghost' size='sm' className='h-7 text-[10px]' onClick={() => setOpen(false)}>取消</Button>
      </div>
    </div>
  )
}
