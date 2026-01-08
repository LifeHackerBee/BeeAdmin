import { useEffect, useMemo } from 'react'
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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SelectDropdown } from '@/components/select-dropdown'
import { currencies } from '../data/data'
import { createRecurringRuleSchema, type CreateRecurringRuleInput } from '../data/recurring-rule-schema'
import type { RecurringRule } from '../data/recurring-rule-schema'
import { useCreateRecurringRule, useUpdateRecurringRule } from '../hooks/use-recurring-rules'
import { calculateNextRunAt } from '../hooks/use-recurring-rules'
import { useExpenseCategories } from '../hooks/use-expense-categories'
import { categoriesToOptions } from '../utils/category-utils'

type RecurringRuleDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRule?: RecurringRule | null
}

const weekDays = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]

export function RecurringRuleDrawer({ open, onOpenChange, currentRule }: RecurringRuleDrawerProps) {
  const isUpdate = !!currentRule
  const { data: categories = [], isLoading: categoriesLoading } = useExpenseCategories()
  const categoryOptions = categoriesToOptions(categories)

  const form = useForm<CreateRecurringRuleInput>({
    resolver: zodResolver(createRecurringRuleSchema),
    defaultValues: (() => {
      if (currentRule) {
        return {
          amount: currentRule.amount,
          category: currentRule.category,
          currency: currentRule.currency,
          note: currentRule.note,
          device_name: currentRule.device_name || null,
          frequency_type: currentRule.frequency_type,
          interval_value: currentRule.interval_value || 1,
          weekly_day_of_week: currentRule.weekly_day_of_week,
          monthly_day_of_month: currentRule.monthly_day_of_month,
          is_last_day_of_month: currentRule.is_last_day_of_month || false,
          start_date: currentRule.start_date,
          end_date: currentRule.end_date,
          timezone: currentRule.timezone || 'Asia/Shanghai',
          next_run_at: currentRule.next_run_at,
          status: currentRule.status || 'active',
        }
      }
      return {
        amount: 0,
        category: null,
        currency: null,
        note: null,
        device_name: null,
        frequency_type: 'monthly',
        interval_value: 1,
        weekly_day_of_week: null,
        monthly_day_of_month: null,
        is_last_day_of_month: false,
        start_date: null,
        end_date: null,
        timezone: 'Asia/Shanghai',
        next_run_at: new Date().toISOString(),
        status: 'active',
      }
    })(),
  })

  const createMutation = useCreateRecurringRule()
  const updateMutation = useUpdateRecurringRule()
  const frequencyType = form.watch('frequency_type')
  const intervalValue = form.watch('interval_value')
  const weeklyDayOfWeek = form.watch('weekly_day_of_week')
  const monthlyDayOfMonth = form.watch('monthly_day_of_month')
  const isLastDayOfMonth = form.watch('is_last_day_of_month')
  const startDate = form.watch('start_date')

  // 计算下次执行时间
  const nextRunAt = useMemo(() => {
    try {
      const baseDate = startDate ? new Date(startDate) : new Date()
      return calculateNextRunAt({
        frequencyType: frequencyType || 'monthly',
        intervalValue: intervalValue || 1,
        weeklyDayOfWeek: weeklyDayOfWeek || null,
        monthlyDayOfMonth: monthlyDayOfMonth || null,
        isLastDayOfMonth: isLastDayOfMonth || false,
        lastRunAt: baseDate.toISOString(),
      })
    } catch (error) {
      return new Date().toISOString()
    }
  }, [frequencyType, intervalValue, weeklyDayOfWeek, monthlyDayOfMonth, isLastDayOfMonth, startDate])

  // 同步 next_run_at
  useEffect(() => {
    form.setValue('next_run_at', nextRunAt)
  }, [nextRunAt, form])

  // 当编辑模式下，currentRule 变化时重置表单
  useEffect(() => {
    if (open && currentRule) {
      form.reset({
        amount: currentRule.amount,
        category: currentRule.category,
        currency: currentRule.currency,
        note: currentRule.note,
        device_name: currentRule.device_name || null,
        frequency_type: currentRule.frequency_type,
        interval_value: currentRule.interval_value || 1,
        weekly_day_of_week: currentRule.weekly_day_of_week,
        monthly_day_of_month: currentRule.monthly_day_of_month,
        is_last_day_of_month: currentRule.is_last_day_of_month || false,
        start_date: currentRule.start_date,
        end_date: currentRule.end_date,
        timezone: currentRule.timezone || 'Asia/Shanghai',
        next_run_at: currentRule.next_run_at,
        status: currentRule.status || 'active',
      })
    } else if (open && !currentRule) {
      // 新建模式，重置为默认值
      form.reset({
        amount: 0,
        category: null,
        currency: null,
        note: null,
        device_name: null,
        frequency_type: 'monthly',
        interval_value: 1,
        weekly_day_of_week: null,
        monthly_day_of_month: null,
        is_last_day_of_month: false,
        start_date: null,
        end_date: null,
        timezone: 'Asia/Shanghai',
        next_run_at: new Date().toISOString(),
        status: 'active',
      })
    }
  }, [open, currentRule, form])

  const onSubmit = async (data: CreateRecurringRuleInput) => {
    try {
      // 创建或更新规则时，将 next_run_at 设置为当前时间，立即触发执行询问
      const now = new Date().toISOString()
      
      if (isUpdate && currentRule) {
        await updateMutation.mutateAsync({
          id: currentRule.id,
          data: {
            ...data,
            next_run_at: now, // 设置为当前时间，立即触发询问
          },
        })
      } else {
        await createMutation.mutateAsync({
          ...data,
          next_run_at: now, // 设置为当前时间，立即触发询问
        })
      }
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error(isUpdate ? '更新周期性记账规则失败:' : '创建周期性记账规则失败:', error)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          form.reset()
        }
        onOpenChange(isOpen)
      }}
    >
      <SheetContent className='flex flex-col overflow-y-auto'>
        <SheetHeader className='text-start'>
          <SheetTitle>{isUpdate ? '编辑' : '新增'}周期性记账</SheetTitle>
          <SheetDescription>
            {isUpdate ? '修改' : '设置'}周期性记账规则，系统会在指定时间自动创建记账记录
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            id='recurring-rule-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex-1 space-y-6 overflow-y-auto px-4'
          >
            {/* 模板字段 */}
            <div className='space-y-4'>
              <h3 className='text-sm font-semibold'>记账信息</h3>
              
              <FormField
                control={form.control}
                name='amount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>金额</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='请输入金额'
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='category'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>分类</FormLabel>
                    <FormControl>
                      <SelectDropdown
                        items={categoryOptions.map((cat) => ({
                          label: cat.label,
                          value: cat.value,
                        }))}
                        defaultValue={field.value || ''}
                        onValueChange={(value) => field.onChange(value || null)}
                        placeholder={categoriesLoading ? '加载中...' : '请选择分类'}
                        isControlled={true}
                        disabled={categoriesLoading}
                      />
                    </FormControl>
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
                    <FormControl>
                      <SelectDropdown
                        items={currencies}
                        defaultValue={field.value || 'CNY'}
                        onValueChange={(value) => field.onChange(value || 'CNY')}
                        placeholder='请选择币种'
                        isControlled={true}
                      />
                    </FormControl>
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
                      <Input
                        placeholder='请输入备注（可选）'
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
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
                    <FormLabel>设备名称</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入设备名称（可选）'
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 周期规则 */}
            <div className='space-y-4'>
              <h3 className='text-sm font-semibold'>周期设置</h3>

              <FormField
                control={form.control}
                name='frequency_type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>周期类型</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='请选择周期类型' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='daily'>每天</SelectItem>
                        <SelectItem value='weekly'>每周</SelectItem>
                        <SelectItem value='monthly'>每月</SelectItem>
                        <SelectItem value='yearly'>每年</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='interval_value'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      间隔（每 {intervalValue || 1}{' '}
                      {frequencyType === 'daily' ? '天' : frequencyType === 'weekly' ? '周' : frequencyType === 'monthly' ? '月' : '年'}）
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={1}
                        placeholder='1'
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 周度规则 */}
              {frequencyType === 'weekly' && (
                <FormField
                  control={form.control}
                  name='weekly_day_of_week'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>周几</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString() || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='请选择周几' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {weekDays.map((day) => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 月度规则 */}
              {frequencyType === 'monthly' && (
                <>
                  <FormField
                    control={form.control}
                    name='is_last_day_of_month'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked)
                              if (checked) {
                                form.setValue('monthly_day_of_month', null)
                              }
                            }}
                          />
                        </FormControl>
                        <div className='space-y-1 leading-none'>
                          <FormLabel>每月最后一天</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {!isLastDayOfMonth && (
                    <FormField
                      control={form.control}
                      name='monthly_day_of_month'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>每月第几天</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min={1}
                              max={31}
                              placeholder='1-31'
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || null)}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>输入 1-31 之间的数字</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
            </div>

            {/* 时间范围 */}
            <div className='space-y-4'>
              <h3 className='text-sm font-semibold'>时间范围（可选）</h3>

              <FormField
                control={form.control}
                name='start_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>开始日期</FormLabel>
                    <FormControl>
                      <Input
                        type='datetime-local'
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                      />
                    </FormControl>
                    <FormDescription>留空则从今天开始</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='end_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>结束日期</FormLabel>
                    <FormControl>
                      <Input
                        type='datetime-local'
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                      />
                    </FormControl>
                    <FormDescription>留空则永久有效</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 预览下次执行时间 */}
            <div className='rounded-lg border p-4 bg-muted/50'>
              <p className='text-sm font-medium mb-1'>下次执行时间</p>
              <p className='text-sm text-muted-foreground'>
                {new Date(nextRunAt).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </form>
        </Form>
        <SheetFooter className='gap-2'>
          <SheetClose asChild>
            <Button variant='outline' disabled={createMutation.isPending || updateMutation.isPending}>
              取消
            </Button>
          </SheetClose>
          <Button
            form='recurring-rule-form'
            type='submit'
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? (isUpdate ? '更新中...' : '创建中...')
              : isUpdate
                ? '更新'
                : '创建'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

