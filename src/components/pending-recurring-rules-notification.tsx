import { useEffect, useState } from 'react'
import { usePendingRecurringRules, useExecuteRecurringRule, useUpdateRecurringRule, calculateNextRunAt } from '@/features/finance/expenses/hooks/use-recurring-rules'
import { useAuthStore } from '@/stores/auth-store'
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
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { useExpenseCategories } from '@/features/finance/expenses/hooks/use-expense-categories'

export function PendingRecurringRulesNotification() {
  const { auth } = useAuthStore()
  const { data: pendingRules = [], isLoading } = usePendingRecurringRules()
  const { data: categories = [] } = useExpenseCategories()
  const executeMutation = useExecuteRecurringRule()
  const updateMutation = useUpdateRecurringRule()
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [hasShown, setHasShown] = useState(false)

  // 当用户登录且有待触发的规则时，显示通知
  useEffect(() => {
    if (auth.user && !auth.loading && pendingRules.length > 0 && !hasShown && !isLoading) {
      setIsOpen(true)
      setHasShown(true)
    }
  }, [auth.user, auth.loading, pendingRules.length, hasShown, isLoading])

  // 当 pendingRules 变化时，重置 hasShown（允许再次显示）
  useEffect(() => {
    if (pendingRules.length === 0) {
      setHasShown(false)
    }
  }, [pendingRules.length])

  const currentRule = pendingRules[currentRuleIndex]
  const categoryLabel = currentRule
    ? categories.find((cat) => cat.value === currentRule.category)?.label || currentRule.category || '未分类'
    : ''

  const handleExecute = async () => {
    if (!currentRule) return

    try {
      const spendingTime = new Date().toISOString()
      await executeMutation.mutateAsync({
        ruleId: currentRule.id,
        spendingTime,
      })

      // 移动到下一个规则
      if (currentRuleIndex < pendingRules.length - 1) {
        setCurrentRuleIndex(currentRuleIndex + 1)
      } else {
        setIsOpen(false)
        setCurrentRuleIndex(0)
      }
    } catch (error) {
      console.error('执行周期性记账失败:', error)
    }
  }

  const handleSkip = async () => {
    if (!currentRule) return

    try {
      // 计算下一次应该执行的时间（从当前时间开始计算）
      const now = new Date().toISOString()
      const nextRunAt = calculateNextRunAt({
        frequencyType: currentRule.frequency_type,
        intervalValue: currentRule.interval_value || 1,
        weeklyDayOfWeek: currentRule.weekly_day_of_week || null,
        monthlyDayOfMonth: currentRule.monthly_day_of_month || null,
        isLastDayOfMonth: currentRule.is_last_day_of_month || false,
        lastRunAt: now, // 从当前时间开始计算下次执行时间
      })

      // 更新规则的 next_run_at 为下次执行时间
      await updateMutation.mutateAsync({
        id: currentRule.id,
        data: {
          next_run_at: nextRunAt,
        },
      })

      // 移动到下一个规则
      if (currentRuleIndex < pendingRules.length - 1) {
        setCurrentRuleIndex(currentRuleIndex + 1)
      } else {
        setIsOpen(false)
        setCurrentRuleIndex(0)
      }
    } catch (error) {
      console.error('跳过周期性记账失败:', error)
      // 即使更新失败，也移动到下一个规则
      if (currentRuleIndex < pendingRules.length - 1) {
        setCurrentRuleIndex(currentRuleIndex + 1)
      } else {
        setIsOpen(false)
        setCurrentRuleIndex(0)
      }
    }
  }

  const handleClose = async () => {
    // "稍后处理"时，将当前规则推迟到下次执行时间，避免每次打开都看到同样的通知
    if (currentRule) {
      try {
        const now = new Date().toISOString()
        const nextRunAt = calculateNextRunAt({
          frequencyType: currentRule.frequency_type,
          intervalValue: currentRule.interval_value || 1,
          weeklyDayOfWeek: currentRule.weekly_day_of_week || null,
          monthlyDayOfMonth: currentRule.monthly_day_of_month || null,
          isLastDayOfMonth: currentRule.is_last_day_of_month || false,
          lastRunAt: now,
        })

        await updateMutation.mutateAsync({
          id: currentRule.id,
          data: {
            next_run_at: nextRunAt,
          },
        })
      } catch (error) {
        console.error('推迟周期性记账失败:', error)
        // 即使更新失败，也关闭对话框
      }
    }
    
    setIsOpen(false)
    setCurrentRuleIndex(0)
  }

  if (!currentRule) {
    return null
  }

  const currencySymbols: Record<string, string> = {
    CNY: '¥',
    HKD: 'HK$',
    USD: '$',
  }
  const symbol = currencySymbols[currentRule.currency || 'CNY'] || currentRule.currency || 'CNY'

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>周期性记账提醒</AlertDialogTitle>
          <AlertDialogDescription className='space-y-2'>
            <p>
              您有 <strong>{pendingRules.length}</strong> 条周期性记账规则待执行
              {pendingRules.length > 1 && `（${currentRuleIndex + 1}/${pendingRules.length}）`}
            </p>
            <div className='rounded-lg border p-4 bg-muted/50 space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>分类：</span>
                <span className='text-sm'>{categoryLabel}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>金额：</span>
                <span className='text-sm font-semibold text-red-600'>
                  {symbol}
                  {currentRule.amount.toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>币种：</span>
                <span className='text-sm'>{currentRule.currency || 'CNY'}</span>
              </div>
              {currentRule.note && (
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>备注：</span>
                  <span className='text-sm'>{currentRule.note}</span>
                </div>
              )}
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>应执行时间：</span>
                <span className='text-sm'>
                  {format(new Date(currentRule.next_run_at), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
            </div>
            <p className='text-xs text-muted-foreground mt-2'>
              点击"执行"将创建一条记账记录，点击"跳过"将处理下一条规则
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>稍后处理</AlertDialogCancel>
          <Button variant='outline' onClick={handleSkip} disabled={executeMutation.isPending || updateMutation.isPending}>
            {updateMutation.isPending ? '跳过中...' : '跳过'}
          </Button>
          <AlertDialogAction onClick={handleExecute} disabled={executeMutation.isPending || updateMutation.isPending}>
            {executeMutation.isPending ? '执行中...' : '执行'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

