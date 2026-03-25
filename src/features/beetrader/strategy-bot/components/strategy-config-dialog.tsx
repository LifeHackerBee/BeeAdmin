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
import { Brain, Plus, Star, Trash2 } from 'lucide-react'
import type { StrategyPrompt } from '../../signals/hooks/use-strategy-prompts'
import type { DefaultPrompts } from '../hooks/use-strategy-bot-jobs'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  prompts: StrategyPrompt[]
  onCreatePrompt: (data: { name: string; description?: string; system_prompt: string }) => Promise<StrategyPrompt | null>
  onUpdatePrompt: (id: number, data: { name?: string; description?: string; system_prompt?: string }) => Promise<StrategyPrompt | null>
  onDeletePrompt: (id: number) => Promise<void>
  onSetDefault: (id: number) => Promise<void>
  fetchDefaultPrompts: () => Promise<DefaultPrompts>
}

export function StrategyConfigDialog({
  open, onOpenChange, prompts, onCreatePrompt, onUpdatePrompt, onDeletePrompt, onSetDefault, fetchDefaultPrompts,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadingDefaults, setLoadingDefaults] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    setLoaded(true)
    const def = prompts.find((p) => p.is_default)
    if (def) loadPrompt(def)
  }, [open, loaded, prompts]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) setLoaded(false)
  }, [open])

  const loadPrompt = (p: StrategyPrompt) => {
    setSelectedId(p.id)
    setEditName(p.name)
    setEditDesc(p.description)
    setSystemPrompt(p.system_prompt)
  }

  const handleSelectPrompt = (id: string) => {
    const p = prompts.find((x) => x.id === Number(id))
    if (p) loadPrompt(p)
  }

  const handleLoadBuiltinDefaults = async () => {
    setLoadingDefaults(true)
    try {
      const defaults = await fetchDefaultPrompts()
      setSystemPrompt(defaults.system_prompt)
    } catch { /* ignore */ } finally {
      setLoadingDefaults(false)
    }
  }

  const handleSave = async () => {
    if (!systemPrompt.trim()) return
    setSaving(true)
    try {
      if (selectedId) {
        await onUpdatePrompt(selectedId, {
          name: editName.trim() || undefined,
          description: editDesc.trim(),
          system_prompt: systemPrompt.trim(),
        })
      }
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const created = await onCreatePrompt({
        name: editName.trim() || '新策略',
        description: editDesc.trim(),
        system_prompt: systemPrompt.trim() || '(待填写)',
      })
      if (created) setSelectedId(created.id)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    await onDeletePrompt(selectedId)
    setSelectedId(null)
    setSystemPrompt('')
    setEditName('')
    setEditDesc('')
    const remaining = prompts.filter((p) => p.id !== selectedId)
    if (remaining.length > 0) loadPrompt(remaining[0])
  }

  const current = prompts.find((p) => p.id === selectedId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Brain className='h-4 w-4' />
            AI 交易策略配置
          </DialogTitle>
        </DialogHeader>

        <p className='text-xs text-muted-foreground'>
          配置 AI 策略分析师的角色、分析方法论和输出格式。AI 根据多周期技术指标数据生成交易信号（long/short/wait/close/add/reduce）。
        </p>

        {/* 模板选择器 */}
        <div className='flex items-center gap-2 flex-wrap'>
          <Select value={selectedId?.toString() ?? ''} onValueChange={handleSelectPrompt}>
            <SelectTrigger className='h-8 text-xs flex-1 min-w-[200px]'>
              <SelectValue placeholder='选择策略模板...' />
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

          <Button variant='outline' size='sm' className='h-8 text-xs gap-1' onClick={handleCreate} disabled={saving}>
            <Plus className='h-3.5 w-3.5' /> 新建
          </Button>

          {current && (
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
        </div>

        {/* 名称描述 */}
        {selectedId && (
          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <Label className='text-xs'>名称</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className='h-8 text-xs' placeholder='策略名称' />
            </div>
            <div className='space-y-1'>
              <Label className='text-xs'>描述</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className='h-8 text-xs' placeholder='可选描述' />
            </div>
          </div>
        )}

        {/* System Prompt 编辑 */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-xs font-medium'>System Prompt</Label>
            <Button variant='ghost' size='sm' className='h-6 text-[10px] shrink-0' onClick={handleLoadBuiltinDefaults} disabled={loadingDefaults}>
              {loadingDefaults ? '加载中...' : '加载内置默认'}
            </Button>
          </div>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder='定义 AI 策略分析师角色、分析原则和输出 JSON 格式...'
            rows={20}
            className='font-mono text-xs'
          />
          <div className='flex items-center gap-3 text-[10px] text-muted-foreground'>
            <span>输出格式: JSON</span>
            <span>·</span>
            <span>可用信号: long / short / wait / close / add / reduce</span>
            <span>·</span>
            <Badge variant='outline' className='text-[10px] px-1.5 py-0 h-4'>
              {systemPrompt.length} 字符
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving || !selectedId || !systemPrompt.trim()}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
