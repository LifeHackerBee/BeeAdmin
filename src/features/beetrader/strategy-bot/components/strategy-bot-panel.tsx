import { useState, useEffect } from 'react'
import { useStrategyBotJobs, type StrategyBotJob, type UpdateBotJobData, type DefaultPrompts } from '../hooks/use-strategy-bot-jobs'
import { useBotSignalTasks, calcPnl, type BacktestTrackerTask } from '../hooks/use-bot-signal-tasks'
import { useBotLogs, type BotLog } from '../hooks/use-bot-logs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Settings,
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

// ── 信号详情 ──

function SignalDetail({ action, confidence, signal }: { action: string | null; confidence: number | null; signal: Record<string, unknown> | null }) {
  if (!action) return <span className='text-muted-foreground text-xs'>-</span>

  const Icon = action === 'long' ? TrendingUp : action === 'short' ? TrendingDown : action === 'close' ? RotateCcw : action === 'add' ? Plus : action === 'reduce' ? Minus : Minus
  const color = action === 'long' ? 'text-green-500' : action === 'short' ? 'text-red-500' : action === 'close' ? 'text-orange-500' : action === 'add' ? 'text-blue-500' : action === 'reduce' ? 'text-purple-500' : 'text-yellow-500'
  const label = action === 'long' ? '做多' : action === 'short' ? '做空' : action === 'close' ? '平仓' : action === 'add' ? '加仓' : action === 'reduce' ? '减仓' : '观望'

  const entryPrice = signal?.entry_price as number | undefined
  const takeProfit = signal?.take_profit as number | undefined
  const stopLoss = signal?.stop_loss as number | undefined
  const reason = signal?.reason as string | undefined
  const hasPrices = entryPrice != null && (action === 'long' || action === 'short')

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='cursor-help'>
            <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
              <Icon className='h-3 w-3' />
              {label}
              {confidence != null && <span className='font-mono text-[10px] opacity-70'>({confidence})</span>}
            </span>
            {hasPrices && (
              <div className='flex flex-col mt-0.5 text-[10px] font-mono leading-tight'>
                <span className='text-muted-foreground'>入场 <span className='text-foreground'>{fmtPrice(entryPrice)}</span></span>
                <span className='text-green-500/80'>TP {fmtPrice(takeProfit)}</span>
                <span className='text-red-500/80'>SL {fmtPrice(stopLoss)}</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side='left' className='max-w-xs'>
          {reason && <p className='text-xs mb-1'>{reason}</p>}
          {hasPrices && entryPrice && (
            <div className='text-xs space-y-0.5'>
              <p>入场: {fmtPrice(entryPrice)}</p>
              {takeProfit != null && (
                <p className='text-green-500'>
                  止盈: {fmtPrice(takeProfit)} ({action === 'long' ? '+' : '-'}{(Math.abs((takeProfit - entryPrice) / entryPrice) * 100).toFixed(2)}%)
                </p>
              )}
              {stopLoss != null && (
                <p className='text-red-500'>
                  止损: {fmtPrice(stopLoss)} ({action === 'long' ? '-' : '+'}{(Math.abs((stopLoss - entryPrice) / entryPrice) * 100).toFixed(2)}%)
                </p>
              )}
              {takeProfit != null && stopLoss != null && (
                <p className='text-muted-foreground'>
                  盈亏比: {(Math.abs(takeProfit - entryPrice) / Math.abs(stopLoss - entryPrice)).toFixed(2)}:1
                </p>
              )}
            </div>
          )}
          {!reason && !hasPrices && <p className='text-xs text-muted-foreground'>无详情</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function fmtPrice(v: number | null | undefined): string {
  if (v == null) return '-'
  if (v >= 1000) return `$${v.toFixed(2)}`
  if (v >= 1) return `$${v.toFixed(4)}`
  return `$${v.toPrecision(4)}`
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
  const [balance, setBalance] = useState(20000)
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!coin.trim()) return
    setCreating(true)
    try {
      await onCreate(coin.trim(), interval, autoTrade, balance)
      setCoin('')
      setBalance(20000)
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
    jobs, loading, error, createJob, startJob, pauseJob, deleteJob, resetAccount, updateJob, fetchDefaultPrompts, fetchJobs,
  } = useStrategyBotJobs()
  const signalTasks = useBotSignalTasks()
  const botLogs = useBotLogs()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [settingsJob, setSettingsJob] = useState<StrategyBotJob | null>(null)
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
                  onSettings={() => setSettingsJob(job)}
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
                <TableHead className='w-20'>状态</TableHead>
                <TableHead>入场价</TableHead>
                <TableHead>当前价</TableHead>
                <TableHead>止盈</TableHead>
                <TableHead>止损</TableHead>
                <TableHead>盈亏</TableHead>
                <TableHead>ROI</TableHead>
                <TableHead>运行时间</TableHead>
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
      {settingsJob && (
        <BotSettingsDialog
          job={settingsJob}
          open={!!settingsJob}
          onOpenChange={(v) => !v && setSettingsJob(null)}
          onSave={async (data) => {
            await updateJob(settingsJob.id, data)
            setSettingsJob(null)
          }}
          fetchDefaultPrompts={fetchDefaultPrompts}
        />
      )}
    </div>
  )
}

// ── Job 行 ──

function JobRow({
  job, onStart, onPause, onDelete, onReset, onSettings,
}: {
  job: StrategyBotJob
  onStart: () => void
  onPause: () => void
  onDelete: () => void
  onReset: () => void
  onSettings: () => void
}) {
  const balance = job.account_balance ?? 20000
  const initialBalance = job.account_initial_balance ?? 20000
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
          <div className='flex flex-col gap-0.5'>
            <Badge variant='outline' className='text-xs text-blue-500 border-blue-500/30'>持仓中</Badge>
            {((job.scale_in_count ?? 0) > 0 || (job.scale_out_count ?? 0) > 0) && (
              <span className='text-[10px] text-muted-foreground'>
                {(job.scale_in_count ?? 0) > 0 && <span className='text-blue-500'>+{job.scale_in_count}加</span>}
                {(job.scale_in_count ?? 0) > 0 && (job.scale_out_count ?? 0) > 0 && ' '}
                {(job.scale_out_count ?? 0) > 0 && <span className='text-purple-500'>-{job.scale_out_count}减</span>}
              </span>
            )}
          </div>
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
        <SignalDetail action={job.last_signal_action} confidence={job.last_signal_confidence} signal={job.last_signal_json} />
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onSettings}>
                  <Settings className='h-3.5 w-3.5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Prompt 和止盈止损设置</TooltipContent>
            </Tooltip>
          </TooltipProvider>
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

  // TP/SL 距离百分比
  const tpPct = task.take_profit != null && task.entry_price != null
    ? Math.abs((task.take_profit - task.entry_price) / task.entry_price * 100) : null
  const slPct = task.stop_loss != null && task.entry_price != null
    ? Math.abs((task.stop_loss - task.entry_price) / task.entry_price * 100) : null

  // 当前价距 TP/SL 的进度
  const tpProgress = currentPrice != null && task.entry_price != null && task.take_profit != null
    ? ((currentPrice - task.entry_price) / (task.take_profit - task.entry_price) * 100) : null

  // 运行时间
  const startTime = task.entry_time || task.created_at
  const elapsed = formatDuration(startTime, task.status === 'running' ? undefined : task.last_tracked_at ?? undefined)

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
        {fmtPrice(task.entry_price)}
      </TableCell>
      <TableCell>
        {currentPrice != null ? (
          <div className='flex flex-col'>
            <span className='text-xs font-mono font-medium'>{fmtPrice(currentPrice)}</span>
            {tpProgress != null && task.status === 'running' && (
              <span className={`text-[10px] font-mono ${tpProgress >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {tpProgress >= 0 ? '>' : '<'} TP {Math.abs(tpProgress).toFixed(0)}%
              </span>
            )}
          </div>
        ) : (
          <span className='text-xs text-muted-foreground'>-</span>
        )}
      </TableCell>
      <TableCell>
        {task.take_profit != null ? (
          <div className='flex flex-col'>
            <span className='text-xs font-mono text-green-500'>{fmtPrice(task.take_profit)}</span>
            {tpPct != null && <span className='text-[10px] text-muted-foreground'>+{tpPct.toFixed(2)}%</span>}
          </div>
        ) : (
          <span className='text-xs text-muted-foreground'>-</span>
        )}
      </TableCell>
      <TableCell>
        {task.stop_loss != null ? (
          <div className='flex flex-col'>
            <span className='text-xs font-mono text-red-500'>{fmtPrice(task.stop_loss)}</span>
            {slPct != null && <span className='text-[10px] text-muted-foreground'>-{slPct.toFixed(2)}%</span>}
          </div>
        ) : (
          <span className='text-xs text-muted-foreground'>-</span>
        )}
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
      <TableCell className='text-xs text-muted-foreground whitespace-nowrap'>
        {elapsed}
      </TableCell>
    </TableRow>
  )
}

function formatDuration(startIso: string, endIso?: string): string {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const diff = Math.max(0, end - start)
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}天${hours % 24}时`
  if (hours > 0) return `${hours}时${mins % 60}分`
  return `${mins}分`
}

// ── 设置对话框 ──

function BotSettingsDialog({
  job,
  open,
  onOpenChange,
  onSave,
  fetchDefaultPrompts,
}: {
  job: StrategyBotJob
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (data: UpdateBotJobData) => Promise<unknown>
  fetchDefaultPrompts: () => Promise<DefaultPrompts>
}) {
  const [systemPrompt, setSystemPrompt] = useState(job.custom_system_prompt ?? '')
  const [userPrompt, setUserPrompt] = useState(job.custom_user_prompt ?? '')
  const [tpPct, setTpPct] = useState(job.tp_pct != null && job.tp_pct > 0 ? String(job.tp_pct) : '')
  const [slPct, setSlPct] = useState(job.sl_pct != null && job.sl_pct > 0 ? String(job.sl_pct) : '')
  const [saving, setSaving] = useState(false)
  const [defaults, setDefaults] = useState<DefaultPrompts | null>(null)
  const [loadingDefaults, setLoadingDefaults] = useState(false)

  // 加载默认 prompt
  useEffect(() => {
    if (!open) return
    setLoadingDefaults(true)
    fetchDefaultPrompts()
      .then((d) => setDefaults(d))
      .catch(() => {})
      .finally(() => setLoadingDefaults(false))
  }, [open, fetchDefaultPrompts])

  const handleSave = async () => {
    setSaving(true)
    try {
      const tp = parseFloat(tpPct) || 0
      const sl = parseFloat(slPct) || 0
      await onSave({
        custom_system_prompt: systemPrompt.trim() || null,
        custom_user_prompt: userPrompt.trim() || null,
        tp_pct: tp > 0 ? tp : 0,
        sl_pct: sl > 0 ? sl : 0,
      })
    } catch {
      // error handled by hook
    } finally {
      setSaving(false)
    }
  }

  const handleResetSystemPrompt = () => {
    if (defaults) setSystemPrompt(defaults.system_prompt)
  }
  const handleResetUserPrompt = () => {
    if (defaults) setUserPrompt(defaults.user_prompt_template)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Settings className='h-4 w-4' />
            {job.coin} 机器人设置
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue='prompt' className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='prompt'>AI Prompt</TabsTrigger>
            <TabsTrigger value='tpsl'>止盈止损</TabsTrigger>
          </TabsList>

          <TabsContent value='prompt' className='space-y-4 mt-4'>
            {/* System Prompt */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label className='text-sm font-medium'>System Prompt</Label>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 text-xs'
                  onClick={handleResetSystemPrompt}
                  disabled={loadingDefaults}
                >
                  恢复默认
                </Button>
              </div>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={loadingDefaults ? '加载中...' : defaults?.system_prompt ?? '使用默认 System Prompt'}
                rows={8}
                className='font-mono text-xs'
              />
              <p className='text-[10px] text-muted-foreground'>
                留空则使用默认 System Prompt。定义 AI 的角色、核心原则和输出格式。
              </p>
            </div>

            {/* User Prompt */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label className='text-sm font-medium'>User Prompt 模板</Label>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 text-xs'
                  onClick={handleResetUserPrompt}
                  disabled={loadingDefaults}
                >
                  恢复默认
                </Button>
              </div>
              <Textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder={loadingDefaults ? '加载中...' : defaults?.user_prompt_template ?? '使用默认 User Prompt 模板'}
                rows={12}
                className='font-mono text-xs'
              />
              <p className='text-[10px] text-muted-foreground'>
                留空则使用默认模板。可用变量: {'{coin}'}, {'{current_price}'}, {'{account_ctx}'}, {'{bias}'}, {'{resonance_score}'} 等。
                点击「恢复默认」可查看完整模板。
              </p>
            </div>
          </TabsContent>

          <TabsContent value='tpsl' className='space-y-4 mt-4'>
            {(() => {
              const bal = job.account_balance ?? 20000
              const tp = parseFloat(tpPct) || 0
              const sl = parseFloat(slPct) || 0
              return (
                <>
                  <p className='text-xs text-muted-foreground'>
                    按本金盈亏百分比设置止盈止损。例如本金 ${bal.toFixed(0)}，
                    设 3% 止盈 = 盈利 ${(bal * 0.03).toFixed(0)} 时平仓。
                  </p>
                  <div className='space-y-1'>
                    <Label>止盈 — 本金盈利 (%)</Label>
                    <Input
                      type='number'
                      value={tpPct}
                      onChange={(e) => setTpPct(e.target.value)}
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder='如 3'
                    />
                    {tp > 0 ? (
                      <p className='text-[10px] text-muted-foreground'>
                        盈利 ${(bal * tp / 100).toFixed(2)} 时止盈（1x 杠杆下价格变动 {tp.toFixed(2)}%）
                      </p>
                    ) : (
                      <p className='text-[10px] text-muted-foreground'>留空或设为 0 则使用 AI 自行判断止盈点位</p>
                    )}
                  </div>
                  <div className='space-y-1'>
                    <Label>止损 — 本金亏损 (%)</Label>
                    <Input
                      type='number'
                      value={slPct}
                      onChange={(e) => setSlPct(e.target.value)}
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder='如 2'
                    />
                    {sl > 0 ? (
                      <p className='text-[10px] text-muted-foreground'>
                        亏损 ${(bal * sl / 100).toFixed(2)} 时止损（1x 杠杆下价格变动 {sl.toFixed(2)}%）
                      </p>
                    ) : (
                      <p className='text-[10px] text-muted-foreground'>留空或设为 0 则使用 AI 自行判断止损点位</p>
                    )}
                  </div>
                  {tp > 0 && sl > 0 && (
                    <Alert>
                      <AlertDescription className='text-xs'>
                        盈亏比: {(tp / sl).toFixed(2)}:1
                        {tp / sl < 1.5 && (
                          <span className='text-yellow-500 ml-2'>（低于推荐的 1.5:1）</span>
                        )}
                        <span className='text-muted-foreground ml-2'>
                          | 止盈 +${(bal * tp / 100).toFixed(0)} / 止损 -${(bal * sl / 100).toFixed(0)}
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )
            })()}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
