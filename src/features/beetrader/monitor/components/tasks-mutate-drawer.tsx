import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { type Wallet, walletTypes as walletTypeEnum } from '../data/schema'
import { walletTypes } from '../data/data'
import { useWallets } from '../hooks/use-wallets'
import { useWallets as useWalletsContext } from './tasks-provider'

type WalletMutateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Wallet
}

const formSchema = z.object({
  address: z.string().min(1, '钱包地址不能为空').regex(/^0x[a-fA-F0-9]{40}$/, '请输入有效的以太坊地址'),
  note: z.string(),
  type: z.enum(walletTypeEnum).optional().nullable(),
  volume: z.string(),
})
type WalletForm = z.infer<typeof formSchema>

export function WalletsMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: WalletMutateDrawerProps) {
  const isUpdate = !!currentRow
  const { createWallet, updateWallet, refetch } = useWallets()
  const { triggerRefresh } = useWalletsContext()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<WalletForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: '',
      note: '',
      type: null,
      volume: '',
    },
  })

  // 当 currentRow 变化时更新表单值
  useEffect(() => {
    if (currentRow) {
      form.reset({
        address: currentRow.address,
        note: currentRow.note || '',
        type: currentRow.type || null,
        volume: currentRow.volume != null ? currentRow.volume.toString() : '',
      })
    } else {
      form.reset({
        address: '',
        note: '',
        type: null,
        volume: '',
      })
    }
  }, [currentRow, form])

  const onSubmit = async (data: WalletForm) => {
    try {
      setIsSubmitting(true)
      
      const noteValue = data.note.trim() || ''
      const typeValue = data.type || null
      // 转换 volume 字符串为数字或 null
      const volumeValue = data.volume.trim() === '' 
        ? null 
        : (() => {
            const num = parseFloat(data.volume)
            return isNaN(num) ? null : num
          })()
      
      if (isUpdate && currentRow) {
        await updateWallet(currentRow.id, { note: noteValue, type: typeValue, volume: volumeValue })
        toast.success('钱包更新成功')
      } else {
        await createWallet({ address: data.address, note: noteValue, type: typeValue, volume: volumeValue })
        toast.success('钱包添加成功')
      }
      
      // 刷新数据
      await refetch()
      // 触发 Context 中的刷新，确保 Monitor 组件也更新
      triggerRefresh()
      onOpenChange(false)
      form.reset()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作失败'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        form.reset()
      }}
    >
      <SheetContent className='flex flex-col'>
        <SheetHeader className='text-start'>
          <SheetTitle>{isUpdate ? '编辑' : '添加'}巨鲸钱包</SheetTitle>
          <SheetDescription>
            {isUpdate
              ? '编辑巨鲸钱包信息，更新备注或体量。'
              : '添加一个新的巨鲸钱包地址，请填写钱包地址、备注和体量信息。'}
            完成后点击保存。
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            id='wallets-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex-1 space-y-6 overflow-y-auto px-4'
          >
            <FormField
              control={form.control}
              name='address'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>钱包地址</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='0x...'
                      disabled={isUpdate}
                      className='font-mono'
                    />
                  </FormControl>
                  <FormDescription>
                    {isUpdate
                      ? '钱包地址创建后不可修改'
                      : '请输入有效的以太坊地址（0x开头，42个字符）'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>类型</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value as Wallet['type'])}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='选择钱包类型（可选）' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {walletTypes.map((type) => {
                        const Icon = type.icon
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <span className='flex items-center gap-2'>
                              <Icon className='h-4 w-4' />
                              {type.label}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    选择钱包的分类类型，便于管理和筛选。如果不选择，将显示为未分类。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='note'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder='请输入备注信息...'
                      className='min-h-[100px] resize-none'
                    />
                  </FormControl>
                  <FormDescription>
                    说明此巨鲸钱包的相关信息（例如：机构投资者、知名交易员等）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='volume'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>体量 (USD)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type='number'
                      step='0.01'
                      placeholder='请输入资产规模，单位：USD'
                      className='font-mono'
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    钱包的资产规模，单位：美元（USD）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <SheetFooter className='gap-2'>
          <SheetClose asChild>
            <Button variant='outline' disabled={isSubmitting}>取消</Button>
          </SheetClose>
          <Button form='wallets-form' type='submit' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
