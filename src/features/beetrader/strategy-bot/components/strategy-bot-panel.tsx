import { useState } from 'react'
import { useStrategyBotJobs, type StrategyBotJob } from '../hooks/use-strategy-bot-jobs'
import { useBotSignalTasks, calcPnl, type BacktestTrackerTask } from '../hooks/use-bot-signal-tasks'
import { useBotLogs, type BotLog } from '../hooks/use-bot-logs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Plus,
  Play,
  Pause,
  Trash2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Activity,
  Bot,
  Trophy,
  RotateCcw,
  ScrollText,
  ChevronDown,
  Brain,
  Zap,
  AlertTriangle,
  Info,
} from 'lucide-react'

// ── 状态 Badge ──

function StatusBadge({ status }: { status: StrategyBotJob['status'] }) {
  switch (status) {
    case 'running':
      return (
        <Badge variant='default' className='gap-1 text-xs'>
          <Activity className='h-3 w-3 animate-pulse' />
          运行中
        </Badge>
      )
    case 'paused':
      return (
        <Badge variant='secondary' className='text-xs'>
          <Pause className='h-3 w-3 mr-1' />
          已暂停
        </Badge>
      )
    case 'error':
      return (
        <Badge variant='destructive' className='text-xs'>
          <AlertCircle className='h-3 w-3 mr-1' />
          异常
        </Badge>
      )
  }
}

// ── 信号 Badge ──

function SignalBadge({ action, confidence }: { action: string | null; confidence: number | null }) {
  if (!action) return <span className='text-muted-foreground text-xs'>-</span>

  const Icon = action === 'long' ? TrendingUp : action === 'short' ? TrendingDown : action === 'close' ? RotateCcw : Minus
  const color = action === 'long' ? 'text-green-500' : action === 'short' ? 'text-red-500' : action === 'close' ? 'text-orange-500' : 'text-yellow-500'
  const label = action === 'long' ? '做多' : action === 'short' ? '做空' : action === 'close' ? '平仓' : '观望'

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className='h-3 w-3' />
      {label}
      {confidence != null && <span className='font-mono text-[10px] opacity-70'>({confidence})</span>}
    </span>
  )
}

// ── 创建对话框 ──

function CreateBotDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (coin: string, interval: number, autoTrade: boolean, balance: number) => Promise<unknown>
}) {
  const [coin, setCoin] = useState('')
  const [interval, setInterval] = useState(120)
  const [autoTrade, setAutoTrade] = useState(true)
  const [balance, setBalance] = useState(10000)
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!coin.trim()) return
    setCreating(true)
    try {
      await onCreate(coin.trim(), interval, autoTrade, balance)
      setCoin('')
      setBalance(10000)
      onOpenChange(false)
    } catch {
      // error handled by hook
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>添加交易机器人</DialogTitle>
        </DialogHeader>
        <div className='space-y-3 py-2'>
          <div className='space-y-1'>
            <Label>币种</Label>
            <Input
              value={coin}
              onChange={(e) => setCoin(e.target.value.toUpperCase())}
              placeholder='如 BTC、ETH、SOL'
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className='space-y-1'>
            <Label>虚拟账户额度 ($)</Label>
            <Input
              type='number'
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
              min={100}
              max={1000000}
              step={1000}
            />
            <p className='text-[10px] text-muted-foreground'>每笔交易使用全部余额开仓</p>
          </div>
          <div className='space-y-1'>
            <Label>分析间隔 (秒)</Label>
            <Input
              type='number'
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              min={60}
              max={3600}
            />
            <p className='text-[10px] text-muted-foreground'>大镖客策略分析较慢，建议 120s 以上</p>
          </div>
          <div className='flex items-center gap-2'>
            <Switch id='auto-trade' checked={autoTrade} onCheckedChange={setAutoTrade} />
            <Label htmlFor='auto-trade' className='cursor-pointer'>
              AI 信号触发时自动交易
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleCreate} disabled={creating || !coin.trim()}>
            {creating ? '创建中...' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── 主组件 ──

export function StrategyBotPanel() {
  const {
    jobs, loading, error, createJob, startJob, pauseJob, deleteJob, resetAccount, fetchJobs,
  } = useStrategyBotJobs()
  const signalTasks = useBotSignalTasks()
  const botLogs = useBotLogs()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [logsOpen, setLogsOpen] = useState(true)

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchJobs(), signalTasks.refetch(), botLogs.refetch()])
    setRefreshing(false)
  }

  const runningCount = jobs.filter((j) => j.status === 'running').length
  const totalAnalyses = jobs.reduce((sum, j) => sum + (j.total_analyses ?? 0), 0)
  const totalBalance = jobs.reduce((sum, j) => sum + (j.account_balance ?? 0), 0)
  const totalInitial = jobs.reduce((sum, j) => sum + (j.account_initial_balance ?? 0), 0)
  const aggPnl = jobs.reduce((sum, j) => sum + (j.total_pnl ?? 0), 0)
  const aggWins = jobs.reduce((sum, j) => sum + (j.win_count ?? 0), 0)
  const aggLosses = jobs.reduce((sum, j) => sum + (j.loss_count ?? 0), 0)
  const aggTrades = aggWins + aggLosses
  const aggWinRate = aggTrades > 0 ? (aggWins / aggTrades) * 100 : 0
  const openPositions = jobs.filter((j) => j.has_open_position).length

  return (
    <div className='space-y-3'>
      {/* 顶部操作栏 */}
      <div className='flex items-center justify-end gap-2'>
        <Button variant='outline' size='sm' onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </Button>
        <Button size='sm' onClick={() => setDialogOpen(true)}>
          <Plus className='h-4 w-4 mr-1' />
          添加机器人
        </Button>
      </div>

      {/* 概览统计 */}
      {jobs.length > 0 && (
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6'>
          <Card>
            <CardContent className='px-3 py-2'>
              <p className='text-[10px] text-muted-foreground'>运行状态</p>
              <p className='text-lg font-bold tabular-nums'>
                <span className={runningCount > 0 ? 'text-green-500' : ''}>{runningCount}</span>
                <span className='text-sm text-muted-foreground font-normal'>/{jobs.length}</span>
              </p>
              {openPositions > 0 && <p className='text-[10px] text-blue-500'>{openPositions} 个持仓中</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className='px-3 py-2'>
              <p className='text-[10px] text-muted-foreground'>总分析</p>
              <p className='text-lg font-bold tabular-nums'>{totalAnalyses.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='px-3 py-2'>
              <p className='text-[10px] text-muted-foreground'>总资产</p>
              <p className='text-lg font-bold tabular-nums'>${totalBalance.toFixed(0)}</p>
              {totalInitial > 0 && (
                <p className={`text-[10px] font-mono ${totalBalance - totalInitial >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalBalance - totalInitial >= 0 ? '+' : ''}{((totalBalance - totalInitial) / totalInitial * 100).toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className='px-3 py-2'>
              <p className='text-[10px] text-muted-foreground'>总盈亏</p>
              <p className={`text-lg font-bold tabular-nums ${aggPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {aggPnl >= 0 ? '+' : ''}${aggPnl.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='px-3 py-2'>
              <p className='text-[10px] text-muted-foreground'>胜率</p>
              <p className='text-lg font-bold tabular-nums'>{aggTrades > 0 ? `${aggWinRate.toFixed(0)}%` : '-'}</p>
              {aggTrades > 0 && (
                <p className='text-[10px] text-muted-foreground'>
                  <span className='text-green-500'>{aggWins}W</span> / <span className='text-red-500'>{aggLosses}L</span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className='px-3 py-2'>
              <p className='text-[10px] text-muted-foreground'>总交易</p>
              <p className='text-lg font-bold tabular-nums'>{aggTrades}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* 任务列表 */}
      {loading ? (
        <div className='space-y-2'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-40 w-full' />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className='py-8 text-center text-muted-foreground'>
            <Bot className='h-10 w-10 mx-auto mb-2 opacity-30' />
            <p>暂无交易机器人</p>
            <p className='text-xs mt-1'>点击「添加机器人」来创建基于大镖客策略的量化交易测试</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-20'>币种</TableHead>
                <TableHead className='w-24'>状态</TableHead>
                <TableHead>余额</TableHead>
                <TableHead>仓位</TableHead>
                <TableHead>总盈亏</TableHead>
                <TableHead>胜率</TableHead>
                <TableHead>最新信号</TableHead>
                <TableHead className='w-28 text-right'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onStart={() => startJob(job.id)}
                  onPause={() => pauseJob(job.id)}
                  onDelete={() => deleteJob(job.id)}
                  onReset={() => resetAccount(job.id)}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 信号统计 */}
      {signalTasks.stats.total > 0 && (
        <Card>
          <CardContent className='pt-4 pb-3'>
            <div className='flex items-center gap-6'>
              <div className='flex items-center gap-2'>
                <Bot className='h-4 w-4 text-blue-500' />
                <span className='text-sm font-medium'>策略信号测试</span>
                <Badge variant='outline' className='text-xs'>{signalTasks.stats.total} 次</Badge>
                {signalTasks.stats.running > 0 && (
                  <Badge variant='secondary' className='text-xs animate-pulse'>
                    {signalTasks.stats.running} 运行中
                  </Badge>
                )}
              </div>
              {signalTasks.stats.settled > 0 && (
                <div className='flex items-center gap-4 text-sm'>
                  <div className='flex items-center gap-1'>
                    <Trophy className='h-3.5 w-3.5' />
                    <span className='font-mono font-bold'>{signalTasks.stats.winRate.toFixed(1)}%</span>
                  </div>
                  <span className='text-green-500 font-mono'>{signalTasks.stats.wins}W</span>
                  <span className='text-red-500 font-mono'>{signalTasks.stats.losses}L</span>
                  <span className={`font-mono font-bold ${signalTasks.stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {signalTasks.stats.totalPnl >= 0 ? '+' : ''}${signalTasks.stats.totalPnl.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 信号任务列表 */}
      {signalTasks.tasks.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-24'>币种</TableHead>
                <TableHead className='w-24'>状态</TableHead>
                <TableHead>入场价</TableHead>
                <TableHead>当前/退出价</TableHead>
                <TableHead>盈亏</TableHead>
                <TableHead>ROI</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signalTasks.tasks.map((task) => (
                <SignalTaskRow key={task.id} task={task} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 执行日志 */}
      <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className='flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors'>
              <div className='flex items-center gap-2'>
                <ScrollText className='h-4 w-4 text-blue-500' />
                <span className='text-sm font-medium'>执行日志</span>
                <Badge variant='outline' className='text-xs'>{botLogs.logs.length}</Badge>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${logsOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className='border-t max-h-[400px] overflow-y-auto'>
              {botLogs.logs.length === 0 ? (
                <div className='py-6 text-center text-muted-foreground text-sm'>暂无日志，启动机器人后将在此显示执行过程</div>
              ) : (
                <div className='divide-y'>
                  {botLogs.logs.map((log) => (
                    <BotLogRow key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <CreateBotDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={createJob} />
    </div>
  )
}

// ── Job 行 ──

function JobRow({
  job, onStart, onPause, onDelete, onReset,
}: {
  job: StrategyBotJob
  onStart: () => void
  onPause: () => void
  onDelete: () => void
  onReset: () => void
}) {
  const balance = job.account_balance ?? 10000
  const initialBalance = job.account_initial_balance ?? 10000
  const pnlFromBalance = balance - initialBalance
  const totalPnl = job.total_pnl ?? 0
  const winCount = job.win_count ?? 0
  const lossCount = job.loss_count ?? 0
  const totalTrades = job.total_trades ?? 0
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0
  const canReset = job.status !== 'running' && !job.has_open_position && totalTrades > 0

  return (
    <TableRow>
      <TableCell className='font-medium'>{job.coin}</TableCell>
      <TableCell>
        <div className='flex flex-col gap-0.5'>
          <StatusBadge status={job.status} />
          {job.status === 'error' && job.last_error && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='text-[10px] text-destructive truncate max-w-[120px] cursor-help'>
                    {job.last_error}
                  </span>
                </TooltipTrigger>
                <TooltipContent side='bottom' className='max-w-xs'>
                  <p className='text-xs'>{job.last_error}</p>
                  <p className='text-xs text-muted-foreground mt-1'>连续错误 {job.consecutive_errors} 次</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className='flex flex-col'>
          <span className='text-xs font-mono font-medium'>${balance.toFixed(0)}</span>
          {pnlFromBalance !== 0 && (
            <span className={`text-[10px] font-mono ${pnlFromBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {pnlFromBalance >= 0 ? '+' : ''}{((pnlFromBalance / initialBalance) * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {job.has_open_position ? (
          <Badge variant='outline' className='text-xs text-blue-500 border-blue-500/30'>持仓中</Badge>
        ) : (
          <span className='text-xs text-muted-foreground'>空仓</span>
        )}
      </TableCell>
      <TableCell>
        {totalTrades > 0 ? (
          <span className={`text-xs font-mono font-bold ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </span>
        ) : (
          <span className='text-xs text-muted-foreground'>-</span>
        )}
      </TableCell>
      <TableCell>
        {totalTrades > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='text-xs font-mono cursor-help'>
                  {winRate.toFixed(0)}%
                  <span className='text-muted-foreground ml-1'>({winCount}W/{lossCount}L)</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className='text-xs'>共 {totalTrades} 笔交易 | 分析 {job.total_analyses} 次</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className='text-xs text-muted-foreground'>-</span>
        )}
      </TableCell>
      <TableCell>
        <SignalBadge action={job.last_signal_action} confidence={job.last_signal_confidence} />
      </TableCell>
      <TableCell className='text-right'>
        <div className='flex items-center justify-end gap-1'>
          {job.status === 'running' ? (
            <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onPause}>
              <Pause className='h-3.5 w-3.5' />
            </Button>
          ) : (
            <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onStart}>
              <Play className='h-3.5 w-3.5' />
            </Button>
          )}
          {canReset && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onReset}>
                    <RotateCcw className='h-3.5 w-3.5' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>重置账户余额和统计</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant='ghost' size='icon' className='h-7 w-7 text-destructive hover:text-destructive' onClick={onDelete}>
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── 信号任务行 ──

function SignalTaskRow({ task }: { task: BacktestTrackerTask }) {
  const pnl = calcPnl(task)
  const currentPrice = task.exit_price ?? task.last_tracked_price
  const roi = task.final_roi != null
    ? task.final_roi
    : pnl != null && task.test_amount > 0
      ? (pnl / task.test_amount) * 100
      : null

  const statusLabel = task.status === 'running' ? '运行中'
    : task.exit_reason === 'tp_hit' ? '止盈'
    : task.exit_reason === 'sl_hit' ? '止损'
    : task.exit_reason === 'ai_close' ? 'AI平仓'
    : task.exit_reason === 'timeout' ? '超时'
    : task.status

  const statusColor = task.status === 'running' ? ''
    : task.exit_reason === 'tp_hit' ? 'text-green-500'
    : task.exit_reason === 'sl_hit' ? 'text-red-500'
    : task.exit_reason === 'ai_close' ? 'text-orange-500'
    : 'text-yellow-500'

  const dirColor = task.entry_direction === 'long' ? 'text-green-500' : 'text-red-500'
  const DirIcon = task.entry_direction === 'long' ? TrendingUp : TrendingDown

  return (
    <TableRow>
      <TableCell>
        <div className='flex items-center gap-1'>
          <span className='font-medium text-xs'>{task.coin}</span>
          <span className={`flex items-center gap-0.5 text-xs ${dirColor}`}>
            <DirIcon className='h-3 w-3' />
            {task.entry_direction === 'long' ? '多' : '空'}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {task.status === 'running' ? (
          <Badge variant='secondary' className='text-xs animate-pulse'>运行中</Badge>
        ) : (
          <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
        )}
      </TableCell>
      <TableCell className='text-xs font-mono'>
        {task.entry_price != null ? `$${task.entry_price.toFixed(2)}` : '-'}
      </TableCell>
      <TableCell className='text-xs font-mono'>
        {currentPrice != null ? `$${currentPrice.toFixed(2)}` : '-'}
      </TableCell>
      <TableCell>
        {pnl != null ? (
          <span className={`text-xs font-mono font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
          </span>
        ) : (
          <span className='text-xs text-muted-foreground'>-</span>
        )}
      </TableCell>
      <TableCell>
        {roi != null ? (
          <span className={`text-xs font-mono ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
          </span>
        ) : (
          <span className='text-xs text-muted-foreground'>-</span>
        )}
      </TableCell>
      <TableCell className='text-xs text-muted-foreground'>
        {new Date(task.created_at).toLocaleString('zh-CN', {
          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        })}
      </TableCell>
    </TableRow>
  )
}

// ── 日志行 ──

const LOG_LEVEL_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-muted-foreground', bg: '' },
  warn: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/5' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/5' },
  signal: { icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/5' },
  trade: { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/5' },
}

function BotLogRow({ log }: { log: BotLog }) {
  const config = LOG_LEVEL_CONFIG[log.level] ?? LOG_LEVEL_CONFIG.info
  const Icon = config.icon
  const hasDetail = log.detail && Object.keys(log.detail).length > 0
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`px-3 py-2 ${config.bg}`}>
      <div className='flex items-start gap-2'>
        <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${config.color}`} />
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='text-[10px] px-1 py-0 h-4 shrink-0'>{log.coin}</Badge>
            <span className='text-xs leading-relaxed'>{log.message}</span>
          </div>
          {hasDetail && expanded && (
            <pre className='mt-1 text-[10px] text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto'>
              {JSON.stringify(log.detail, null, 2)}
            </pre>
          )}
        </div>
        <div className='flex items-center gap-1 shrink-0'>
          {hasDetail && (
            <button
              onClick={() => setExpanded(!expanded)}
              className='text-[10px] text-muted-foreground hover:text-foreground px-1'
            >
              {expanded ? '收起' : '详情'}
            </button>
          )}
          <span className='text-[10px] text-muted-foreground tabular-nums whitespace-nowrap'>
            {new Date(log.created_at).toLocaleString('zh-CN', {
              month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
