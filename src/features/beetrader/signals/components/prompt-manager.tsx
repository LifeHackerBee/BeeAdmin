import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Settings2, Star, Trash2, Pencil, MoreVertical } from 'lucide-react'
import type { StrategyPrompt } from '../hooks/use-strategy-prompts'
import { DEFAULT_AI_SYSTEM_PROMPT } from '../../strategies/hooks/use-ai-strategy'

interface Props {
  prompts: StrategyPrompt[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  onCreate: (data: { name: string; description?: string; system_prompt: string; is_default?: boolean }) => Promise<unknown>
  onUpdate: (id: number, data: { name?: string; description?: string; system_prompt?: string }) => Promise<unknown>
  onDelete: (id: number) => Promise<void>
  onSetDefault: (id: number) => Promise<void>
}

export function PromptManager({
  prompts,
  selectedId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  onSetDefault,
}: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<StrategyPrompt | null>(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrompt, setFormPrompt] = useState('')

  const openCreate = () => {
    setEditingPrompt(null)
    setFormName('')
    setFormDesc('')
    setFormPrompt(DEFAULT_AI_SYSTEM_PROMPT)
    setEditOpen(true)
  }

  const openEdit = (p: StrategyPrompt) => {
    setEditingPrompt(p)
    setFormName(p.name)
    setFormDesc(p.description)
    setFormPrompt(p.system_prompt)
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formPrompt.trim()) return
    if (editingPrompt) {
      await onUpdate(editingPrompt.id, {
        name: formName,
        description: formDesc,
        system_prompt: formPrompt,
      })
    } else {
      await onCreate({
        name: formName,
        description: formDesc,
        system_prompt: formPrompt,
        is_default: prompts.length === 0,
      })
    }
    setEditOpen(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个策略模板吗?')) return
    await onDelete(id)
  }

  return (
    <div className='flex items-center gap-2'>
      {/* 选择器 */}
      <Select
        value={selectedId?.toString() ?? '_default'}
        onValueChange={(v) => onSelect(v === '_default' ? null : Number(v))}
      >
        <SelectTrigger className='w-[180px] h-8 text-xs'>
          <SelectValue placeholder='内置默认策略' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='_default'>
            <span className='text-xs'>内置默认策略</span>
          </SelectItem>
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

      {/* 当前选中的 prompt 操作 */}
      {selectedId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
              <MoreVertical className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => {
              const p = prompts.find((x) => x.id === selectedId)
              if (p) openEdit(p)
            }}>
              <Pencil className='h-3.5 w-3.5 mr-2' />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetDefault(selectedId)}>
              <Star className='h-3.5 w-3.5 mr-2' />
              设为默认
            </DropdownMenuItem>
            <DropdownMenuItem
              className='text-red-600'
              onClick={() => handleDelete(selectedId)}
            >
              <Trash2 className='h-3.5 w-3.5 mr-2' />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 新建按钮 */}
      <Button variant='outline' size='sm' className='h-8 gap-1 text-xs' onClick={openCreate}>
        <Plus className='h-3.5 w-3.5' />
        新建
      </Button>

      {/* 管理弹窗 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='max-w-2xl max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Settings2 className='h-5 w-5' />
              {editingPrompt ? '编辑策略模板' : '新建策略模板'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <label className='text-xs text-muted-foreground'>模板名称</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder='如: 保守型短线 / 激进突破'
                  className='text-sm'
                />
              </div>
              <div className='space-y-1'>
                <label className='text-xs text-muted-foreground'>简要描述</label>
                <Input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder='可选描述'
                  className='text-sm'
                />
              </div>
            </div>
            <div className='space-y-1'>
              <label className='text-xs text-muted-foreground'>System Prompt</label>
              <Textarea
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder='AI 的角色设定和分析原则...'
                className='font-mono text-xs min-h-[300px]'
              />
              <p className='text-[10px] text-muted-foreground'>
                这是 AI 的角色设定，定义分析风格和原则。技术指标数据会自动注入到 User Prompt 中。
              </p>
            </div>
            <div className='flex justify-between'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setFormPrompt(DEFAULT_AI_SYSTEM_PROMPT)}
                className='text-xs'
              >
                重置为内置默认
              </Button>
              <div className='flex gap-2'>
                <Button variant='outline' size='sm' onClick={() => setEditOpen(false)}>
                  取消
                </Button>
                <Button
                  size='sm'
                  onClick={handleSave}
                  disabled={!formName.trim() || !formPrompt.trim()}
                >
                  保存
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
