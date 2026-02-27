import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Download } from 'lucide-react'
import { useWalletsData } from '../context/wallets-data-provider'
import { useWallets as useWalletsContext } from './tasks-provider'

const formSchema = z.object({
  file: z
    .instanceof(FileList)
    .refine((files) => files?.length > 0, {
      message: '请选择文件',
    })
    .refine(
      (files) => {
        const f = files?.[0]
        if (!f) return false
        const name = (f.name || '').toLowerCase()
        const type = (f.type || '').toLowerCase()
        return name.endsWith('.csv') || type === 'text/csv' || type === 'text/plain' || type === 'application/vnd.ms-excel'
      },
      '请上传 CSV 格式文件'
    ),
})

type WalletsImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 解析 CSV 行，处理引号内的逗号 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      result.push(current.replace(/^"|"$/g, '').replace(/""/g, '"').trim())
      current = ''
    } else {
      current += c
    }
  }
  result.push(current.replace(/^"|"$/g, '').replace(/""/g, '"').trim())
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ''
    })
    rows.push(row)
  }
  return rows
}

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/

const CSV_TEMPLATE_HEADER =
  'remark,composite_score,ethAddress,displayName,accountValue,current_equity,equity_3d_ago,equity_3d_change_pct,pnl_3d,total_perp_pnl,trade_count_3d,trade_volume_3d,position_count,positions,sample_trades,win_rate,win_count,loss_count,win_sample_size'

function downloadCsvTemplate() {
  const content = CSV_TEMPLATE_HEADER + '\n' + '示例备注,0.5,0x0000000000000000000000000000000000000001,,100000,100000,95000,5.26,5000,10000,100,500000,0,-,-,60,60,40,100'
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `wallet_import_template_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** 支持的地址列名（解析时表头统一转小写） */
const ADDRESS_KEYS = ['ethaddress', 'eth_address', 'address', 'wallet'] as const
/** 支持的备注列名，优先级：remark > displayname */
const NOTE_KEYS = ['remark', 'displayname', 'display_name', 'note'] as const

function extractWalletFromRow(row: Record<string, string>): { address: string; note: string } | null {
  let addr = ''
  for (const k of ADDRESS_KEYS) {
    const v = (row[k] ?? '').trim()
    if (v && ETH_ADDRESS_REGEX.test(v)) {
      addr = v
      break
    }
  }
  if (!addr) return null

  let note = ''
  for (const k of NOTE_KEYS) {
    const v = (row[k] ?? '').trim()
    if (v) {
      note = v
      break
    }
  }
  return { address: addr, note }
}

export function TasksImportDialog({ open, onOpenChange }: WalletsImportDialogProps) {
  const { createWallet, refetch } = useWalletsData()
  const { triggerRefresh } = useWalletsContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { file: undefined },
  })

  const fileRef = form.register('file')

  const onSubmit = async () => {
    const file = form.getValues('file')
    if (!file?.[0]) return

    setIsSubmitting(true)
    let created = 0
    let skipped = 0
    let invalid = 0

    try {
      const text = await file[0].text()
      const rows = parseCSV(text)

      for (const row of rows) {
        const wallet = extractWalletFromRow(row)
        if (!wallet) {
          invalid++
          continue
        }
        try {
          await createWallet({ address: wallet.address, note: wallet.note || undefined })
          created++
        } catch (err) {
          if (
            err instanceof Error &&
            (err.message.includes('已存在') || err.message.includes('duplicate'))
          ) {
            skipped++
          } else {
            throw err
          }
        }
      }

      if (created > 0) {
        await refetch({ backgroundRefresh: true })
        triggerRefresh()
      }

      const parts: string[] = []
      if (created > 0) parts.push(`${created} 个导入成功`)
      if (skipped > 0) parts.push(`${skipped} 个已存在跳过`)
      if (invalid > 0) parts.push(`${invalid} 个格式错误`)

      if (parts.length > 0) {
        toast.success(parts.join('，'))
      } else if (invalid > 0) {
        toast.error('未找到有效钱包地址，请确保 CSV 包含 ethAddress 列（或 address/wallet）')
      } else {
        toast.info('没有可导入的数据')
      }
      onOpenChange(false)
      form.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导入失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) form.reset()
        onOpenChange(val)
      }}
    >
      <DialogContent className='gap-2 sm:max-w-sm'>
        <DialogHeader className='text-start'>
          <DialogTitle>导入钱包</DialogTitle>
          <DialogDescription className="space-y-1.5">
            <span className="block">支持 analyzer rank 导出的完整 CSV，格式示例：</span>
            <code className="block rounded bg-muted px-1.5 py-0.5 text-xs break-all">
              remark,composite_score,ethAddress,displayName,accountValue,current_equity,equity_3d_ago,equity_3d_change_pct,pnl_3d,total_perp_pnl,trade_count_3d,trade_volume_3d,position_count,positions,sample_trades,win_rate,win_count,loss_count,win_sample_size
            </code>
            <span className="block text-muted-foreground">必填：ethAddress；可选：remark 或 displayName 作为备注。</span>
            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={downloadCsvTemplate}>
              <Download className="mr-1 h-3 w-3" />
              下载导入模板
            </Button>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id='wallet-import-form' onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name='file'
              render={() => (
                <FormItem className='my-2'>
                  <FormLabel>文件</FormLabel>
                  <FormControl>
                    <Input type='file' accept='.csv,text/csv,text/plain' {...fileRef} className='h-8 py-0' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className='gap-2'>
          <DialogClose asChild>
            <Button variant='outline' disabled={isSubmitting}>取消</Button>
          </DialogClose>
          <Button type='submit' form='wallet-import-form' disabled={isSubmitting}>
            {isSubmitting ? '导入中…' : '导入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
