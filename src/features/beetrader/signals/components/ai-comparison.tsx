import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles, Globe, Flame, Target, Swords,
  FileText, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, AlertTriangle,
} from 'lucide-react'
import type { AiStrategyOutput, AiStrategyResult, AiTradingPlan } from '../../strategies/hooks/use-ai-strategy'

function fmtPrice(v: number): string {
  if (v >= 10_000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (v >= 100) return `$${v.toFixed(2)}`
  return `$${v.toFixed(4)}`
}

// ── AI Signal JSON 渲染视图 ──

function SignalJsonView({ content }: { content: string }) {
  let signal: Record<string, unknown>
  try {
    signal = JSON.parse(content)
  } catch {
    return (
      <pre className='text-xs whitespace-pre-wrap text-muted-foreground bg-muted/50 rounded p-3 max-h-96 overflow-y-auto'>
        {content}
      </pre>
    )
  }

  // 检测 _raw 中的结构化格式
  const raw = signal._raw as Record<string, unknown> | undefined
  if (raw?.macro_context && (raw?.trading_plan || raw?.tactical_execution)) {
    return <StructuredView data={raw as unknown as AiStrategyResult} />
  }

  // 检测顶层就是结构化格式
  if (signal.macro_context && (signal.trading_plan || signal.tactical_execution)) {
    return <StructuredView data={signal as unknown as AiStrategyResult} />
  }

  // 简单格式
  const direction: string = String(signal.direction ?? '')
  const entryPrice: number | null = typeof signal.entry_price === 'number' ? signal.entry_price : null
  const takeProfit: number | null = typeof signal.take_profit === 'number' ? signal.take_profit : null
  const stopLoss: number | null = typeof signal.stop_loss === 'number' ? signal.stop_loss : null
  const reason: string = String(signal.reason ?? '')

  const dirColor = direction === 'long' ? 'bg-green-600 text-white'
    : direction === 'short' ? 'bg-red-600 text-white'
    : direction === 'close' ? 'bg-orange-500 text-white'
    : 'bg-slate-500 text-white'

  const DirIcon = direction === 'long' ? TrendingUp
    : direction === 'short' ? TrendingDown : Minus

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-3'>
        <Badge className={`text-sm px-3 py-1 gap-1.5 ${dirColor}`}>
          <DirIcon className='h-4 w-4' />
          {direction || 'wait'}
        </Badge>
      </div>

      <div className='rounded-lg border p-3'>
        <div className='flex items-center gap-1.5 mb-2'>
          <Target className='h-4 w-4 text-blue-500' />
          <span className='text-xs font-medium text-muted-foreground'>价位信息</span>
        </div>
        <div className='grid grid-cols-3 gap-3'>
          {entryPrice !== null && (
            <div>
              <span className='text-[10px] text-muted-foreground'>入场价</span>
              <p className='font-mono font-bold text-sm'>{fmtPrice(entryPrice)}</p>
            </div>
          )}
          {takeProfit !== null && (
            <div>
              <span className='text-[10px] text-green-500'>止盈</span>
              <p className='font-mono font-bold text-sm text-green-600'>{fmtPrice(takeProfit)}</p>
            </div>
          )}
          {stopLoss !== null && (
            <div>
              <span className='text-[10px] text-red-500'>止损</span>
              <p className='font-mono font-bold text-sm text-red-600'>{fmtPrice(stopLoss)}</p>
            </div>
          )}
        </div>
      </div>

      {reason && (
        <div className='rounded-lg border p-3'>
          <div className='flex items-center gap-1.5 mb-1'>
            <Flame className='h-4 w-4 text-yellow-500' />
            <span className='text-xs font-medium text-muted-foreground'>分析理由</span>
          </div>
          <p className='text-xs leading-relaxed'>{reason}</p>
        </div>
      )}
    </div>
  )
}

// ── 单个方向计划卡片 ──

function PlanCard({ plan, direction }: { plan: AiTradingPlan; direction: 'long' | 'short' }) {
  if (!plan.enabled) return null

  const isLong = direction === 'long'
  const color = isLong ? 'green' : 'red'

  return (
    <div className={`rounded-lg border border-${color}-500/20 bg-${color}-500/5 p-3 space-y-2`}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1.5'>
          {isLong ? <TrendingUp className='h-4 w-4 text-green-500' /> : <TrendingDown className='h-4 w-4 text-red-500' />}
          <span className={`text-xs font-semibold text-${color}-600 dark:text-${color}-400`}>
            {isLong ? '做多计划' : '做空计划'}
          </span>
        </div>
        <Badge variant='outline' className='text-[10px] font-mono'>
          区间 {plan.entry_zone}
        </Badge>
      </div>

      <p className='text-xs text-muted-foreground leading-relaxed'>{plan.entry_strategy}</p>

      <div className='grid grid-cols-3 gap-2 text-xs'>
        <div className='rounded bg-muted/50 p-1.5'>
          <div className='text-red-500 text-[10px]'>止损</div>
          <div className='font-mono font-semibold text-red-600 dark:text-red-400'>
            {plan.stop_loss ? fmtPrice(plan.stop_loss) : '-'}
          </div>
        </div>
        <div className='rounded bg-muted/50 p-1.5'>
          <div className='text-green-500 text-[10px]'>止盈 T1</div>
          <div className='font-mono font-semibold text-green-600 dark:text-green-400'>
            {plan.take_profit_1 ? fmtPrice(plan.take_profit_1) : '-'}
          </div>
        </div>
        <div className='rounded bg-muted/50 p-1.5'>
          <div className='text-green-500 text-[10px]'>止盈 T2</div>
          <div className='font-mono font-semibold text-green-600 dark:text-green-400'>
            {plan.take_profit_2 ? fmtPrice(plan.take_profit_2) : '-'}
          </div>
        </div>
      </div>

      {plan.stop_loss_trigger && (
        <div className='flex items-start gap-1 text-[10px] text-red-500'>
          <AlertTriangle className='h-3 w-3 mt-0.5 shrink-0' />
          <span>{plan.stop_loss_trigger}</span>
        </div>
      )}
    </div>
  )
}

// ── 结构化视图 ──

function StructuredView({ data }: { data: AiStrategyResult }) {
  const mc = data.macro_context
  const is = data.intraday_sentiment
  const lr = data.levels_radar

  // 支持新旧格式
  const tp = data.trading_plan
  const te = data.tactical_execution

  const dirColor = mc.direction.includes('上涨') || mc.direction.includes('反弹')
    ? 'text-green-600 dark:text-green-400'
    : mc.direction.includes('下跌')
      ? 'text-red-600 dark:text-red-400'
      : 'text-yellow-600 dark:text-yellow-400'

  const momentumIcon = is.momentum_rating.includes('Bull') ? TrendingUp
    : is.momentum_rating.includes('Bear') ? TrendingDown : Minus
  const MomentumIcon = momentumIcon

  // 判断 mode 颜色
  const modeColor = tp
    ? tp.mode.includes('做多') ? 'bg-green-600 text-white'
      : tp.mode.includes('做空') ? 'bg-red-600 text-white'
        : tp.mode.includes('双吃') ? 'bg-purple-600 text-white'
          : 'bg-slate-500 text-white'
    : te
      ? te.action.includes('做多') ? 'bg-green-600 text-white'
        : te.action.includes('做空') ? 'bg-red-600 text-white'
          : 'bg-slate-500 text-white'
      : 'bg-slate-500 text-white'

  const modeLabel = tp?.mode ?? te?.action ?? '观望'

  return (
    <div className='space-y-3'>
      {/* Row 1: 大局观 + 日内情绪 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
        <div className='rounded-lg border p-3 space-y-2'>
          <div className='flex items-center gap-1.5'>
            <Globe className='h-4 w-4 text-blue-500' />
            <span className='text-xs font-medium text-muted-foreground'>战略大局观</span>
          </div>
          <Badge variant='outline' className={`text-sm font-semibold ${dirColor}`}>
            {mc.direction}
          </Badge>
          <div className='text-xs space-y-1'>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground'>核心关键位</span>
              <span className='font-mono font-bold text-sm'>{fmtPrice(mc.core_key_level.price)}</span>
            </div>
            <p className='text-muted-foreground'>{mc.core_key_level.strategic_meaning}</p>
          </div>
        </div>

        <div className='rounded-lg border p-3 space-y-2'>
          <div className='flex items-center gap-1.5'>
            <Flame className='h-4 w-4 text-orange-500' />
            <span className='text-xs font-medium text-muted-foreground'>日内情绪面</span>
          </div>
          <div className='flex items-center gap-2 flex-wrap'>
            <div className='flex items-center gap-1'>
              <MomentumIcon className={`h-4 w-4 ${is.momentum_rating.includes('Bull') ? 'text-green-500' : is.momentum_rating.includes('Bear') ? 'text-red-500' : 'text-yellow-500'}`} />
              <span className='text-sm font-semibold'>{is.momentum_rating}</span>
            </div>
            <Badge variant='outline' className='text-xs tabular-nums'>
              趋势 {is.trend_score}
            </Badge>
          </div>
          <div className='text-xs space-y-1'>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground'>多空分界</span>
              <span className='font-mono font-medium'>{fmtPrice(is.bull_bear_line_price)}</span>
            </div>
            {is.contradiction_note && (
              <div className='flex items-start gap-1 text-yellow-600 dark:text-yellow-400'>
                <AlertTriangle className='h-3 w-3 mt-0.5 shrink-0' />
                <span>{is.contradiction_note}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: 攻防阵地 */}
      <div className='rounded-lg border p-3 space-y-2'>
        <div className='flex items-center gap-1.5'>
          <Target className='h-4 w-4 text-purple-500' />
          <span className='text-xs font-medium text-muted-foreground'>攻防阵地</span>
        </div>
        <div className='grid grid-cols-2 gap-3 text-xs'>
          <div className='space-y-2'>
            <span className='text-red-500 font-medium'>上方压力</span>
            {Object.entries(lr.resistances).map(([key, lv]) => (
              <div key={key} className='rounded bg-red-50 dark:bg-red-950/20 px-2.5 py-1.5'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono font-bold text-sm text-red-600 dark:text-red-400'>{fmtPrice(lv.price)}</span>
                  <span className='text-[10px] text-muted-foreground/60'>{key.replace('_', ' ')}</span>
                </div>
                <p className='text-[11px] text-muted-foreground mt-0.5 leading-relaxed'>{lv.reason}</p>
              </div>
            ))}
          </div>
          <div className='space-y-2'>
            <span className='text-green-500 font-medium'>下方支撑</span>
            {Object.entries(lr.supports).map(([key, lv]) => (
              <div key={key} className='rounded bg-green-50 dark:bg-green-950/20 px-2.5 py-1.5'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono font-bold text-sm text-green-600 dark:text-green-400'>{fmtPrice(lv.price)}</span>
                  <span className='text-[10px] text-muted-foreground/60'>{key.replace('_', ' ')}</span>
                </div>
                <p className='text-[11px] text-muted-foreground mt-0.5 leading-relaxed'>{lv.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: 交易计划 */}
      <div className='rounded-lg border p-3 space-y-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-1.5'>
            <Swords className='h-4 w-4 text-green-500' />
            <span className='text-xs font-medium text-muted-foreground'>交易计划</span>
          </div>
          <div className='flex items-center gap-2'>
            {tp?.primary && tp.primary !== 'none' && (
              <Badge variant='outline' className='text-[10px]'>
                优先 {tp.primary === 'long' ? '做多' : '做空'}
              </Badge>
            )}
            <Badge className={`text-sm px-3 py-0.5 ${modeColor}`}>
              {modeLabel}
            </Badge>
          </div>
        </div>

        {tp ? (
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <PlanCard plan={tp.long_plan} direction='long' />
              <PlanCard plan={tp.short_plan} direction='short' />
            </div>
            {tp.invalidation && (
              <div className='flex items-start gap-1.5 text-xs text-yellow-600 dark:text-yellow-400'>
                <AlertTriangle className='h-3.5 w-3.5 mt-0.5 shrink-0' />
                <span>{tp.invalidation}</span>
              </div>
            )}
          </>
        ) : te ? (
          /* 旧格式兼容 */
          <div className='grid grid-cols-2 md:grid-cols-4 gap-2 text-xs'>
            <div className='rounded bg-muted/50 p-2'>
              <div className='text-muted-foreground mb-0.5'>入场区间</div>
              <div className='font-mono font-semibold text-blue-600 dark:text-blue-400'>{te.entry_zone.price_range}</div>
              <div className='text-[10px] text-muted-foreground mt-0.5'>{te.entry_zone.strategy}</div>
            </div>
            <div className='rounded bg-muted/50 p-2'>
              <div className='text-red-500 mb-0.5'>止损</div>
              <div className='font-mono font-semibold text-red-600 dark:text-red-400'>{fmtPrice(te.stop_loss.price)}</div>
            </div>
            <div className='rounded bg-muted/50 p-2'>
              <div className='text-green-500 mb-0.5'>止盈 T1</div>
              <div className='font-mono font-semibold text-green-600 dark:text-green-400'>{fmtPrice(te.take_profit.target_1_price)}</div>
            </div>
            <div className='rounded bg-muted/50 p-2'>
              <div className='text-green-500 mb-0.5'>止盈 T2</div>
              <div className='font-mono font-semibold text-green-600 dark:text-green-400'>{fmtPrice(te.take_profit.target_2_price)}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
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
  const [showRaw, setShowRaw] = useState(false)

  if (!result && !loading) return null

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm flex items-center gap-2'>
            <Sparkles className='h-4 w-4' />
            {coin} AI 策略
            {loading && (
              <Badge variant='secondary' className='text-xs'>分析中...</Badge>
            )}
          </CardTitle>
          {result?.content && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs gap-1 text-muted-foreground'
              onClick={() => setShowRaw(!showRaw)}
            >
              <FileText className='h-3.5 w-3.5' />
              {showRaw ? '收起' : 'Raw'}
              {showRaw ? <ChevronUp className='h-3 w-3' /> : <ChevronDown className='h-3 w-3' />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className='space-y-3'>
            {result.structured ? (
              <StructuredView data={result.structured} />
            ) : result.content ? (
              <SignalJsonView content={result.content} />
            ) : null}

            {showRaw && (
              <div className='border-t pt-3'>
                <p className='text-[10px] text-muted-foreground mb-2'>LLM 原始输出</p>
                <pre className='text-xs whitespace-pre-wrap text-muted-foreground bg-muted/50 rounded p-3 max-h-96 overflow-y-auto font-mono'>
                  {result.content}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className='text-sm text-muted-foreground py-4 text-center'>
            AI 正在分析技术指标...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
