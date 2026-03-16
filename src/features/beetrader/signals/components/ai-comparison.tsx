import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { AiStrategyOutput } from '../../strategies/hooks/use-ai-strategy'

function fmtPrice(v: number): string {
  if (v >= 10_000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (v >= 100) return `$${v.toFixed(2)}`
  return `$${v.toFixed(4)}`
}

// ── 主组件 ──
interface AiStrategyPanelProps {
  coin: string
  result: AiStrategyOutput | null
  loading: boolean
}

export function AiStrategyPanel({
  coin,
  result,
  loading,
}: AiStrategyPanelProps) {
  if (!result && !loading) return null

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <Sparkles className='h-4 w-4' />
          {coin} AI 策略
          {loading && (
            <Badge variant='secondary' className='text-xs'>分析中...</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result ? (
          <SignalDetail data={result} />
        ) : (
          <div className='text-sm text-muted-foreground py-4 text-center'>
            AI 正在分析技术指标...
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── 策略详情 ──
function SignalDetail({ data }: { data: AiStrategyOutput }) {
  const isLong = data.direction === 'long'
  const isWait = data.direction === 'wait'
  const dirLabel = isLong ? '做多' : isWait ? '观望' : '做空'
  const dirColor = isLong
    ? 'text-green-500'
    : isWait
      ? 'text-yellow-500'
      : 'text-red-500'
  const DirIcon = isLong ? TrendingUp : isWait ? AlertTriangle : TrendingDown
  const confColor =
    data.confidence >= 7
      ? 'text-green-500'
      : data.confidence >= 5
        ? 'text-yellow-500'
        : 'text-red-500'

  return (
    <div className='space-y-3'>
      {/* 方向 + 信心度 */}
      <div className='flex items-center gap-2'>
        <DirIcon className={`h-4 w-4 ${dirColor}`} />
        <span className={`font-semibold ${dirColor}`}>{dirLabel}</span>
        <Badge variant='outline' className={`text-xs ${confColor}`}>
          信心 {data.confidence}/10
        </Badge>
      </div>

      {/* 价位 */}
      {!isWait && (
        <div className='grid grid-cols-2 gap-2 text-xs'>
          <div>
            <div className='text-muted-foreground flex items-center gap-1'>
              <Target className='h-3 w-3' />
              入场
            </div>
            <div className='font-mono font-medium'>
              {fmtPrice(data.entry_low)} - {fmtPrice(data.entry_high)}
            </div>
          </div>
          <div>
            <div className='text-muted-foreground flex items-center gap-1'>
              <ShieldCheck className='h-3 w-3' />
              盈亏比
            </div>
            <div className='font-mono font-medium'>{data.risk_reward_ratio.toFixed(1)}:1</div>
          </div>
          <div>
            <div className='text-green-500'>止盈</div>
            <div className='font-mono font-medium text-green-500'>{fmtPrice(data.take_profit)}</div>
          </div>
          <div>
            <div className='text-red-500'>止损</div>
            <div className='font-mono font-medium text-red-500'>{fmtPrice(data.stop_loss)}</div>
          </div>
        </div>
      )}

      {/* 关键位 */}
      <div className='text-xs space-y-1'>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground'>核心关键位</span>
          <span className='font-mono font-bold'>{fmtPrice(data.core_key_level)}</span>
        </div>
        {data.resistance_levels.length > 0 && (
          <div className='flex items-center gap-1 flex-wrap'>
            <span className='text-red-500'>压力:</span>
            {data.resistance_levels.map((lv, i) => (
              <span key={i} className='font-mono text-red-500 bg-red-50 dark:bg-red-950 px-1 rounded'>
                {fmtPrice(lv)}
              </span>
            ))}
          </div>
        )}
        {data.support_levels.length > 0 && (
          <div className='flex items-center gap-1 flex-wrap'>
            <span className='text-green-500'>支撑:</span>
            {data.support_levels.map((lv, i) => (
              <span key={i} className='font-mono text-green-500 bg-green-50 dark:bg-green-950 px-1 rounded'>
                {fmtPrice(lv)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 备注 */}
      <p className='text-xs text-muted-foreground'>{data.notes}</p>
    </div>
  )
}
