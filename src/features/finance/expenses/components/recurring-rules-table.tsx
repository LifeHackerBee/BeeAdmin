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
import { useRecurringRules, useDeleteRecurringRule, useUpdateRecurringRule } from '../hooks/use-recurring-rules'
import { type RecurringRule } from '../data/recurring-rule-schema'
import { categories } from '../data/data'
import { format } from 'date-fns'
import { Edit, Trash2, Play, Pause, Calendar, Repeat } from 'lucide-react'
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
import { RecurringRuleDrawer } from './recurring-rule-drawer'

const currencySymbols: Record<string, string> = {
  CNY: '¥',
  HKD: 'HK$',
  USD: '$',
}

function getFrequencyLabel(rule: RecurringRule): string {
  const interval = rule.interval_value || 1
  switch (rule.frequency_type) {
    case 'daily':
      return `每 ${interval} 天`
    case 'weekly':
      const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      const dayLabel = weekDays[(rule.weekly_day_of_week || 1) - 1]
      return `每 ${interval} 周的${dayLabel}`
    case 'monthly':
      if (rule.is_last_day_of_month) {
        return `每 ${interval} 个月的最后一天`
      }
      return `每 ${interval} 个月的第 ${rule.monthly_day_of_month || 1} 天`
    case 'yearly':
      return `每 ${interval} 年`
    default:
      return '未知'
  }
}

export function RecurringRulesTable() {
  const { data: rules = [], isLoading, error } = useRecurringRules()
  const deleteMutation = useDeleteRecurringRule()
  const updateMutation = useUpdateRecurringRule()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RecurringRule | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RecurringRule | null>(null)

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

  const handleToggleStatus = async (rule: RecurringRule) => {
    try {
      await updateMutation.mutateAsync({
        id: rule.id,
        data: {
          status: rule.status === 'active' ? 'paused' : 'active',
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
          <CardTitle>周期性记账规则</CardTitle>
          <CardDescription>查看和管理您的周期性记账规则</CardDescription>
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
          <CardTitle>周期性记账规则</CardTitle>
          <CardDescription>查看和管理您的周期性记账规则</CardDescription>
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

  if (rules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>周期性记账规则</CardTitle>
          <CardDescription>查看和管理您的周期性记账规则</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <Repeat className='h-12 w-12 text-muted-foreground mb-4' />
            <p className='text-muted-foreground mb-2'>暂无周期性记账规则</p>
            <p className='text-sm text-muted-foreground'>
              点击右上角"周期性记账"按钮创建您的第一条规则
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
          <CardTitle>周期性记账规则</CardTitle>
          <CardDescription>查看和管理您的周期性记账规则（共 {rules.length} 条）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>分类</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>周期</TableHead>
                  <TableHead>设备</TableHead>
                  <TableHead>下次执行</TableHead>
                  <TableHead>上次执行</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const category = categories.find((cat) => cat.value === rule.category)
                  const categoryLabel = category?.label || rule.category || '未分类'
                  const symbol = currencySymbols[rule.currency || 'CNY'] || rule.currency || 'CNY'
                  const frequencyLabel = getFrequencyLabel(rule)

                  return (
                    <TableRow key={rule.id}>
                      <TableCell className='font-medium'>
                        <div className='flex items-center gap-2'>
                          {category?.icon && <category.icon className='h-4 w-4' />}
                          {categoryLabel}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className='font-semibold text-red-600'>
                          {symbol}
                          {rule.amount.toLocaleString('zh-CN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        {rule.currency && rule.currency !== 'CNY' && (
                          <span className='text-xs text-muted-foreground ml-1'>({rule.currency})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          <Repeat className='h-3 w-3 text-muted-foreground' />
                          <span className='text-sm'>{frequencyLabel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant='secondary' className='text-xs'>
                          {rule.device_name || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          <Calendar className='h-3 w-3 text-muted-foreground' />
                          <span className='text-sm'>
                            {format(new Date(rule.next_run_at), 'yyyy-MM-dd HH:mm')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {rule.last_run_at ? (
                          <span className='text-sm text-muted-foreground'>
                            {format(new Date(rule.last_run_at), 'yyyy-MM-dd HH:mm')}
                          </span>
                        ) : (
                          <span className='text-sm text-muted-foreground'>未执行</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.status === 'active' ? 'default' : 'secondary'}>
                          {rule.status === 'active' ? '激活' : '暂停'}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleToggleStatus(rule)}
                            disabled={updateMutation.isPending}
                          >
                            {rule.status === 'active' ? (
                              <Pause className='h-4 w-4' />
                            ) : (
                              <Play className='h-4 w-4' />
                            )}
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              setEditTarget(rule)
                              setEditDialogOpen(true)
                            }}
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              setDeleteTarget(rule)
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
                })}
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
              您确定要删除这条周期性记账规则吗？
              {deleteTarget && (
                <div className='mt-2 p-2 bg-muted rounded text-sm'>
                  <div>分类: {categories.find((c) => c.value === deleteTarget.category)?.label || deleteTarget.category}</div>
                  <div>
                    金额: {currencySymbols[deleteTarget.currency || 'CNY']}
                    {deleteTarget.amount.toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div>周期: {getFrequencyLabel(deleteTarget)}</div>
                </div>
              )}
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑对话框 */}
        <RecurringRuleDrawer
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) {
              setEditTarget(null)
            }
          }}
        currentRule={editTarget}
        />
    </>
  )
}

