import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  useAllExpenseCategories,
  useDeleteExpenseCategory,
  useUpdateExpenseCategory,
} from '../hooks/use-expense-categories'
import { type ExpenseCategory } from '../data/category-schema'
import { Edit, Trash2, Plus, Tag } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CategoryDrawer } from './category-drawer'

// 动态获取图标组件
function getIconComponent(iconName?: string | null) {
  if (!iconName) return Tag
  const IconComponent = (LucideIcons as Record<string, any>)[iconName]
  return IconComponent || Tag
}

export function CategoriesTable() {
  const { data: categories = [], isLoading, error } = useAllExpenseCategories()
  const deleteMutation = useDeleteExpenseCategory()
  const updateMutation = useUpdateExpenseCategory()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ExpenseCategory | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleToggleActive = async (category: ExpenseCategory) => {
    try {
      await updateMutation.mutateAsync({
        id: category.id,
        data: {
          is_active: !category.is_active,
        },
      })
    } catch (error) {
      console.error('更新状态失败:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>记账类型管理</CardTitle>
          <CardDescription>管理您的记账分类类型</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-12'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>记账类型管理</CardTitle>
          <CardDescription>管理您的记账分类类型</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-12'>
            <p className='text-destructive'>
              加载失败: {error instanceof Error ? error.message : '未知错误'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>记账类型管理</CardTitle>
              <CardDescription>管理您的记账分类类型（共 {categories.length} 个）</CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className='h-4 w-4 mr-2' />
              新增类型
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>图标</TableHead>
                  <TableHead>标签</TableHead>
                  <TableHead>值</TableHead>
                  <TableHead>颜色</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='text-center py-12'>
                      <div className='flex flex-col items-center justify-center'>
                        <Tag className='h-12 w-12 text-muted-foreground mb-4' />
                        <p className='text-muted-foreground mb-2'>暂无记账类型</p>
                        <p className='text-sm text-muted-foreground'>
                          点击"新增类型"按钮创建您的第一个记账类型
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => {
                    const IconComponent = getIconComponent(category.icon_name)

                    return (
                      <TableRow key={category.id}>
                        <TableCell>
                          <IconComponent className='h-5 w-5' />
                        </TableCell>
                        <TableCell className='font-medium'>{category.label}</TableCell>
                        <TableCell>
                          <code className='text-sm bg-muted px-2 py-1 rounded'>
                            {category.value}
                          </code>
                        </TableCell>
                        <TableCell>
                          {category.color ? (
                            <div className='flex items-center gap-2'>
                              <div
                                className='w-5 h-5 rounded border'
                                style={{ backgroundColor: category.color }}
                              />
                              <span className='text-sm text-muted-foreground'>{category.color}</span>
                            </div>
                          ) : (
                            <span className='text-sm text-muted-foreground'>-</span>
                          )}
                        </TableCell>
                        <TableCell>{category.sort_order}</TableCell>
                        <TableCell>
                          <Badge variant={category.is_active ? 'default' : 'secondary'}>
                            {category.is_active ? '启用' : '禁用'}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleToggleActive(category)}
                              disabled={updateMutation.isPending}
                            >
                              {category.is_active ? '禁用' : '启用'}
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => {
                                setEditTarget(category)
                                setEditDialogOpen(true)
                              }}
                            >
                              <Edit className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => {
                                setDeleteTarget(category)
                                setDeleteDialogOpen(true)
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className='h-4 w-4 text-destructive' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除记账类型 <strong>{deleteTarget?.label}</strong> 吗？
              <br />
              此操作将禁用该类型，相关记录不会受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑对话框 */}
      <CategoryDrawer
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) {
            setEditTarget(null)
          }
        }}
        currentCategory={editTarget}
      />

      {/* 创建对话框 */}
      <CategoryDrawer
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
        }}
        currentCategory={null}
      />
    </>
  )
}

