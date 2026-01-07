import { useEffect } from 'react'
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
import { createExpenseCategorySchema, type CreateExpenseCategoryInput } from '../data/category-schema'
import type { ExpenseCategory } from '../data/category-schema'
import { useCreateExpenseCategory, useUpdateExpenseCategory } from '../hooks/use-expense-categories'
import * as LucideIcons from 'lucide-react'
import { Tag } from 'lucide-react'

type CategoryDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentCategory?: ExpenseCategory | null
}

// 常用的图标列表
const commonIcons = [
  'ShoppingCart',
  'UtensilsCrossed',
  'Car',
  'Home',
  'Heart',
  'Gamepad2',
  'Dumbbell',
  'Book',
  'Globe',
  'Gift',
  'Tag',
  'MoreVertical',
  'Coffee',
  'Plane',
  'Music',
  'Camera',
  'Smartphone',
  'Laptop',
  'Shirt',
  'Bike',
]

// 动态获取图标组件
function getIconComponent(iconName?: string | null) {
  if (!iconName) return Tag
  const IconComponent = (LucideIcons as Record<string, any>)[iconName]
  return IconComponent || Tag
}

export function CategoryDrawer({ open, onOpenChange, currentCategory }: CategoryDrawerProps) {
  const isUpdate = !!currentCategory

  const form = useForm<CreateExpenseCategoryInput>({
    resolver: zodResolver(createExpenseCategorySchema),
    defaultValues: {
      label: '',
      value: '',
      icon_name: null,
      color: null,
      sort_order: 0,
      is_active: true,
    },
  })

  const createMutation = useCreateExpenseCategory()
  const updateMutation = useUpdateExpenseCategory()

  // 当编辑模式下，currentCategory 变化时重置表单
  useEffect(() => {
    if (open && currentCategory) {
      form.reset({
        label: currentCategory.label,
        value: currentCategory.value,
        icon_name: currentCategory.icon_name || null,
        color: currentCategory.color || null,
        sort_order: currentCategory.sort_order || 0,
        is_active: currentCategory.is_active,
      })
    } else if (open && !currentCategory) {
      // 新建模式，重置为默认值
      form.reset({
        label: '',
        value: '',
        icon_name: null,
        color: null,
        sort_order: 0,
        is_active: true,
      })
    }
  }, [open, currentCategory, form])

  const onSubmit = async (data: CreateExpenseCategoryInput) => {
    try {
      if (isUpdate && currentCategory) {
        await updateMutation.mutateAsync({
          id: currentCategory.id,
          data,
        })
      } else {
        await createMutation.mutateAsync(data)
      }
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error(isUpdate ? '更新记账类型失败:' : '创建记账类型失败:', error)
    }
  }

  const selectedIconName = form.watch('icon_name')
  const SelectedIcon = getIconComponent(selectedIconName)

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
          <SheetTitle>{isUpdate ? '编辑' : '新增'}记账类型</SheetTitle>
          <SheetDescription>
            {isUpdate ? '修改' : '创建'}记账分类类型，用于分类管理您的支出记录
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            id='category-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex-1 space-y-6 overflow-y-auto px-4'
          >
            <FormField
              control={form.control}
              name='label'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标签</FormLabel>
                  <FormControl>
                    <Input placeholder='请输入标签，如：餐饮' {...field} />
                  </FormControl>
                  <FormDescription>显示名称，用于界面展示</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='value'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>值</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='请输入值，如：Food'
                      {...field}
                      disabled={isUpdate}
                      onChange={(e) => {
                        // 自动转换为首字母大写的驼峰命名
                        const value = e.target.value
                          .replace(/[^a-zA-Z0-9]/g, '')
                          .replace(/^./, (char) => char.toUpperCase())
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    唯一标识符，只能包含字母和数字，必须以大写字母开头（创建后不可修改）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='icon_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>图标</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <div className='flex items-center gap-2'>
                          <SelectedIcon className='h-4 w-4' />
                          <SelectValue placeholder='请选择图标' />
                        </div>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {commonIcons.map((iconName) => {
                        const IconComponent = getIconComponent(iconName)
                        return (
                          <SelectItem key={iconName} value={iconName}>
                            <div className='flex items-center gap-2'>
                              <IconComponent className='h-4 w-4' />
                              <span>{iconName}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>选择用于表示此分类的图标</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='color'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>颜色</FormLabel>
                  <FormControl>
                    <div className='flex items-center gap-2'>
                      <Input
                        type='color'
                        className='w-16 h-10'
                        {...field}
                        value={field.value || '#000000'}
                      />
                      <Input
                        type='text'
                        placeholder='#000000'
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>选择分类的颜色（可选）</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='sort_order'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>排序顺序</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={0}
                      placeholder='0'
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      value={field.value || 0}
                    />
                  </FormControl>
                  <FormDescription>数字越小越靠前</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <SheetFooter className='gap-2'>
          <SheetClose asChild>
            <Button
              variant='outline'
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              取消
            </Button>
          </SheetClose>
          <Button
            form='category-form'
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

