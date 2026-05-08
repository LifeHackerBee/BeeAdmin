import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { KolEntryInput } from '../types'

type Row = {
  kol_name: string
  coin: string
  direction: 'long' | 'short' | ''
  outcome: 'win' | 'loss' | 'breakeven'
  pnl_pct: string
  entry_price: string
  exit_price: string
  note: string
}

const emptyRow = (): Row => ({
  kol_name: '',
  coin: '',
  direction: '',
  outcome: 'win',
  pnl_pct: '',
  entry_price: '',
  exit_price: '',
  note: '',
})

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function EntryDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (entries: KolEntryInput[]) => Promise<unknown>
}) {
  const [date, setDate] = useState<string>(todayStr())
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [submitting, setSubmitting] = useState(false)

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const handleSubmit = async () => {
    const entries: KolEntryInput[] = []
    for (const r of rows) {
      if (!r.kol_name.trim()) {
        toast.error('每行的 KOL 名称必填')
        return
      }
      entries.push({
        date,
        kol_name: r.kol_name.trim(),
        coin: r.coin.trim() || null,
        direction: r.direction || null,
        outcome: r.outcome,
        pnl_pct: r.pnl_pct === '' ? null : Number(r.pnl_pct),
        entry_price: r.entry_price === '' ? null : Number(r.entry_price),
        exit_price: r.exit_price === '' ? null : Number(r.exit_price),
        note: r.note.trim() || null,
      })
    }

    setSubmitting(true)
    try {
      await onSubmit(entries)
      toast.success(`已录入 ${entries.length} 条战绩`)
      setRows([emptyRow()])
      onOpenChange(false)
    } catch (err) {
      toast.error(`录入失败: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-5xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>录入 KOL 日战绩</DialogTitle>
          <DialogDescription>同一天可批量录入多位 KOL 的战绩，提交后写入 Supabase。</DialogDescription>
        </DialogHeader>

        <div className='flex items-center gap-2'>
          <Label className='shrink-0'>日期</Label>
          <Input
            type='date'
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className='w-44'
          />
        </div>

        <div className='space-y-2'>
          {rows.map((r, idx) => (
            <div
              key={idx}
              className='grid grid-cols-12 gap-2 items-start border rounded-md p-2'
            >
              <div className='col-span-2'>
                <Label className='text-xs text-muted-foreground'>KOL *</Label>
                <Input
                  value={r.kol_name}
                  onChange={(e) => updateRow(idx, { kol_name: e.target.value })}
                  placeholder='johnny (wwg)'
                />
              </div>
              <div className='col-span-1'>
                <Label className='text-xs text-muted-foreground'>品种</Label>
                <Input
                  value={r.coin}
                  onChange={(e) => updateRow(idx, { coin: e.target.value })}
                  placeholder='BTC'
                />
              </div>
              <div className='col-span-1'>
                <Label className='text-xs text-muted-foreground'>方向</Label>
                <Select
                  value={r.direction || 'none'}
                  onValueChange={(v) => updateRow(idx, { direction: v === 'none' ? '' : (v as 'long' | 'short') })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>—</SelectItem>
                    <SelectItem value='long'>多</SelectItem>
                    <SelectItem value='short'>空</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='col-span-1'>
                <Label className='text-xs text-muted-foreground'>结果 *</Label>
                <Select
                  value={r.outcome}
                  onValueChange={(v) => updateRow(idx, { outcome: v as Row['outcome'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='win'>胜</SelectItem>
                    <SelectItem value='loss'>负</SelectItem>
                    <SelectItem value='breakeven'>平</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='col-span-1'>
                <Label className='text-xs text-muted-foreground'>收益率 %</Label>
                <Input
                  type='number'
                  step='0.01'
                  value={r.pnl_pct}
                  onChange={(e) => updateRow(idx, { pnl_pct: e.target.value })}
                />
              </div>
              <div className='col-span-1'>
                <Label className='text-xs text-muted-foreground'>开仓价</Label>
                <Input
                  type='number'
                  step='any'
                  value={r.entry_price}
                  onChange={(e) => updateRow(idx, { entry_price: e.target.value })}
                />
              </div>
              <div className='col-span-1'>
                <Label className='text-xs text-muted-foreground'>平仓价</Label>
                <Input
                  type='number'
                  step='any'
                  value={r.exit_price}
                  onChange={(e) => updateRow(idx, { exit_price: e.target.value })}
                />
              </div>
              <div className='col-span-3'>
                <Label className='text-xs text-muted-foreground'>备注</Label>
                <Textarea
                  rows={1}
                  value={r.note}
                  onChange={(e) => updateRow(idx, { note: e.target.value })}
                />
              </div>
              <div className='col-span-1 flex items-end justify-end h-full'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={rows.length === 1}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
          >
            <Plus className='h-4 w-4 mr-1' />
            添加一行
          </Button>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : `提交 ${rows.length} 条`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
