import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import type { AiStrategyOutput } from '../hooks/use-ai-strategy'

const DIRECTION_CONFIG = {
  long: { label: '做多', color: 'bg-green-600 text-white', arrow: '▲' },
  short: { label: '做空', color: 'bg-red-600 text-white', arrow: '▼' },
  wait: { label: '观望', color: 'bg-slate-500 text-white', arrow: '—' },
} as const

interface Props {
  result: AiStrategyOutput | null
  loading: boolean
  error: Error | null
  onGenerate: () => void
  hasData: boolean
  coin: string
}

export function AiStrategyCard({
  result,
  loading,
  error,
  onGenerate,
  hasData,
  coin,
}: Props) {
  const dirConfig = result
    ? DIRECTION_CONFIG[result.direction]
    : null

  return (
    <Card className='border-2 border-dashed border-purple-300 dark:border-purple-700'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base flex items-center gap-2'>
            <Sparkles className='h-4 w-4 text-purple-500' />
            AI 策略判断
          </CardTitle>
          <Button
            size='sm'
            variant='outline'
            onClick={onGenerate}
            disabled={loading || !hasData}
            className='gap-1'
          >
            {loading ? (
              <>
                <RefreshCw className='h-3 w-3 animate-spin' />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className='h-3 w-3' />
                {result ? '重新生成' : 'AI 生成策略'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant='destructive' className='mb-3'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {!result && !loading && !error && (
          <p className='text-sm text-muted-foreground py-4 text-center'>
            {hasData
              ? '点击「AI 生成策略」让 AI 基于当前技术指标生成交易建议'
              : '请先分析币种数据，再生成 AI 策略'}
          </p>
        )}

        {loading && !result && (
          <div className='flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground'>
            <RefreshCw className='h-4 w-4 animate-spin' />
            AI 正在分析 {coin} 的多周期技术指标...
          </div>
        )}

        {result && dirConfig && (
          <div className='space-y-4'>
            {/* 主策略 */}
            <div className='flex items-start gap-4'>
              {/* 方向大标签 */}
              <div
                className={`flex flex-col items-center justify-center rounded-lg px-5 py-3 ${dirConfig.color}`}
              >
                <span className='text-2xl font-bold'>{dirConfig.arrow}</span>
                <span className='text-sm font-semibold'>
                  {dirConfig.label}
                </span>
              </div>

              {/* 价格详情 */}
              {result.direction !== 'wait' ? (
                <div className='flex-1 space-y-2'>
                  <div className='grid grid-cols-2 gap-x-6 gap-y-1 text-sm'>
                    <div>
                      <span className='text-muted-foreground'>建仓区间</span>
                      <div className='font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400'>
                        ${result.entry_low.toLocaleString()} - $
                        {result.entry_high.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>止损</span>
                      <div className='font-mono tabular-nums font-semibold text-red-600 dark:text-red-400'>
                        ${result.stop_loss.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>止盈</span>
                      <div className='font-mono tabular-nums font-semibold text-green-600 dark:text-green-400'>
                        ${result.take_profit.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>盈亏比</span>
                      <div className='font-mono tabular-nums font-semibold'>
                        {result.risk_reward_ratio.toFixed(1)}:1
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='flex-1 flex items-center'>
                  <p className='text-sm text-muted-foreground'>
                    当前无明确交易机会，建议观望等待。
                  </p>
                </div>
              )}
            </div>

            {/* 核心关键位 */}
            <div className='rounded-lg bg-muted/50 p-3 space-y-2'>
              <div className='flex items-center gap-2'>
                <span className='text-xs text-muted-foreground'>核心关键位</span>
                <span className='font-mono tabular-nums font-bold text-base'>
                  ${result.core_key_level.toLocaleString()}
                </span>
              </div>
              <div className='grid grid-cols-2 gap-3 text-xs'>
                <div>
                  <span className='text-red-500 font-medium'>上方压力位</span>
                  <div className='flex flex-wrap gap-1.5 mt-1'>
                    {result.resistance_levels.map((lv, i) => (
                      <span key={i} className='font-mono tabular-nums text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-1.5 py-0.5 rounded'>
                        ${lv.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className='text-green-500 font-medium'>下方支撑位</span>
                  <div className='flex flex-wrap gap-1.5 mt-1'>
                    {result.support_levels.map((lv, i) => (
                      <span key={i} className='font-mono tabular-nums text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-1.5 py-0.5 rounded'>
                        ${lv.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 信心度 + 备注 */}
            <div className='flex items-center gap-2 flex-wrap'>
              <Badge
                variant={result.confidence >= 7 ? 'default' : 'secondary'}
                className='tabular-nums'
              >
                信心度 {result.confidence}/10
              </Badge>
              {result.risk_reward_ratio < 1.5 &&
                result.direction !== 'wait' && (
                  <Badge variant='destructive' className='text-xs'>
                    盈亏比不足 1.5
                  </Badge>
                )}
            </div>

            {/* 备注 */}
            {result.notes && (
              <p className='text-sm text-muted-foreground border-l-2 border-purple-300 dark:border-purple-700 pl-3'>
                {result.notes}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
