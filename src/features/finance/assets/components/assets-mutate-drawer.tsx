import { useEffect } from 'react'
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
import { type Asset } from '../data/schema'
import {
  assetTypeLabels,
  assetStatusLabels,
  assetCategoryOptions,
} from '../data/schema'
import { useAssetMutations } from '../hooks/use-asset-mutations'

type AssetsMutateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Asset
}

const formSchema = z.object({
  name: z.string().min(1, '资产名称是必填项。'),
  type: z.enum([
    'cash_equivalent',
    'fixed_income',
    'equity',
    'alternative',
    'property_owner_occupied',
    'property_investment',
    'business',
    'receivables',
    'retirement_insurance',
    'other',
  ]),
  category: z.string().optional().nullable(),
  current_value: z.number().min(0, '当前价值不能为负数。'),
  purchase_value: z.number().min(0).optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  currency: z.string().min(1, '请选择币种。'),
  status: z.enum(['active', 'sold', 'liquidated', 'other']),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  institution: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

type AssetForm = z.infer<typeof formSchema>

export function AssetsMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: AssetsMutateDrawerProps) {
  const isUpdate = !!currentRow
  const { create, update, isCreating, isUpdating } = useAssetMutations()

  const form = useForm<AssetForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'cash_equivalent',
      category: null,
      current_value: 0,
      purchase_value: null,
      purchase_date: null,
      currency: 'CNY',
      status: 'active',
      description: null,
      location: null,
      institution: null,
      account_number: null,
      note: null,
    },
  })

  useEffect(() => {
    if (open && currentRow) {
      form.reset({
        name: currentRow.name,
        type: currentRow.type,
        category: currentRow.category || null,
        current_value: currentRow.current_value,
        purchase_value: currentRow.purchase_value || null,
        purchase_date: currentRow.purchase_date
          ? currentRow.purchase_date.split('T')[0]
          : null,
        currency: currentRow.currency || 'CNY',
        status: currentRow.status,
        description: currentRow.description || null,
        location: currentRow.location || null,
        institution: currentRow.institution || null,
        account_number: currentRow.account_number || null,
        note: currentRow.note || null,
      })
    } else if (open && !currentRow) {
      form.reset({
        name: '',
        type: 'cash_equivalent',
        category: null,
        current_value: 0,
        purchase_value: null,
        purchase_date: null,
        currency: 'CNY',
        status: 'active',
        description: null,
        location: null,
        institution: null,
        account_number: null,
        note: null,
      })
    }
  }, [open, currentRow, form])

  const selectedType = form.watch('type')
  const categoryOptions = selectedType
    ? assetCategoryOptions[selectedType] || []
    : []

  const onSubmit = async (data: AssetForm) => {
    try {
      // 将 null 转换为 undefined，以匹配类型定义
      const submitData = {
        ...data,
        purchase_date: data.purchase_date || undefined,
        purchase_value: data.purchase_value ?? undefined,
        category: data.category || undefined,
        description: data.description || undefined,
        location: data.location || undefined,
        institution: data.institution || undefined,
        account_number: data.account_number || undefined,
        note: data.note || undefined,
      }

      if (isUpdate && currentRow) {
        await update({ id: currentRow.id, ...submitData })
      } else {
        await create(submitData)
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save asset:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[540px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{isUpdate ? '编辑资产' : '新增资产'}</DialogTitle>
          <DialogDescription>
            {isUpdate
              ? '修改资产信息，点击保存按钮保存更改。'
              : '填写资产信息，点击保存按钮创建新资产。'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>资产名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder='例如：工商银行活期账户' {...field} />
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
                  <FormLabel>资产类型 *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='选择资产类型' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(assetTypeLabels).map(([value, label]) => (
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

            {categoryOptions.length > 0 && (
              <FormField
                control={form.control}
                name='category'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>分类</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        // 如果选择的是 "__none__"，则设置为 null
                        field.onChange(value === '__none__' ? null : value)
                      }}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='选择分类（可选）' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='__none__'>无</SelectItem>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='current_value'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>当前价值 *</FormLabel>
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
                name='currency'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>币种 *</FormLabel>
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
                        <SelectItem value='CNY'>CNY (人民币)</SelectItem>
                        <SelectItem value='USD'>USD (美元)</SelectItem>
                        <SelectItem value='HKD'>HKD (港币)</SelectItem>
                        <SelectItem value='EUR'>EUR (欧元)</SelectItem>
                        <SelectItem value='GBP'>GBP (英镑)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='purchase_value'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>购买价值</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='可选'
                        {...field}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='purchase_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>购买日期</FormLabel>
                    <FormControl>
                      <Input
                        type='date'
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>状态 *</FormLabel>
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
                      {Object.entries(assetStatusLabels).map(([value, label]) => (
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

            <FormField
              control={form.control}
              name='institution'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>机构</FormLabel>
                  <FormControl>
                    <Input placeholder='例如：工商银行' {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='account_number'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>账户号码</FormLabel>
                  <FormControl>
                    <Input placeholder='可选' {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='location'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>位置</FormLabel>
                  <FormControl>
                    <Input placeholder='适用于房产等' {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='资产描述（可选）'
                      {...field}
                      value={field.value || ''}
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
                    <Textarea placeholder='备注（可选）' {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type='submit' disabled={isCreating || isUpdating}>
                {isCreating || isUpdating
                  ? '保存中...'
                  : isUpdate
                    ? '保存更改'
                    : '创建资产'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
