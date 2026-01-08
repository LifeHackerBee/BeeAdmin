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
import { Settings, TrendingUp, Calendar, X } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useBudgetConfig } from '../hooks/use-budget-config'
import { useYearlyBudgetConfig } from '../hooks/use-yearly-budget-config'
import { format, parseISO } from 'date-fns'
import { useExpenseCategories } from '../../expenses/hooks/use-expense-categories'
import { SelectDropdown } from '@/components/select-dropdown'
import { categoriesToOptions } from '../../expenses/utils/category-utils'

type BudgetProgressProps = {
  currentMonthTotal: number
  currentMonthByCategory: Record<string, number>
  allExpenses?: Array<{ spending_time: string | null; amount: number | null; currency: string | null; category: string | null }>
  currency?: string
}

export function BudgetProgress({
  currentMonthTotal,
  currentMonthByCategory,
  allExpenses = [],
  currency = 'CNY',
}: BudgetProgressProps) {
  const { data: categories = [] } = useExpenseCategories()
  const categoryOptions = categoriesToOptions(categories)
  const currentMonth = format(new Date(), 'yyyy-MM')
  const currentYear = format(new Date(), 'yyyy')
  const { config, updateConfig, isUpdating } = useBudgetConfig(currentMonth)
  const { config: yearlyConfig, updateConfig: updateYearlyConfig, isUpdating: isUpdatingYearly } =
    useYearlyBudgetConfig(currentYear)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [totalBudget, setTotalBudget] = useState<string>('')
  const [yearlyBudget, setYearlyBudget] = useState<string>('')
  
  // 分类预算状态
  const [categoryMonthlyBudgets, setCategoryMonthlyBudgets] = useState<Record<string, string>>({})
  const [categoryYearlyBudgets, setCategoryYearlyBudgets] = useState<Record<string, string>>({})
  const [newCategoryMonthly, setNewCategoryMonthly] = useState<{ category: string; budget: string } | null>(null)
  const [newCategoryYearly, setNewCategoryYearly] = useState<{ category: string; budget: string } | null>(null)

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

  // 计算各分类的年度支出
  const currentYearByCategory = useMemo(() => {
    const byCategory: Record<string, number> = {}
    allExpenses
      .filter((expense) => {
        if (!expense.spending_time || !expense.amount || !expense.category) return false
        try {
          const date = parseISO(expense.spending_time)
          return format(date, 'yyyy') === currentYear && (expense.currency || 'CNY') === currency
        } catch {
          return false
        }
      })
      .forEach((expense) => {
        const category = expense.category
        if (category) {
          byCategory[category] = (byCategory[category] || 0) + (expense.amount || 0)
        }
      })
    return byCategory
  }, [allExpenses, currentYear, currency])

  // 同步配置到表单状态
  useEffect(() => {
    if (config) {
      setTotalBudget(config.total_budget?.toString() || '')
      // 同步分类月度预算
      const monthlyBudgets: Record<string, string> = {}
      if (config.category_budgets) {
        Object.entries(config.category_budgets).forEach(([category, budget]) => {
          monthlyBudgets[category] = budget.toString()
        })
      }
      setCategoryMonthlyBudgets(monthlyBudgets)
    } else {
      setTotalBudget('')
      setCategoryMonthlyBudgets({})
    }
    if (yearlyConfig) {
      setYearlyBudget(yearlyConfig.yearly_budget?.toString() || '')
      // 同步分类年度预算
      const yearlyBudgets: Record<string, string> = {}
      if (yearlyConfig.category_yearly_budgets) {
        Object.entries(yearlyConfig.category_yearly_budgets).forEach(([category, budget]) => {
          yearlyBudgets[category] = budget.toString()
        })
      }
      setCategoryYearlyBudgets(yearlyBudgets)
    } else {
      setYearlyBudget('')
      setCategoryYearlyBudgets({})
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

    // 转换分类预算
    const categoryMonthlyBudgetsNum: Record<string, number> = {}
    Object.entries(categoryMonthlyBudgets).forEach(([category, budgetStr]) => {
      const budget = parseFloat(budgetStr)
      if (!isNaN(budget) && budget > 0) {
        categoryMonthlyBudgetsNum[category] = budget
      }
    })

    const categoryYearlyBudgetsNum: Record<string, number> = {}
    Object.entries(categoryYearlyBudgets).forEach(([category, budgetStr]) => {
      const budget = parseFloat(budgetStr)
      if (!isNaN(budget) && budget > 0) {
        categoryYearlyBudgetsNum[category] = budget
      }
    })

    try {
      await Promise.all([
        updateConfig({
          totalBudget: total,
          categoryBudgets: Object.keys(categoryMonthlyBudgetsNum).length > 0 ? categoryMonthlyBudgetsNum : undefined,
        }),
        updateYearlyConfig({
          yearlyBudget: yearly,
          categoryYearlyBudgets: Object.keys(categoryYearlyBudgetsNum).length > 0 ? categoryYearlyBudgetsNum : undefined,
        }),
      ])
      setIsDialogOpen(false)
    } catch (error) {
      console.error('保存预算配置失败:', error)
    }
  }

  // 添加分类月度预算
  const handleAddCategoryMonthly = () => {
    if (newCategoryMonthly?.category && newCategoryMonthly.budget) {
      const budget = parseFloat(newCategoryMonthly.budget)
      if (!isNaN(budget) && budget > 0) {
        setCategoryMonthlyBudgets({
          ...categoryMonthlyBudgets,
          [newCategoryMonthly.category]: newCategoryMonthly.budget,
        })
        setNewCategoryMonthly(null)
      }
    }
  }

  // 移除分类月度预算
  const handleRemoveCategoryMonthly = (category: string) => {
    const newBudgets = { ...categoryMonthlyBudgets }
    delete newBudgets[category]
    setCategoryMonthlyBudgets(newBudgets)
  }

  // 添加分类年度预算
  const handleAddCategoryYearly = () => {
    if (newCategoryYearly?.category && newCategoryYearly.budget) {
      const budget = parseFloat(newCategoryYearly.budget)
      if (!isNaN(budget) && budget > 0) {
        setCategoryYearlyBudgets({
          ...categoryYearlyBudgets,
          [newCategoryYearly.category]: newCategoryYearly.budget,
        })
        setNewCategoryYearly(null)
      }
    }
  }

  // 移除分类年度预算
  const handleRemoveCategoryYearly = (category: string) => {
    const newBudgets = { ...categoryYearlyBudgets }
    delete newBudgets[category]
    setCategoryYearlyBudgets(newBudgets)
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
            <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
              <DialogHeader>
                <DialogTitle>设置预算</DialogTitle>
                <DialogDescription>
                  设置 {format(new Date(), 'yyyy年MM月')} 的月度预算和 {format(new Date(), 'yyyy年')} 的年度预算
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-6 py-4'>
                {/* 总预算 */}
                <div className='space-y-4'>
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

                {/* 分类月度预算 */}
                <div className='space-y-2'>
                  <Label>分类月度预算 ({currency})</Label>
                  <div className='space-y-2'>
                    {Object.entries(categoryMonthlyBudgets).map(([category, budget]) => {
                      const categoryInfo = categories.find((c) => c.value === category)
                      const categoryLabel = categoryInfo?.label || category
                      return (
                        <div key={category} className='flex items-center gap-2'>
                          <div className='flex-1'>
                            <div className='text-sm font-medium'>{categoryLabel}</div>
                            <Input
                              type='number'
                              placeholder='预算金额'
                              value={budget}
                              onChange={(e) => {
                                setCategoryMonthlyBudgets({
                                  ...categoryMonthlyBudgets,
                                  [category]: e.target.value,
                                })
                              }}
                              className='mt-1'
                            />
                          </div>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleRemoveCategoryMonthly(category)}
                          >
                            <X className='h-4 w-4' />
                          </Button>
                        </div>
                      )
                    })}
                    {newCategoryMonthly ? (
                      <div className='flex items-end gap-2 p-2 border rounded-md'>
                        <div className='flex-1 space-y-2'>
                          <SelectDropdown
                            items={categoryOptions.filter(
                              (opt) => !categoryMonthlyBudgets[opt.value]
                            )}
                            defaultValue={newCategoryMonthly.category}
                            onValueChange={(value) =>
                              setNewCategoryMonthly({ ...newCategoryMonthly, category: value || '' })
                            }
                            placeholder='选择分类'
                            isControlled={true}
                          />
                          <Input
                            type='number'
                            placeholder='预算金额'
                            value={newCategoryMonthly.budget}
                            onChange={(e) =>
                              setNewCategoryMonthly({ ...newCategoryMonthly, budget: e.target.value })
                            }
                          />
                        </div>
                        <Button variant='outline' size='sm' onClick={handleAddCategoryMonthly}>
                          添加
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => setNewCategoryMonthly(null)}
                        >
                          取消
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setNewCategoryMonthly({ category: '', budget: '' })}
                        className='w-full'
                      >
                        + 添加分类月度预算
                      </Button>
                    )}
                  </div>
                </div>

                {/* 分类年度预算 */}
                <div className='space-y-2'>
                  <Label>分类年度预算 ({currency})</Label>
                  <div className='space-y-2'>
                    {Object.entries(categoryYearlyBudgets).map(([category, budget]) => {
                      const categoryInfo = categories.find((c) => c.value === category)
                      const categoryLabel = categoryInfo?.label || category
                      return (
                        <div key={category} className='flex items-center gap-2'>
                          <div className='flex-1'>
                            <div className='text-sm font-medium'>{categoryLabel}</div>
                            <Input
                              type='number'
                              placeholder='预算金额'
                              value={budget}
                              onChange={(e) => {
                                setCategoryYearlyBudgets({
                                  ...categoryYearlyBudgets,
                                  [category]: e.target.value,
                                })
                              }}
                              className='mt-1'
                            />
                          </div>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleRemoveCategoryYearly(category)}
                          >
                            <X className='h-4 w-4' />
                          </Button>
                        </div>
                      )
                    })}
                    {newCategoryYearly ? (
                      <div className='flex items-end gap-2 p-2 border rounded-md'>
                        <div className='flex-1 space-y-2'>
                          <SelectDropdown
                            items={categoryOptions.filter(
                              (opt) => !categoryYearlyBudgets[opt.value]
                            )}
                            defaultValue={newCategoryYearly.category}
                            onValueChange={(value) =>
                              setNewCategoryYearly({ ...newCategoryYearly, category: value || '' })
                            }
                            placeholder='选择分类'
                            isControlled={true}
                          />
                          <Input
                            type='number'
                            placeholder='预算金额'
                            value={newCategoryYearly.budget}
                            onChange={(e) =>
                              setNewCategoryYearly({ ...newCategoryYearly, budget: e.target.value })
                            }
                          />
                        </div>
                        <Button variant='outline' size='sm' onClick={handleAddCategoryYearly}>
                          添加
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => setNewCategoryYearly(null)}
                        >
                          取消
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setNewCategoryYearly({ category: '', budget: '' })}
                        className='w-full'
                      >
                        + 添加分类年度预算
                      </Button>
                    )}
                  </div>
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

        {/* 分类月度预算进度 */}
        {config?.category_budgets && Object.keys(config.category_budgets).length > 0 && (
          <div className='space-y-4'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <TrendingUp className='h-4 w-4' />
              <span>分类月度预算</span>
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

        {/* 分类年度预算进度 */}
        {yearlyConfig?.category_yearly_budgets && Object.keys(yearlyConfig.category_yearly_budgets).length > 0 && (
          <div className='space-y-4'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <TrendingUp className='h-4 w-4' />
              <span>分类年度预算</span>
            </div>
            <div className='space-y-3'>
              {Object.entries(yearlyConfig.category_yearly_budgets).map(([category, budget]) => {
                const spent = currentYearByCategory[category] || 0
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
                        {isOver && ` (超支 ${((progress - 100) * budget / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(progress, 100)}
                      className={isOver ? 'h-2' : 'h-2'}
                    />
                    <div className='flex items-center justify-between text-xs text-muted-foreground'>
                      <span>使用率: {progress.toFixed(1)}%</span>
                      {budget > spent && (
                        <span>
                          剩余: {symbol}
                          {(budget - spent).toLocaleString('zh-CN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </div>
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

