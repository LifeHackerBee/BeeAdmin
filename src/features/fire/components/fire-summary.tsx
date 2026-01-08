import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FireSummary, FireParams } from '../types'
import { formatCurrency, formatPercent } from '../utils/calculations'

type FireSummaryProps = {
  summary: FireSummary
  params: FireParams
}

export function FireSummary({ summary, params }: FireSummaryProps) {
  const fireAgeText = isFinite(summary.fireAgeSim)
    ? `${Math.floor(summary.fireAgeSim)} 岁 ${Math.round((summary.fireAgeSim % 1) * 12)} 个月`
    : '无法达到'

  const canReachTarget = summary.fireAgeSim <= params.targetRetirementAge

  return (
    <Card>
      <CardHeader>
        <CardTitle>摘要与结果</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div
          className={`rounded-lg p-4 text-center ${
            canReachTarget ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}
        >
          <p className='text-sm text-muted-foreground'>预计达成 FIRE 年龄 (模拟)</p>
          <p
            className={`my-2 text-4xl font-bold ${
              canReachTarget ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {fireAgeText}
          </p>
          <p
            className={`text-sm font-semibold ${
              canReachTarget ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {canReachTarget
              ? `可以在 ${params.targetRetirementAge} 岁目标前达成！`
              : `无法在 ${params.targetRetirementAge} 岁目标前达成。`}
          </p>
        </div>

        <div className='space-y-3'>
          <div className='flex items-center justify-between border-b pb-2'>
            <span className='text-sm text-muted-foreground'>FIRE 目标总资产</span>
            <span className='text-lg font-semibold'>
              {formatCurrency(summary.fireTargetAssets)}
            </span>
          </div>
          <div className='flex items-center justify-between border-b pb-2'>
            <span className='text-sm text-muted-foreground'>当前储蓄率</span>
            <span className='text-lg font-semibold'>
              {formatPercent(summary.currentSavingsRate)}
            </span>
          </div>
          <div className='flex items-center justify-between border-b pb-2'>
            <span className='text-sm text-muted-foreground'>为达目标每月需投资</span>
            <span className='text-lg font-semibold'>
              {formatCurrency(summary.investmentNeededForTarget)}
            </span>
          </div>
        </div>

        <div className='border-t pt-4'>
          <h3 className='mb-2 text-lg font-semibold text-sky-400'>进阶指标</h3>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>实际年化收益率</span>
              <span className='font-semibold'>
                {formatPercent(summary.realAnnualReturn)}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>调整后退休年净开支</span>
              <span className='font-semibold'>
                {formatCurrency(summary.adjustedNetExpenses)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
