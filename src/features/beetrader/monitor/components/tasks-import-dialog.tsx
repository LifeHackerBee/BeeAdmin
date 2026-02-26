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

function extractWalletFromRow(row: Record<string, string>): { address: string; note: string } | null {
  const addr =
    row['ethaddress'] ??
    row['eth_address'] ??
    row['address'] ??
    row['wallet'] ??
    ''
  const addrTrimmed = (addr || '').trim()
  if (!addrTrimmed || !ETH_ADDRESS_REGEX.test(addrTrimmed)) return null

  const note =
    (row['displayname'] ?? row['display_name'] ?? row['note'] ?? row['remark'] ?? '').trim() ||
    ''

  return { address: addrTrimmed, note }
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
        toast.error('未找到有效钱包地址，请确保 CSV 包含 ethAddress 列')
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
          <DialogDescription>
            支持 CSV 格式，需包含 ethAddress 列；displayName 可作为备注导入。也支持 analyzer result 导出的完整 CSV。
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
