import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SelectDropdown } from '@/components/select-dropdown'
import { categories, currencies } from '../data/data'
import { type Expense } from '../data/schema'
import { useCreateExpense, useUpdateExpense } from '../hooks/use-expense-mutations'

type ExpensesMutateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Expense
}

const formSchema = z.object({
  spending_time: z.string().min(1, '日期时间是必填项。'),
  amount: z.number().min(0.01, '金额必须大于 0。'),
  category: z.string().min(1, '请选择分类。'),
  currency: z.string().min(1, '请选择币种。'),
  note: z.string().optional(),
  device_name: z.string().optional(),
})
type ExpenseForm = z.infer<typeof formSchema>

export function ExpensesMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: ExpensesMutateDrawerProps) {
  const isUpdate = !!currentRow

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(formSchema),
    defaultValues: (() => {
      if (currentRow) {
        let spendingTime = new Date().toISOString().slice(0, 16)
        if (currentRow.spending_time) {
          try {
            spendingTime = new Date(currentRow.spending_time).toISOString().slice(0, 16)
          } catch {
            // 如果日期解析失败，使用当前时间
          }
        }
        return {
          spending_time: spendingTime,
          amount: currentRow.amount ?? 0,
          category: currentRow.category ?? '',
          currency: currentRow.currency ?? 'CNY',
          note: currentRow.note ?? '',
          device_name: currentRow.device_name ?? '',
        }
      }
      return {
        spending_time: new Date().toISOString().slice(0, 16),
        amount: 0,
        category: '',
        currency: 'CNY',
        note: '',
        device_name: '',
      }
    })(),
  })

  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()

  const onSubmit = async (data: ExpenseForm) => {
    try {
      const expenseData = {
        spending_time: new Date(data.spending_time).toISOString(),
        amount: data.amount,
        category: data.category,
        currency: data.currency,
        note: data.note || null,
        device_name: data.device_name || null,
      }

      if (isUpdate && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id,
          data: expenseData,
        })
      } else {
        await createMutation.mutateAsync(expenseData)
      }

      onOpenChange(false)
      form.reset()
    } catch (error) {
      // 错误已经在 mutation 中处理了
      console.error('Failed to save expense:', error)
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
          <SheetTitle>{isUpdate ? '编辑' : '新增'}记账</SheetTitle>
          <SheetDescription>
            {isUpdate
              ? '更新记账记录信息。'
              : '添加新的记账记录。'}
            完成后点击保存。
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            id='expenses-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex-1 space-y-6 overflow-y-auto px-4'
          >
            <FormField
              control={form.control}
              name='spending_time'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>日期时间</FormLabel>
                  <FormControl>
                    <Input {...field} type='datetime-local' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='amount'
              render={({ field }) => {
                // 格式化显示值：去除前导零，但保留小数点前的单个0
                const formatDisplayValue = (val: number | string | null | undefined): string => {
                  if (val === null || val === undefined || val === '') return ''
                  const str = String(val)
                  // 如果是以0开头且不是0.xxx格式，去除前导零
                  if (str.length > 1 && str[0] === '0' && str[1] !== '.') {
                    return str.replace(/^0+/, '') || '0'
                  }
                  return str
                }

                return (
                  <FormItem>
                    <FormLabel>金额</FormLabel>
                    <FormControl>
                      <Input
                        type='text'
                        inputMode='decimal'
                        placeholder='请输入金额'
                        value={formatDisplayValue(field.value)}
                        onChange={(e) => {
                          let value = e.target.value
                          
                          // 只允许数字和小数点
                          value = value.replace(/[^\d.]/g, '')
                          
                          // 去除前导零（但保留小数点前的单个0，如 0.5）
                          if (value.length > 1 && value[0] === '0' && value[1] !== '.') {
                            // 去除前导零
                            value = value.replace(/^0+/, '') || '0'
                          }
                          
                          // 限制只能有一个小数点
                          const parts = value.split('.')
                          if (parts.length > 2) {
                            value = parts[0] + '.' + parts.slice(1).join('')
                          }
                          
                          // 限制小数点后最多2位
                          if (parts.length === 2 && parts[1].length > 2) {
                            value = parts[0] + '.' + parts[1].substring(0, 2)
                          }
                          
                          // 更新输入框显示值
                          e.target.value = value
                          
                          // 解析为数字并更新表单值
                          if (value === '' || value === '.') {
                            field.onChange(0)
                          } else {
                            const numValue = parseFloat(value)
                            if (!isNaN(numValue)) {
                              field.onChange(numValue)
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // 失焦时，如果值为空或只有小数点，设为0
                          const value = e.target.value
                          if (value === '' || value === '.') {
                            field.onChange(0)
                            e.target.value = ''
                          }
                          field.onBlur()
                        }}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name='category'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>分类</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='选择分类'
                    items={categories.map((cat) => ({
                      label: cat.label,
                      value: cat.value,
                    }))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='currency'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>币种</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='选择币种'
                    items={currencies.map((c) => ({
                      label: c.label,
                      value: c.value,
                    }))}
                  />
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
                    <Input {...field} placeholder='请输入备注（可选）' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='device_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>设备名</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='请输入设备名（可选）' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <SheetFooter className='gap-2'>
          <SheetClose asChild>
            <Button variant='outline' disabled={createMutation.isPending || updateMutation.isPending}>
              关闭
            </Button>
          </SheetClose>
          <Button
            form='expenses-form'
            type='submit'
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? '保存中...'
              : '保存'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

