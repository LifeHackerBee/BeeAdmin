import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRecurringRules } from '../hooks/use-recurring-rules'
import { categories } from '../data/data'
import { format } from 'date-fns'
import { Calendar, Repeat, TrendingDown } from 'lucide-react'

const currencySymbols: Record<string, string> = {
  CNY: '¥',
  HKD: 'HK$',
  USD: '$',
}

function getFrequencyLabel(rule: { frequency_type: string; interval_value?: number | null; weekly_day_of_week?: number | null; monthly_day_of_month?: number | null; is_last_day_of_month?: boolean | null }): string {
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

export function RecurringExecutionsTable() {
  const { data: rules = [], isLoading, error } = useRecurringRules()

  // 过滤出有执行记录的规则（last_run_at 不为空）
  const executions = rules
    .filter((rule) => rule.last_run_at)
    .map((rule) => ({
      ruleId: rule.id,
      rule,
      executionTime: rule.last_run_at!,
      nextExecutionTime: rule.next_run_at,
      status: rule.status,
    }))
    .sort((a, b) => new Date(b.executionTime).getTime() - new Date(a.executionTime).getTime())

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>执行记录</CardTitle>
          <CardDescription>查看周期性记账规则的执行历史</CardDescription>
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
          <CardTitle>执行记录</CardTitle>
          <CardDescription>查看周期性记账规则的执行历史</CardDescription>
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

  if (executions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>执行记录</CardTitle>
          <CardDescription>查看周期性记账规则的执行历史</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <TrendingDown className='h-12 w-12 text-muted-foreground mb-4' />
            <p className='text-muted-foreground mb-2'>暂无执行记录</p>
            <p className='text-sm text-muted-foreground'>
              当周期性记账规则执行后，执行记录将显示在这里
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>执行记录</CardTitle>
        <CardDescription>查看周期性记账规则的执行历史（共 {executions.length} 条）</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>执行时间</TableHead>
                <TableHead>规则信息</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>周期</TableHead>
                <TableHead>设备</TableHead>
                <TableHead>下次执行</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => {
                const rule = execution.rule
                const category = categories.find((cat) => cat.value === rule.category)
                const categoryLabel = category?.label || rule.category || '未分类'
                const symbol = currencySymbols[rule.currency || 'CNY'] || rule.currency || 'CNY'
                const frequencyLabel = getFrequencyLabel(rule)

                return (
                  <TableRow key={`${execution.ruleId}-${execution.executionTime}`}>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Calendar className='h-3 w-3 text-muted-foreground' />
                        <span className='text-sm font-medium'>
                          {format(new Date(execution.executionTime), 'yyyy-MM-dd HH:mm')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='text-sm'>
                        <div className='font-medium'>规则 #{rule.id}</div>
                        {rule.note && (
                          <div className='text-xs text-muted-foreground mt-1'>{rule.note}</div>
                        )}
                      </div>
                    </TableCell>
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
                      {execution.nextExecutionTime && (
                        <span className='text-sm text-muted-foreground'>
                          {format(new Date(execution.nextExecutionTime), 'yyyy-MM-dd HH:mm')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={execution.status === 'active' ? 'default' : 'secondary'}>
                        {execution.status === 'active' ? '激活' : '暂停'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

