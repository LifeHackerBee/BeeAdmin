import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Shield } from 'lucide-react'
import type { Strategy } from '../types'

const BIAS_CONFIG: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary'; label: string }> = {
  '强势看多': { variant: 'default', label: '强势看多' },
  '震荡偏多': { variant: 'default', label: '震荡偏多' },
  '观望': { variant: 'secondary', label: '观望' },
  '震荡偏空': { variant: 'destructive', label: '震荡偏空' },
  '强势看空': { variant: 'destructive', label: '强势看空' },
}

interface Props {
  data: Strategy
  currentPrice: number
}

export function StrategyRecommendation({ data, currentPrice }: Props) {
  const biasConfig = BIAS_CONFIG[data.bias] || { variant: 'outline' as const, label: data.bias }
  const levels = data.key_levels
  const hasEntryZone = levels.entry_zone[0] > 0 && levels.entry_zone[1] > 0

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base'>策略建议</CardTitle>
          <div className='flex items-center gap-2'>
            <Badge variant={biasConfig.variant}>{biasConfig.label}</Badge>
            <Badge variant='outline' className='tabular-nums'>
              共振 {data.resonance_score}/10
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        {/* 策略描述 */}
        <div className='flex items-center gap-4 text-sm'>
          <div>
            <span className='text-muted-foreground'>入场策略: </span>
            <span className='font-medium'>{data.entry_strategy}</span>
          </div>
        </div>

        {/* 关键价位 */}
        {hasEntryZone && (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            <PriceLevel
              label='入场区间'
              value={`$${levels.entry_zone[0].toLocaleString()} - $${levels.entry_zone[1].toLocaleString()}`}
              type='entry'
              currentPrice={currentPrice}
            />
            <PriceLevel
              label='止损'
              value={`$${levels.stop_loss.toLocaleString()}`}
              type='stop'
              currentPrice={currentPrice}
              price={levels.stop_loss}
            />
            <PriceLevel
              label='止盈 1'
              value={`$${levels.take_profit_1.toLocaleString()}`}
              type='profit'
              currentPrice={currentPrice}
              price={levels.take_profit_1}
            />
            <PriceLevel
              label='止盈 2'
              value={`$${levels.take_profit_2.toLocaleString()}`}
              type='profit'
              currentPrice={currentPrice}
              price={levels.take_profit_2}
            />
          </div>
        )}

        {/* 共振指标明细 */}
        <div className='flex flex-wrap gap-1'>
          {data.resonance_details.map((d, i) => (
            <Badge
              key={i}
              variant='outline'
              className={`text-xs ${
                d.signal === 'bullish' || d.signal === 'confirmed'
                  ? 'text-green-600 border-green-300 dark:text-green-400 dark:border-green-700'
                  : d.signal === 'bearish' || d.signal === 'warning'
                    ? 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-700'
                    : 'text-slate-500 border-slate-300 dark:text-slate-400 dark:border-slate-600'
              }`}
            >
              {d.indicator}: {d.signal === 'bullish' ? '多' : d.signal === 'bearish' ? '空' : d.signal === 'confirmed' ? '确认' : d.signal === 'warning' ? '警告' : '中性'}
            </Badge>
          ))}
        </div>

        {/* 风险提醒 */}
        {data.warnings.length > 0 && (
          <div className='space-y-1'>
            {data.warnings.map((w, i) => (
              <div
                key={i}
                className='flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400'
              >
                <AlertTriangle className='h-3 w-3 mt-0.5 shrink-0' />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* 防错提醒 */}
        {data.error_prevention && (
          <Alert className='border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30'>
            <Shield className='h-4 w-4 text-orange-600 dark:text-orange-400' />
            <AlertDescription className='text-xs text-orange-700 dark:text-orange-400'>
              {data.error_prevention}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function PriceLevel({
  label,
  value,
  type,
  currentPrice,
  price,
}: {
  label: string
  value: string
  type: 'entry' | 'stop' | 'profit'
  currentPrice: number
  price?: number
}) {
  const colorClass =
    type === 'stop'
      ? 'text-red-600 dark:text-red-400'
      : type === 'profit'
        ? 'text-green-600 dark:text-green-400'
        : 'text-blue-600 dark:text-blue-400'

  const distancePct =
    price && currentPrice > 0
      ? (((price - currentPrice) / currentPrice) * 100).toFixed(2)
      : null

  return (
    <div className='rounded-md border p-2'>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className={`text-sm font-medium tabular-nums ${colorClass}`}>
        {value}
      </div>
      {distancePct && (
        <div className='text-xs text-muted-foreground tabular-nums'>
          {Number(distancePct) > 0 ? '+' : ''}
          {distancePct}%
        </div>
      )}
    </div>
  )
}
