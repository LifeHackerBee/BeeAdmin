import React, { useEffect } from 'react'
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
import { currencies } from '../data/data'
import { type Expense } from '../data/schema'
import { useCreateExpense, useUpdateExpense } from '../hooks/use-expense-mutations'
import { useExpenseCategories } from '../hooks/use-expense-categories'
import { categoriesToOptions } from '../utils/category-utils'

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

// 将日期时间字符串转换为本地时间的 24 小时制格式 (YYYY-MM-DDTHH:mm)
function formatToLocalDatetime(datetimeString: string | null | undefined): string {
  if (!datetimeString) {
    // 如果没有提供时间，返回当前时间的本地时间格式
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  try {
    const date = new Date(datetimeString)
    // 使用本地时间，而不是 UTC 时间
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0') // 24小时制
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    // 如果解析失败，返回当前时间
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }
}

export function ExpensesMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: ExpensesMutateDrawerProps) {
  const isUpdate = !!currentRow
  const { data: categories = [], isLoading: categoriesLoading } = useExpenseCategories()
  const categoryOptions = categoriesToOptions(categories)

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(formSchema),
    defaultValues: (() => {
      if (currentRow) {
        return {
          spending_time: formatToLocalDatetime(currentRow.spending_time),
          amount: currentRow.amount ?? 0,
          category: currentRow.category ?? '',
          currency: currentRow.currency ?? 'CNY',
          note: currentRow.note ?? '',
          device_name: currentRow.device_name ?? '',
        }
      }
      return {
        spending_time: formatToLocalDatetime(null), // 使用当前本地时间
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

  // 当 currentRow 变化时，重置表单以使用原始值（特别是日期时间）
  useEffect(() => {
    if (open && currentRow) {
      // 编辑模式：使用原始日期时间（本地时间格式，24小时制）
      form.reset({
        spending_time: formatToLocalDatetime(currentRow.spending_time),
        amount: currentRow.amount ?? 0,
        category: currentRow.category ?? '',
        currency: currentRow.currency ?? 'CNY',
        note: currentRow.note ?? '',
        device_name: currentRow.device_name ?? '',
      })
    } else if (open && !currentRow) {
      // 新建模式：使用当前时间（本地时间格式，24小时制）
      form.reset({
        spending_time: formatToLocalDatetime(null),
        amount: 0,
        category: '',
        currency: 'CNY',
        note: '',
        device_name: '',
      })
    }
  }, [open, currentRow, form])

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
                // 使用本地状态来保存输入框的显示值（允许用户输入过程中的中间状态）
                const [displayValue, setDisplayValue] = React.useState<string>(
                  field.value && field.value !== 0 ? String(field.value) : ''
                )

                // 当 field.value 从外部改变时（如编辑模式），同步到显示值
                React.useEffect(() => {
                  if (field.value !== undefined && field.value !== null) {
                    const strValue = field.value === 0 ? '' : String(field.value)
                    setDisplayValue(strValue)
                  }
                }, [field.value])

                return (
                  <FormItem>
                    <FormLabel>金额</FormLabel>
                    <FormControl>
                      <Input
                        type='text'
                        inputMode='decimal'
                        placeholder='请输入金额，支持小数'
                        value={displayValue}
                        onChange={(e) => {
                          let value = e.target.value
                          
                          // 允许空值
                          if (value === '') {
                            setDisplayValue('')
                            field.onChange(0)
                            return
                          }
                          
                          // 只允许数字和小数点
                          value = value.replace(/[^\d.]/g, '')
                          
                          // 限制只能有一个小数点
                          const parts = value.split('.')
                          if (parts.length > 2) {
                            value = parts[0] + '.' + parts.slice(1).join('')
                          }
                          
                          // 限制小数点后最多2位
                          if (parts.length === 2 && parts[1].length > 2) {
                            value = parts[0] + '.' + parts[1].substring(0, 2)
                          }
                          
                          // 更新显示值
                          setDisplayValue(value)
                          
                          // 解析为数字并更新表单值（允许中间状态如 "0." 或 "."）
                          if (value === '' || value === '.' || value === '0.') {
                            field.onChange(0)
                          } else {
                            const numValue = parseFloat(value)
                            if (!isNaN(numValue)) {
                              field.onChange(numValue)
                            } else {
                              // 如果解析失败，保持当前值（可能是输入过程中的中间状态）
                              field.onChange(0)
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // 失焦时进行最终格式化
                          const value = e.target.value.trim()
                          
                          if (value === '' || value === '.' || value === '0.') {
                            setDisplayValue('')
                            field.onChange(0)
                          } else {
                            const numValue = parseFloat(value)
                            if (!isNaN(numValue)) {
                              // 格式化显示：如果是整数显示整数，如果是小数保留最多2位
                              if (numValue % 1 === 0) {
                                setDisplayValue(numValue.toString())
                              } else {
                                setDisplayValue(numValue.toFixed(2).replace(/\.?0+$/, ''))
                              }
                              field.onChange(numValue)
                            } else {
                              // 如果无法解析，重置为0
                              setDisplayValue('')
                              field.onChange(0)
                            }
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
                      placeholder={categoriesLoading ? '加载中...' : '选择分类'}
                      items={categoryOptions.map((cat) => ({
                        label: cat.label,
                        value: cat.value,
                      }))}
                      disabled={categoriesLoading}
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

