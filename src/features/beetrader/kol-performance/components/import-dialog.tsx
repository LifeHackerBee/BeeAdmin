import { useMemo, useRef, useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { parseKolLog, displayName } from '../utils'
import type { KolMvpInsert, ParseSummary } from '../types'

export function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onImport: (entries: KolMvpInsert[], batchId: string) => Promise<{ inserted: number }>
}) {
  const [text, setText] = useState('')
  const [filename, setFilename] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parsed: ParseSummary | null = useMemo(() => {
    if (!text.trim()) return null
    try {
      return parseKolLog(text)
    } catch {
      return null
    }
  }, [text])

  const handleFile = async (file: File) => {
    const txt = await file.text()
    setText(txt)
    setFilename(file.name)
  }

  const reset = () => {
    setText('')
    setFilename(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!parsed || !parsed.records.length) {
      toast.error('解析结果为空，无法导入')
      return
    }
    setSubmitting(true)
    try {
      const batchId = `batch-${Date.now()}`
      const entries: KolMvpInsert[] = parsed.records
        .filter((r) => r.date)
        .map((r) => ({
          date: r.date as string,
          kol_name: r.kol_name,
          org: r.org,
          direction: r.direction,
          assets: r.assets,
          raw_line: r.raw_line,
          source_batch: batchId,
        }))
      const skippedNoDate = parsed.records.length - entries.length
      const result = await onImport(entries, batchId)
      const dup = entries.length - result.inserted
      const summary = [
        `成功导入 ${result.inserted} 条`,
        dup > 0 ? `跳过重复 ${dup} 条` : null,
        skippedNoDate > 0 ? `跳过无日期 ${skippedNoDate} 条` : null,
      ]
        .filter(Boolean)
        .join('，')
      toast.success(summary)
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(`导入失败: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  const topKols = useMemo(() => {
    if (!parsed) return []
    return Array.from(parsed.recordsByKol.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
  }, [parsed])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v) }}>
      <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col overflow-hidden'>
        <DialogHeader>
          <DialogTitle>导入 KOL MVP 日志</DialogTitle>
          <DialogDescription>
            粘贴或上传聚合群 MVP 日志文本，解析后写入数据库。重复的行（同一天同一 KOL 同一原始内容）会自动跳过。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue='paste' className='w-full'>
          <TabsList>
            <TabsTrigger value='paste'>
              <FileText className='mr-1 h-4 w-4' /> 粘贴文本
            </TabsTrigger>
            <TabsTrigger value='upload'>
              <Upload className='mr-1 h-4 w-4' /> 上传 .txt
            </TabsTrigger>
          </TabsList>

          <TabsContent value='paste' className='mt-3'>
            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setFilename(null)
              }}
              placeholder='把日志贴在这里。识别格式：日期标题行包含「聚合群」和「MVP」字样和 6 位日期 (YYMMDD)，每条记录用 #tag 标识 KOL...'
              className='min-h-48 max-h-72 font-mono text-xs'
            />
          </TabsContent>

          <TabsContent value='upload' className='mt-3'>
            <div className='border-2 border-dashed rounded-md p-6 text-center space-y-2'>
              <input
                ref={fileInputRef}
                type='file'
                accept='.txt,text/plain'
                className='hidden'
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              <Button variant='outline' onClick={() => fileInputRef.current?.click()}>
                <Upload className='mr-1 h-4 w-4' /> 选择 .txt 文件
              </Button>
              {filename ? (
                <div className='text-xs text-muted-foreground'>
                  已加载: <span className='font-medium'>{filename}</span> ({text.length.toLocaleString()} 字符)
                </div>
              ) : (
                <div className='text-xs text-muted-foreground'>支持纯文本 .txt 文件</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <ScrollArea className='flex-1 min-h-0 pr-3'>
          {parsed && parsed.records.length > 0 ? (
            <div className='space-y-3'>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm'>
                <Stat label='识别记录' value={parsed.records.length} />
                <Stat label='覆盖天数' value={parsed.dates.length} />
                <Stat label='独立 KOL' value={parsed.uniqueKols} />
                <Stat
                  label='日期范围'
                  value={
                    parsed.dates.length
                      ? `${parsed.dates[0]} ~ ${parsed.dates[parsed.dates.length - 1]}`
                      : '—'
                  }
                />
              </div>

              {topKols.length > 0 && (
                <div>
                  <div className='text-xs text-muted-foreground mb-1'>记录最多的 KOL</div>
                  <div className='flex flex-wrap gap-1.5'>
                    {topKols.map(([name, cnt]) => (
                      <Badge key={name} variant='secondary'>
                        {name} <span className='ml-1 opacity-70'>×{cnt}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className='text-xs text-muted-foreground mb-1'>预览前 8 条解析结果</div>
                <div className='border rounded-md text-xs overflow-hidden'>
                  <div className='grid grid-cols-12 gap-2 px-2 py-1 bg-muted/40 font-medium'>
                    <div className='col-span-2'>日期</div>
                    <div className='col-span-2'>KOL</div>
                    <div className='col-span-1'>方向</div>
                    <div className='col-span-2'>品种</div>
                    <div className='col-span-5'>原文</div>
                  </div>
                  {parsed.records.slice(0, 8).map((r, i) => (
                    <div
                      key={i}
                      className='grid grid-cols-12 gap-2 px-2 py-1 border-t font-mono'
                    >
                      <div className='col-span-2'>{r.date ?? '—'}</div>
                      <div className='col-span-2'>{displayName(r.kol_name, r.org)}</div>
                      <div className='col-span-1'>
                        {r.direction === 'long' ? '多' : r.direction === 'short' ? '空' : '—'}
                      </div>
                      <div className='col-span-2'>{r.assets.join('/')}</div>
                      <div className='col-span-5 truncate text-muted-foreground'>{r.raw_line}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : text.trim() ? (
            <Alert>
              <AlertDescription>
                没有识别到任何 MVP 记录。请确认日志格式是否正确：标题行需含「聚合群」与「MVP」+ YYMMDD 日期。
              </AlertDescription>
            </Alert>
          ) : (
            <div className='text-sm text-muted-foreground py-8 text-center'>
              粘贴或上传日志后将在这里显示解析预览
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant='ghost' onClick={reset} disabled={submitting || !text}>
            清空
          </Button>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !parsed?.records.length}>
            {submitting ? '导入中...' : `导入 ${parsed?.records.length ?? 0} 条`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='border rounded-md p-2'>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className='text-base font-semibold mt-0.5'>{value}</div>
    </div>
  )
}
