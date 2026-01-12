import { useEffect, useMemo } from 'react'
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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Liability } from '../data/schema'
import {
  liabilityTypeLabels,
  paymentMethodLabels,
  liabilityStatusLabels,
} from '../data/schema'
import { useLiabilityMutations } from '../hooks/use-liability-mutations'

type LiabilitiesMutateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Liability
}

const formSchema = z.object({
  name: z.string().min(1, '负债名称是必填项。'),
  type: z.enum(['mortgage', 'car_loan', 'personal_loan', 'credit_card', 'other']),
  total_amount: z.number().min(0.01, '总金额必须大于 0。'),
  initial_principal: z.number().min(0.01, '初始本金必须大于 0。'),
  remaining_principal: z.number().min(0, '剩余本金不能为负数。'),
  total_periods: z.number().int().min(1, '总期数必须大于 0。'),
  remaining_periods: z.number().int().min(0, '剩余期数不能为负数。'),
  start_date: z.string().min(1, '开始日期是必填项。'),
  first_payment_date: z.string().min(1, '首次还款日期是必填项。'),
  current_annual_rate: z
    .number()
    .min(0, '年利率不能为负数。')
    .max(1, '年利率不能超过 100%。'),
  current_rate_effective_date: z.string().min(1, '利率生效日期是必填项。'),
  monthly_payment: z.number().min(0).optional().nullable(),
  payment_method: z.enum(['equal_payment', 'equal_principal', 'daily_interest', 'interest_only', 'other']),
  payment_day: z.number().int().min(1).max(31),
  currency: z.string().min(1, '请选择币种。'),
  status: z.enum(['active', 'paid_off', 'defaulted', 'other']),
  note: z.string().optional(),
})

type LiabilityForm = z.infer<typeof formSchema>

// 计算等额本息月供
function calculateEqualPaymentMonthly(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (months <= 0) return principal
  const monthlyRate = annualRate / 12.0
  if (monthlyRate > 0) {
    const payment =
      principal *
      ((monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1))
    return Math.round(payment * 100) / 100
  }
  return Math.round((principal / months) * 100) / 100
}

// 计算等额本金首月月供
function calculateEqualPrincipalFirstMonthly(
  principal: number,
  annualRate: number,
  months: number
): number {
  const monthlyPrincipal = principal / months
  const firstMonthInterest = principal * (annualRate / 12.0)
  return Math.round((monthlyPrincipal + firstMonthInterest) * 100) / 100
}

export function LiabilitiesMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: LiabilitiesMutateDrawerProps) {
  const isUpdate = !!currentRow
  const { create, update, isCreating, isUpdating } = useLiabilityMutations()

  const form = useForm<LiabilityForm>({
    resolver: zodResolver(formSchema),
    defaultValues: (() => {
      if (currentRow) {
        return {
          name: currentRow.name,
          type: currentRow.type,
          total_amount: currentRow.total_amount,
          initial_principal: currentRow.initial_principal,
          remaining_principal: currentRow.remaining_principal,
          total_periods: currentRow.total_periods,
          remaining_periods: currentRow.remaining_periods,
          start_date: currentRow.start_date.split('T')[0],
          first_payment_date: currentRow.first_payment_date.split('T')[0],
          current_annual_rate: currentRow.current_annual_rate,
          current_rate_effective_date: currentRow.current_rate_effective_date.split('T')[0],
          monthly_payment: currentRow.monthly_payment ?? null,
          payment_method: currentRow.payment_method,
          payment_day: currentRow.payment_day,
          currency: currentRow.currency || 'CNY',
          status: currentRow.status,
          note: currentRow.note || '',
        }
      }
      const today = new Date().toISOString().split('T')[0]
      return {
        name: '',
        type: 'mortgage',
        total_amount: 0,
        initial_principal: 0,
        remaining_principal: 0,
        total_periods: 360,
        remaining_periods: 360,
        start_date: today,
        first_payment_date: today,
        current_annual_rate: 0.03875,
        current_rate_effective_date: today,
        monthly_payment: null,
        payment_method: 'equal_payment',
        payment_day: 1,
        currency: 'CNY',
        status: 'active',
        note: '',
      }
    })(),
  })

  // 监听字段变化，自动计算月供
  const remainingPrincipal = form.watch('remaining_principal')
  const currentAnnualRate = form.watch('current_annual_rate')
  const remainingPeriods = form.watch('remaining_periods')
  const paymentMethod = form.watch('payment_method')
  const autoCalculateMonthlyPayment = form.watch('monthly_payment') === null

  const calculatedMonthlyPayment = useMemo(() => {
    if (
      !autoCalculateMonthlyPayment ||
      remainingPrincipal <= 0 ||
      remainingPeriods <= 0
    ) {
      return null
    }

    if (paymentMethod === 'equal_payment') {
      return calculateEqualPaymentMonthly(
        remainingPrincipal,
        currentAnnualRate,
        remainingPeriods
      )
    } else if (paymentMethod === 'equal_principal') {
      return calculateEqualPrincipalFirstMonthly(
        remainingPrincipal,
        currentAnnualRate,
        remainingPeriods
      )
    } else if (paymentMethod === 'daily_interest') {
      // 按日计息需要根据实际还款记录计算，这里返回 null
      return null
    }

    return null
  }, [
    autoCalculateMonthlyPayment,
    remainingPrincipal,
    currentAnnualRate,
    remainingPeriods,
    paymentMethod,
  ])

  useEffect(() => {
    if (open && currentRow) {
      form.reset({
        name: currentRow.name,
        type: currentRow.type,
        total_amount: currentRow.total_amount,
        initial_principal: currentRow.initial_principal,
        remaining_principal: currentRow.remaining_principal,
        total_periods: currentRow.total_periods,
        remaining_periods: currentRow.remaining_periods,
        start_date: currentRow.start_date.split('T')[0],
        first_payment_date: currentRow.first_payment_date.split('T')[0],
        current_annual_rate: currentRow.current_annual_rate,
        current_rate_effective_date: currentRow.current_rate_effective_date.split('T')[0],
        monthly_payment: currentRow.monthly_payment ?? null,
        payment_method: currentRow.payment_method,
        payment_day: currentRow.payment_day,
        currency: currentRow.currency || 'CNY',
        status: currentRow.status,
        note: currentRow.note || '',
      })
    } else if (open && !currentRow) {
      const today = new Date().toISOString().split('T')[0]
      form.reset({
        name: '',
        type: 'mortgage',
        total_amount: 0,
        initial_principal: 0,
        remaining_principal: 0,
        total_periods: 360,
        remaining_periods: 360,
        start_date: today,
        first_payment_date: today,
        current_annual_rate: 0.03875,
        current_rate_effective_date: today,
        monthly_payment: null,
        payment_method: 'equal_payment',
        payment_day: 1,
        currency: 'CNY',
        status: 'active',
        note: '',
      })
    }
  }, [open, currentRow, form])

  // 当初始本金变化时，自动更新剩余本金（新建时）
  useEffect(() => {
    if (!isUpdate && form.watch('initial_principal') > 0) {
      const currentRemaining = form.getValues('remaining_principal')
      const initialPrincipal = form.getValues('initial_principal')
      if (currentRemaining === 0 || currentRemaining < initialPrincipal) {
        form.setValue('remaining_principal', initialPrincipal)
      }
    }
  }, [form.watch('initial_principal'), isUpdate, form])

  // 当总金额变化时，自动更新初始本金（新建时）
  useEffect(() => {
    if (!isUpdate && form.watch('total_amount') > 0) {
      const totalAmount = form.getValues('total_amount')
      const currentInitial = form.getValues('initial_principal')
      if (currentInitial === 0 || currentInitial !== totalAmount) {
        form.setValue('initial_principal', totalAmount)
        form.setValue('remaining_principal', totalAmount)
      }
    }
  }, [form.watch('total_amount'), isUpdate, form])

  const onSubmit = async (data: LiabilityForm) => {
    try {
      const liabilityData = {
        name: data.name,
        type: data.type,
        total_amount: data.total_amount,
        initial_principal: data.initial_principal,
        remaining_principal: data.remaining_principal,
        paid_amount: data.initial_principal - data.remaining_principal,
        total_periods: data.total_periods,
        remaining_periods: data.remaining_periods,
        start_date: data.start_date,
        first_payment_date: data.first_payment_date,
        current_annual_rate: data.current_annual_rate,
        current_rate_effective_date: data.current_rate_effective_date,
        monthly_payment: data.monthly_payment,
        payment_method: data.payment_method,
        payment_day: data.payment_day,
        currency: data.currency,
        status: data.status,
        note: data.note || null,
      }

      if (isUpdate && currentRow) {
        await update({ id: currentRow.id, ...liabilityData })
      } else {
        await create(liabilityData)
      }

      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Failed to save liability:', error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>{isUpdate ? '编辑' : '新增'}负债</SheetTitle>
          <SheetDescription>
            {isUpdate ? '更新负债信息。' : '添加新的负债记录。'}
            完成后点击保存。
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            id='liabilities-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex-1 space-y-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>负债名称</FormLabel>
                  <FormControl>
                    <Input placeholder='例如：XX小区房贷' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>负债类型</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='选择负债类型' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(liabilityTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='total_amount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>总金额</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0.00'
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
                name='initial_principal'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>初始本金</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0.00'
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>贷款本金总额</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='remaining_principal'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>剩余本金</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0.00'
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
                name='current_annual_rate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>当前年利率 (%)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.0001'
                        placeholder='3.875'
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) / 100 || 0)
                        }
                        value={field.value ? (field.value * 100).toFixed(4) : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='total_periods'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>总期数 (月)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='360'
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='remaining_periods'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>剩余期数 (月)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='360'
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='start_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>开始日期</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormDescription>首次放款日期</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='first_payment_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>首次还款日期</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='current_rate_effective_date'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>当前利率生效日期</FormLabel>
                  <FormControl>
                    <Input type='date' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='payment_method'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>还款方式</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='选择还款方式' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(paymentMethodLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='monthly_payment'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>月供</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder={
                          calculatedMonthlyPayment
                            ? `自动计算: ${calculatedMonthlyPayment.toFixed(2)}`
                            : paymentMethod === 'daily_interest'
                              ? '按日计息需根据还款记录计算'
                              : '留空自动计算'
                        }
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '') {
                            field.onChange(null)
                          } else {
                            field.onChange(parseFloat(value) || 0)
                          }
                        }}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    {calculatedMonthlyPayment && (
                      <FormDescription>
                        自动计算值: {calculatedMonthlyPayment.toFixed(2)}（留空使用此值）
                      </FormDescription>
                    )}
                    {paymentMethod === 'daily_interest' && (
                      <FormDescription>
                        按日计息的月供需要根据实际还款记录计算
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='payment_day'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>还款日</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min='1'
                        max='31'
                        placeholder='1'
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='currency'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>币种</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='CNY'>CNY (¥)</SelectItem>
                        <SelectItem value='HKD'>HKD (HK$)</SelectItem>
                        <SelectItem value='USD'>USD ($)</SelectItem>
                        <SelectItem value='EUR'>EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='选择状态' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(liabilityStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='note'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='可选备注信息'
                      className='resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <SheetFooter>
          <Button
            type='submit'
            form='liabilities-form'
            disabled={isCreating || isUpdating}
          >
            {isCreating || isUpdating ? '保存中...' : '保存'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
