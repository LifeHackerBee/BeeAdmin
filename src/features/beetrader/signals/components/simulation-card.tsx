import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FlaskConical, TrendingUp, TrendingDown, Timer, Trophy } from 'lucide-react'
import type { SimStatus, SimHistory } from '../hooks/use-simulation'

// ============================================
// 模拟进行中 / 结果卡片
// ============================================

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m${s > 0 ? `${s}s` : ''}`
  const h = Math.floor(m / 60)
  return `${h}h${m % 60}m`
}

function exitReasonLabel(reason: string): string {
  switch (reason) {
    case 'tp_hit': return '止盈'
    case 'sl_hit': return '止损'
    case 'timeout': return '超时平仓'
    case 'cancelled': return '已取消'
    default: return reason
  }
}

export function SimulationStatus({ sim }: { sim: SimStatus }) {
  const isRunning = sim.status === 'running'
  const isWin = sim.result ? sim.result.profit > 0 : false
  const progressPct = isRunning
    ? Math.min(100, (sim.elapsed_seconds / (sim.validity_minutes * 60)) * 100)
    : 100
  const pnlColor = sim.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'
  const dirLabel = sim.direction === 'long' ? '做多' : '做空'
  const DirIcon = sim.direction === 'long' ? TrendingUp : TrendingDown

  return (
    <Card className={isRunning ? 'border-blue-500/50' : isWin ? 'border-green-500/50' : 'border-red-500/50'}>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm flex items-center gap-2'>
            <FlaskConical className='h-4 w-4' />
            模拟测试
            <Badge
              variant={isRunning ? 'secondary' : isWin ? 'default' : 'destructive'}
              className='text-xs gap-1'
            >
              <DirIcon className='h-3 w-3' />
              {dirLabel}
            </Badge>
            {isRunning && (
              <Badge variant='outline' className='text-xs gap-1 animate-pulse'>
                <Timer className='h-3 w-3' />
                运行中
              </Badge>
            )}
            {!isRunning && sim.result && (
              <Badge variant={isWin ? 'default' : 'destructive'} className='text-xs'>
                {exitReasonLabel(sim.result.exit_reason)}
              </Badge>
            )}
          </CardTitle>
          <span className='text-xs text-muted-foreground tabular-nums'>
            {formatDuration(sim.elapsed_seconds)} / {sim.validity_minutes}min
          </span>
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        {/* 价格行 */}
        <div className='grid grid-cols-4 gap-2 text-xs'>
          <div>
            <div className='text-muted-foreground'>入场</div>
            <div className='font-mono font-medium'>${sim.entry_price.toFixed(2)}</div>
          </div>
          <div>
            <div className='text-muted-foreground'>当前</div>
            <div className='font-mono font-medium'>${sim.current_price.toFixed(2)}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-green-500'>止盈</div>
            <div className='font-mono font-medium text-green-500'>${sim.take_profit.toFixed(2)}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-red-500'>止损</div>
            <div className='font-mono font-medium text-red-500'>${sim.stop_loss.toFixed(2)}</div>
          </div>
        </div>

        {/* 进度条 */}
        <Progress value={progressPct} className='h-1.5' />

        {/* 盈亏 */}
        <div className='flex items-center justify-between'>
          <span className='text-sm text-muted-foreground'>
            {isRunning ? '浮动盈亏' : '最终盈亏'}
          </span>
          <div className='flex items-center gap-2'>
            <span className={`font-mono font-bold ${pnlColor}`}>
              {sim.result
                ? `${sim.result.profit >= 0 ? '+' : ''}$${sim.result.profit.toFixed(2)}`
                : `${sim.unrealized_pnl >= 0 ? '+' : ''}$${sim.unrealized_pnl.toFixed(2)}`
              }
            </span>
            <span className={`text-xs ${pnlColor}`}>
              ({sim.result
                ? `${sim.result.roi >= 0 ? '+' : ''}${sim.result.roi.toFixed(2)}%`
                : `${sim.unrealized_pnl_pct >= 0 ? '+' : ''}${sim.unrealized_pnl_pct.toFixed(2)}%`
              })
            </span>
          </div>
        </div>

        {/* 结算详情 */}
        {sim.result && (
          <div className='flex items-center justify-between text-xs text-muted-foreground border-t pt-2'>
            <span>出场价: ${sim.result.exit_price.toFixed(2)}</span>
            <span>手续费: ${sim.result.fee.toFixed(2)}</span>
            <span>用时: {formatDuration(sim.elapsed_seconds)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 累计统计卡片
// ============================================

export function SimulationHistory({ history }: { history: SimHistory }) {
  if (history.total === 0) return null

  const pnlColor = history.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <Trophy className='h-4 w-4' />
          模拟统计
          <Badge variant='outline' className='text-xs'>
            共 {history.total} 次
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {/* 统计摘要 */}
        <div className='grid grid-cols-4 gap-2 text-center text-xs'>
          <div>
            <div className='text-muted-foreground'>胜率</div>
            <div className='font-mono font-bold text-sm'>
              {history.win_rate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className='text-muted-foreground text-green-500'>盈利</div>
            <div className='font-mono font-bold text-green-500'>{history.wins}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-red-500'>亏损</div>
            <div className='font-mono font-bold text-red-500'>{history.losses}</div>
          </div>
          <div>
            <div className='text-muted-foreground'>累计 PnL</div>
            <div className={`font-mono font-bold ${pnlColor}`}>
              {history.total_pnl >= 0 ? '+' : ''}${history.total_pnl.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 最近记录 */}
        {history.records.length > 0 && (
          <div className='space-y-1 border-t pt-2'>
            <div className='text-xs text-muted-foreground mb-1'>最近记录</div>
            {history.records.slice(0, 5).map((r) => (
              <div key={r.task_id} className='flex items-center justify-between text-xs'>
                <div className='flex items-center gap-1.5'>
                  <span className='font-medium'>{r.coin}</span>
                  <Badge variant='outline' className='text-[10px] px-1 py-0'>
                    {r.direction === 'long' ? '多' : '空'}
                  </Badge>
                  <Badge
                    variant={r.exit_reason === 'tp_hit' ? 'default' : 'destructive'}
                    className='text-[10px] px-1 py-0'
                  >
                    {exitReasonLabel(r.exit_reason)}
                  </Badge>
                </div>
                <div className='flex items-center gap-2'>
                  <span className={`font-mono ${r.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {r.profit >= 0 ? '+' : ''}${r.profit.toFixed(2)}
                  </span>
                  <span className='text-muted-foreground'>{r.timestamp.slice(11, 16)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
