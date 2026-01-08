import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Settings, TrendingUp, Calendar } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useBudgetConfig } from '../hooks/use-budget-config'
import { useYearlyBudgetConfig } from '../hooks/use-yearly-budget-config'
import { format, parseISO } from 'date-fns'
import { useExpenseCategories } from '../../expenses/hooks/use-expense-categories'

type BudgetProgressProps = {
  currentMonthTotal: number
  currentMonthByCategory: Record<string, number>
  allExpenses?: Array<{ spending_time: string | null; amount: number | null; currency: string | null }>
  currency?: string
}

export function BudgetProgress({
  currentMonthTotal,
  currentMonthByCategory,
  allExpenses = [],
  currency = 'CNY',
}: BudgetProgressProps) {
  const { data: categories = [] } = useExpenseCategories()
  const currentMonth = format(new Date(), 'yyyy-MM')
  const currentYear = format(new Date(), 'yyyy')
  const { config, updateConfig, isUpdating } = useBudgetConfig(currentMonth)
  const { config: yearlyConfig, updateConfig: updateYearlyConfig, isUpdating: isUpdatingYearly } =
    useYearlyBudgetConfig(currentYear)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [totalBudget, setTotalBudget] = useState<string>('')
  const [yearlyBudget, setYearlyBudget] = useState<string>('')

  // 计算年度支出总额
  const currentYearTotal = useMemo(() => {
    return allExpenses
      .filter((expense) => {
        if (!expense.spending_time || !expense.amount) return false
        try {
          const date = parseISO(expense.spending_time)
          return format(date, 'yyyy') === currentYear && (expense.currency || 'CNY') === currency
        } catch {
          return false
        }
      })
      .reduce((sum, exp) => sum + (exp.amount || 0), 0)
  }, [allExpenses, currentYear, currency])

  // 同步配置到表单状态
  useEffect(() => {
    if (config) {
      setTotalBudget(config.total_budget?.toString() || '')
    } else {
      setTotalBudget('')
    }
    if (yearlyConfig) {
      setYearlyBudget(yearlyConfig.yearly_budget?.toString() || '')
    } else {
      setYearlyBudget('')
    }
  }, [config, yearlyConfig])

  const currencySymbols: Record<string, string> = {
    CNY: '¥',
    HKD: 'HK$',
    USD: '$',
  }
  const symbol = currencySymbols[currency] || currency

  // 计算月度预算进度
  const totalBudgetValue = config?.total_budget || 0
  const totalProgress = totalBudgetValue > 0 ? (currentMonthTotal / totalBudgetValue) * 100 : 0
  const isOverBudget = totalProgress > 100

  // 计算年度预算进度
  const yearlyBudgetValue = yearlyConfig?.yearly_budget || 0
  const yearlyProgress = yearlyBudgetValue > 0 ? (currentYearTotal / yearlyBudgetValue) * 100 : 0
  const isOverYearlyBudget = yearlyProgress > 100

  // 处理保存
  const handleSave = async () => {
    const total = totalBudget ? parseFloat(totalBudget) : null
    const yearly = yearlyBudget ? parseFloat(yearlyBudget) : null

    try {
      await Promise.all([
        updateConfig({
          totalBudget: total,
        }),
        updateYearlyConfig({
          yearlyBudget: yearly,
        }),
      ])
      setIsDialogOpen(false)
    } catch (error) {
      console.error('保存预算配置失败:', error)
    }
  }

  // 当对话框打开时，同步最新配置
  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle>预算进度</CardTitle>
            <CardDescription>{format(new Date(), 'yyyy年MM月')} 预算使用情况</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button variant='outline' size='sm'>
                <Settings className='h-4 w-4 mr-2' />
                设置预算
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-md'>
              <DialogHeader>
                <DialogTitle>设置预算</DialogTitle>
                <DialogDescription>
                  设置 {format(new Date(), 'yyyy年MM月')} 的月度预算和 {format(new Date(), 'yyyy年')} 的年度预算
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='total-budget'>月度总预算 ({currency})</Label>
                  <Input
                    id='total-budget'
                    type='number'
                    placeholder='请输入月度总预算'
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='yearly-budget'>年度总预算 ({currency})</Label>
                  <Input
                    id='yearly-budget'
                    type='number'
                    placeholder='请输入年度总预算'
                    value={yearlyBudget}
                    onChange={(e) => setYearlyBudget(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant='outline' onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSave} disabled={isUpdating || isUpdatingYearly}>
                  {isUpdating || isUpdatingYearly ? '保存中...' : '保存'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* 月度预算进度 */}
        {totalBudgetValue > 0 && (
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <Calendar className='h-4 w-4' />
              <span>月度预算</span>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>{format(new Date(), 'yyyy年MM月')}</span>
              <span className={isOverBudget ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                {symbol}
                {currentMonthTotal.toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                / {symbol}
                {totalBudgetValue.toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                {isOverBudget && ` (超支 ${((totalProgress - 100) * totalBudgetValue / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
              </span>
            </div>
            <Progress
              value={Math.min(totalProgress, 100)}
              className={isOverBudget ? 'h-3' : 'h-3'}
            />
            <div className='flex items-center justify-between text-xs text-muted-foreground'>
              <span>使用率: {totalProgress.toFixed(1)}%</span>
              {totalBudgetValue > currentMonthTotal && (
                <span>
                  剩余: {symbol}
                  {(totalBudgetValue - currentMonthTotal).toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 年度预算进度 */}
        {yearlyBudgetValue > 0 && (
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <TrendingUp className='h-4 w-4' />
              <span>年度预算</span>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>{format(new Date(), 'yyyy年')}</span>
              <span className={isOverYearlyBudget ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                {symbol}
                {currentYearTotal.toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                / {symbol}
                {yearlyBudgetValue.toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                {isOverYearlyBudget && ` (超支 ${((yearlyProgress - 100) * yearlyBudgetValue / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
              </span>
            </div>
            <Progress
              value={Math.min(yearlyProgress, 100)}
              className={isOverYearlyBudget ? 'h-3' : 'h-3'}
            />
            <div className='flex items-center justify-between text-xs text-muted-foreground'>
              <span>使用率: {yearlyProgress.toFixed(1)}%</span>
              {yearlyBudgetValue > currentYearTotal && (
                <span>
                  剩余: {symbol}
                  {(yearlyBudgetValue - currentYearTotal).toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 分类预算进度 */}
        {config?.category_budgets && Object.keys(config.category_budgets).length > 0 && (
          <div className='space-y-4'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <TrendingUp className='h-4 w-4' />
              <span>分类预算</span>
            </div>
            <div className='space-y-3'>
              {Object.entries(config.category_budgets).map(([category, budget]) => {
                const spent = currentMonthByCategory[category] || 0
                const progress = budget > 0 ? (spent / budget) * 100 : 0
                const isOver = progress > 100
                const categoryLabel = categories.find((c) => c.value === category)?.label || category

                return (
                  <div key={category} className='space-y-2'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='font-medium'>{categoryLabel}</span>
                      <span className={isOver ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                        {symbol}
                        {spent.toLocaleString('zh-CN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        / {symbol}
                        {budget.toLocaleString('zh-CN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(progress, 100)}
                      className={isOver ? 'h-2' : 'h-2'}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 如果没有设置预算，显示提示 */}
        {!totalBudgetValue && !yearlyBudgetValue && (!config?.category_budgets || Object.keys(config.category_budgets).length === 0) && (
          <div className='text-center py-8 text-muted-foreground'>
            <p className='text-sm'>尚未设置预算</p>
            <p className='text-xs mt-1'>点击右上角"设置预算"按钮来配置月度预算和年度预算</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

