import { useState, useEffect } from 'react'
import { useStrategyBotJobs, type StrategyBotJob, type UpdateBotJobData, type DefaultPrompts, type BotMode, type CreateBotJobData } from '../hooks/use-strategy-bot-jobs'
import { useBotSignalTasks, calcPnl, type BacktestTrackerTask } from '../hooks/use-bot-signal-tasks'
import { useBotLogs, type BotLog } from '../hooks/use-bot-logs'
import { useLiveStatus } from '../hooks/use-live-status'
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
  RotateCcw,
  ScrollText,
  Brain,
  Zap,
  AlertTriangle,
  Info,
  Settings,
  ShieldCheck,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
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
  mode,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (data: CreateBotJobData) => Promise<unknown>
  mode: BotMode
}) {
  const isLive = mode === 'live'
  const [coin, setCoin] = useState('')
  const [interval, setInterval] = useState(120)
  const [autoTrade, setAutoTrade] = useState(true)
  const [balance, setBalance] = useState(isLive ? 50 : 20000)
  const [maxOrderUsd, setMaxOrderUsd] = useState(50)
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!coin.trim()) return
    setCreating(true)
    try {
      await onCreate({
        coin: coin.trim(),
        analyze_interval_seconds: interval,
        auto_trade: autoTrade,
        account_balance: balance,
        mode,
        ...(isLive ? { max_order_usd: maxOrderUsd } : {}),
      })
      setCoin('')
      setBalance(isLive ? 50 : 20000)
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
          <DialogTitle>
            {isLive ? '添加现网机器人' : '添加模拟机器人'}
            {isLive && <Badge variant='destructive' className='ml-2 text-[10px]'>LIVE</Badge>}
          </DialogTitle>
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
            <Label>{isLive ? '账户额度 ($)' : '虚拟账户额度 ($)'}</Label>
            <Input
              type='number'
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
              min={isLive ? 10 : 100}
              max={isLive ? 10000 : 1000000}
              step={isLive ? 10 : 1000}
            />
            <p className='text-[10px] text-muted-foreground'>
              {isLive ? '现网交易额度，受单笔限额约束' : '每笔交易使用全部余额开仓'}
            </p>
          </div>
          {isLive && (
            <div className='space-y-1'>
              <Label>单笔最大下单额 ($)</Label>
              <Input
                type='number'
                value={maxOrderUsd}
                onChange={(e) => setMaxOrderUsd(Number(e.target.value))}
                min={10}
                max={10000}
                step={10}
              />
              <p className='text-[10px] text-muted-foreground'>硬性限制每笔订单最大金额</p>
            </div>
          )}
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
          {isLive && (
            <Alert>
              <AlertCircle className='h-3 w-3' />
              <AlertDescription className='text-[11px]'>
                现网模式将使用真实资金在 Hyperliquid 主网交易，请谨慎操作。
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleCreate} disabled={creating || !coin.trim()} variant={isLive ? 'destructive' : 'default'}>
            {creating ? '创建中...' : isLive ? '创建现网机器人' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── 现网验证门控 ──

function LiveVerifyGate({ liveStatus }: { liveStatus: ReturnType<typeof useLiveStatus> }) {
  const [address, setAddress] = useState('')
  const [secret, setSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    if (!address.trim() || !secret.trim()) return
    setVerifying(true)
    setError(null)
    const res = await liveStatus.verify(address.trim(), secret.trim())
    if (!res.success) setError(res.error || '验证失败')
    setVerifying(false)
  }

  return (
    <div className='flex items-center justify-center py-16'>
      <Card className='w-full max-w-md'>
        <CardContent className='pt-6 space-y-4'>
          <div className='text-center space-y-1'>
            <ShieldCheck className='h-10 w-10 mx-auto text-muted-foreground/50' />
            <h3 className='text-lg font-semibold'>现网交易验证</h3>
            <p className='text-sm text-muted-foreground'>请输入 config.json 中的账户信息以解锁现网交易</p>
          </div>

          <div className='space-y-3'>
            <div className='space-y-1'>
              <Label>Account Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder='0x...'
                className='font-mono text-xs'
              />
            </div>
            <div className='space-y-1'>
              <Label>Secret Key</Label>
              <div className='relative'>
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder='0x...'
                  className='font-mono text-xs pr-8'
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
                <button
                  type='button'
                  onClick={() => setShowSecret(!showSecret)}
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                >
                  {showSecret ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant='destructive'>
              <AlertCircle className='h-3 w-3' />
              <AlertDescription className='text-xs'>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleVerify} disabled={verifying || !address.trim() || !secret.trim()} className='w-full'>
            {verifying ? '验证中...' : '验证并解锁'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ── 现网 API 状态栏 ──

function LiveStatusBar({ health, loading, onRefresh }: {
  health: ReturnType<typeof useLiveStatus>['health']
  loading: boolean
  onRefresh: () => void
}) {
  const online = health?.online ?? false

  return (
    <Card className={online ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}>
      <CardContent className='px-4 py-2 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          {online ? (
            <Wifi className='h-4 w-4 text-green-500' />
          ) : (
            <WifiOff className='h-4 w-4 text-red-500' />
          )}
          <div>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-medium'>{online ? 'Hyperliquid API 在线' : 'API 离线'}</span>
              <Badge variant={online ? 'default' : 'destructive'} className='text-[10px] px-1.5 py-0 h-4'>
                {online ? 'LIVE' : 'OFFLINE'}
              </Badge>
            </div>
            {online && health && (
              <div className='flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5'>
                <span className='font-mono'>{health.account_address?.slice(0, 6)}...{health.account_address?.slice(-4)}</span>
                <span>账户: <span className='text-foreground font-medium'>${health.account_value?.toFixed(2)}</span></span>
                <span>持仓: <span className='text-foreground font-medium'>{health.positions_count ?? 0}</span></span>
              </div>
            )}
            {!online && health?.error && (
              <p className='text-[10px] text-red-500'>{health.error}</p>
            )}
          </div>
        </div>
        <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardContent>
    </Card>
  )
}

// ── 主组件 ──

export function StrategyBotPanel({ mode = 'paper' }: { mode?: BotMode }) {
  const isLive = mode === 'live'
  const {
    jobs, loading, error, createJob, startJob, pauseJob, deleteJob, resetAccount, updateJob, fetchDefaultPrompts, fetchJobs,
  } = useStrategyBotJobs(mode)
  const signalTasks = useBotSignalTasks()
  const botLogs = useBotLogs()
  const liveStatus = useLiveStatus(isLive)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [settingsJob, setSettingsJob] = useState<StrategyBotJob | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchJobs(), signalTasks.refetch(), botLogs.refetch(), ...(isLive ? [liveStatus.checkHealth()] : [])])
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

  // 汇总浮动盈亏
  const aggFloatingPnl = jobs.reduce((sum, j) => {
    if (!j.has_open_position || !j.open_task_id) return sum
    const task = signalTasks.tasks.find((t) => t.id === j.open_task_id && t.status === 'running')
    if (!task) return sum
    const pnl = calcPnl(task)
    return pnl != null ? sum + pnl : sum
  }, 0)

  // 现网模式: 未验证时显示验证门控
  if (isLive && !liveStatus.verified) {
    return <LiveVerifyGate liveStatus={liveStatus} />
  }

  return (
    <div className='space-y-3'>
      {/* 现网 API 状态栏 */}
      {isLive && <LiveStatusBar health={liveStatus.health} loading={liveStatus.loading} onRefresh={liveStatus.checkHealth} />}

      {/* 顶部操作栏 */}
      <div className='flex items-center justify-end gap-2'>
        <Button variant='outline' size='sm' onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </Button>
        <Button size='sm' onClick={() => setDialogOpen(true)} variant={isLive ? 'destructive' : 'default'}>
          <Plus className='h-4 w-4 mr-1' />
          {isLive ? '添加现网机器人' : '添加机器人'}
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
              {openPositions > 0 && (
                <p className='text-[10px] text-blue-500'>
                  {openPositions} 个持仓中
                  {aggFloatingPnl !== 0 && (
                    <span className={`ml-1 ${aggFloatingPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ({aggFloatingPnl >= 0 ? '+' : ''}{aggFloatingPnl.toFixed(0)})
                    </span>
                  )}
                </p>
              )}
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
              {openPositions > 0 && aggFloatingPnl !== 0 && (
                <p className={`text-[10px] font-mono ${aggFloatingPnl >= 0 ? 'text-green-500/70' : 'text-red-500/70'}`}>
                  浮动 {aggFloatingPnl >= 0 ? '+' : ''}${aggFloatingPnl.toFixed(2)}
                </p>
              )}
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

      {/* ── 策略管理 ── */}
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
          <div className='flex items-center gap-2 px-4 pt-3 pb-2 border-b'>
            <Bot className='h-4 w-4 text-blue-500' />
            <span className='text-sm font-medium'>策略管理</span>
            <Badge variant='outline' className='text-xs'>{jobs.length} 个</Badge>
          </div>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-16'>币种</TableHead>
                  <TableHead className='w-20'>状态</TableHead>
                  <TableHead>账户资产</TableHead>
                  <TableHead>持仓情况</TableHead>
                  <TableHead>买入价</TableHead>
                  <TableHead>当前现价</TableHead>
                  <TableHead>盈亏情况</TableHead>
                  <TableHead className='w-20 text-center'>交易日志</TableHead>
                  <TableHead>当前信号</TableHead>
                  <TableHead className='w-28 text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    trackerTasks={signalTasks.tasks}
                    logs={botLogs.logs.filter((l) => l.job_id === job.id)}
                    onStart={() => startJob(job.id)}
                    onPause={() => pauseJob(job.id)}
                    onDelete={() => deleteJob(job.id)}
                    onReset={() => resetAccount(job.id)}
                    onSettings={() => setSettingsJob(job)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <CreateBotDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={createJob} mode={mode} />
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
  job, trackerTasks, logs, onStart, onPause, onDelete, onReset, onSettings,
}: {
  job: StrategyBotJob
  trackerTasks: BacktestTrackerTask[]
  logs: BotLog[]
  onStart: () => void
  onPause: () => void
  onDelete: () => void
  onReset: () => void
  onSettings: () => void
}) {
  const [logsDialogOpen, setLogsDialogOpen] = useState(false)
  const balance = job.account_balance ?? 20000
  const initialBalance = job.account_initial_balance ?? 20000
  const pnlFromBalance = balance - initialBalance
  const totalPnl = job.total_pnl ?? 0
  const winCount = job.win_count ?? 0
  const lossCount = job.loss_count ?? 0
  const totalTrades = job.total_trades ?? 0
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0
  const canReset = job.status !== 'running' && !job.has_open_position && totalTrades > 0

  // 当前持仓 task
  const openTask = job.has_open_position && job.open_task_id
    ? trackerTasks.find((t) => t.id === job.open_task_id && t.status === 'running')
    : null
  const floatingPnl = openTask ? calcPnl(openTask) : null
  const floatingRoi = floatingPnl != null && openTask && openTask.test_amount > 0
    ? (floatingPnl / openTask.test_amount) * 100
    : null

  const tradeLogs = logs.filter((l) => l.level === 'trade')

  return (
    <>
      <TableRow>
        {/* 1. 币种 */}
        <TableCell className='font-medium'>{job.coin}</TableCell>

        {/* 2. 状态 */}
        <TableCell>
          <div className='flex flex-col gap-0.5'>
            <StatusBadge status={job.status} />
            {job.status === 'error' && job.last_error && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className='text-[10px] text-destructive truncate max-w-[100px] cursor-help'>
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

        {/* 3. 账户资产 */}
        <TableCell>
          <div className='flex flex-col'>
            <span className='text-xs font-mono font-medium'>${balance.toFixed(0)}</span>
            <span className='text-[10px] font-mono text-muted-foreground'>初始 ${initialBalance.toFixed(0)}</span>
            {pnlFromBalance !== 0 && (
              <span className={`text-[10px] font-mono ${pnlFromBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {pnlFromBalance >= 0 ? '+' : ''}{((pnlFromBalance / initialBalance) * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </TableCell>

        {/* 4. 持仓情况 */}
        <TableCell>
          {job.has_open_position ? (
            <div className='flex flex-col gap-0.5'>
              <div className='flex items-center gap-1'>
                <Badge variant='outline' className='text-xs text-blue-500 border-blue-500/30'>
                  {openTask?.entry_direction === 'long' ? '做多' : openTask?.entry_direction === 'short' ? '做空' : '持仓中'}
                </Badge>
                {((job.scale_in_count ?? 0) > 0 || (job.scale_out_count ?? 0) > 0) && (
                  <span className='text-[10px] text-muted-foreground'>
                    {(job.scale_in_count ?? 0) > 0 && <span className='text-blue-500'>+{job.scale_in_count}加</span>}
                    {(job.scale_in_count ?? 0) > 0 && (job.scale_out_count ?? 0) > 0 && ' '}
                    {(job.scale_out_count ?? 0) > 0 && <span className='text-purple-500'>-{job.scale_out_count}减</span>}
                  </span>
                )}
              </div>
              {openTask && (
                <span className='text-[10px] font-mono text-muted-foreground'>
                  仓位 ${openTask.test_amount.toFixed(0)}
                </span>
              )}
            </div>
          ) : (
            <span className='text-xs text-muted-foreground'>空仓</span>
          )}
        </TableCell>

        {/* 5. 买入价 */}
        <TableCell>
          {openTask?.entry_price != null ? (
            <div className='flex flex-col'>
              <span className='text-xs font-mono'>{fmtPrice(openTask.entry_price)}</span>
              {openTask.take_profit != null && (
                <span className='text-[10px] font-mono text-green-500/70'>TP {fmtPrice(openTask.take_profit)}</span>
              )}
              {openTask.stop_loss != null && (
                <span className='text-[10px] font-mono text-red-500/70'>SL {fmtPrice(openTask.stop_loss)}</span>
              )}
            </div>
          ) : (
            <span className='text-xs text-muted-foreground'>-</span>
          )}
        </TableCell>

        {/* 6. 当前现价 */}
        <TableCell>
          {openTask?.last_tracked_price != null ? (
            <span className='text-xs font-mono'>{fmtPrice(openTask.last_tracked_price)}</span>
          ) : (
            <span className='text-xs text-muted-foreground'>-</span>
          )}
        </TableCell>

        {/* 7. 盈亏情况 */}
        <TableCell>
          <div className='flex flex-col gap-0.5'>
            {/* 已实现盈亏 */}
            {totalTrades > 0 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='cursor-help'>
                      <span className={`text-xs font-mono font-bold ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                      </span>
                      <span className='text-[10px] text-muted-foreground ml-1'>
                        {winRate.toFixed(0)}% ({winCount}W/{lossCount}L)
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className='text-xs'>已实现盈亏 | 共 {totalTrades} 笔 | 分析 {job.total_analyses} 次</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className='text-xs text-muted-foreground'>暂无交易</span>
            )}
            {/* 浮动盈亏 */}
            {floatingPnl != null && (
              <div className='flex items-center gap-1'>
                <span className={`text-[10px] font-mono ${floatingPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  浮动 {floatingPnl >= 0 ? '+' : ''}${floatingPnl.toFixed(2)}
                </span>
                {floatingRoi != null && (
                  <span className={`text-[10px] font-mono ${floatingPnl >= 0 ? 'text-green-500/70' : 'text-red-500/70'}`}>
                    ({floatingRoi >= 0 ? '+' : ''}{floatingRoi.toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
          </div>
        </TableCell>

        {/* 8. 交易日志 */}
        <TableCell className='text-center'>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 text-xs gap-1'
            onClick={() => setLogsDialogOpen(true)}
          >
            <ScrollText className='h-3.5 w-3.5' />
            {tradeLogs.length > 0 && <span className='font-mono'>{tradeLogs.length}</span>}
          </Button>
        </TableCell>

        {/* 9. 当前信号 */}
        <TableCell>
          <SignalDetail action={job.last_signal_action} confidence={job.last_signal_confidence} signal={job.last_signal_json} />
          {(job.tp_pct || job.sl_pct) && (
            <div className='text-[10px] font-mono text-muted-foreground mt-0.5'>
              {job.tp_pct ? <span className='text-green-500/70'>TP {job.tp_pct}%</span> : null}
              {job.tp_pct && job.sl_pct ? ' / ' : null}
              {job.sl_pct ? <span className='text-red-500/70'>SL {job.sl_pct}%</span> : null}
            </div>
          )}
        </TableCell>

        {/* 操作 */}
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

      <TradeLogsDialog
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
        coin={job.coin}
        logs={logs}
      />
    </>
  )
}

// ── 交易日志弹窗 ──

function TradeLogsDialog({
  open,
  onOpenChange,
  coin,
  logs,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  coin: string
  logs: BotLog[]
}) {
  const [tab, setTab] = useState<'trade' | 'all'>('trade')
  const tradeLogs = logs.filter((l) => l.level === 'trade')
  const displayLogs = tab === 'trade' ? tradeLogs : logs

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[85vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <ScrollText className='h-4 w-4' />
            {coin} 交易日志
          </DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'trade' | 'all')} className='flex-1 flex flex-col min-h-0'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='trade'>
              交易记录
              {tradeLogs.length > 0 && <Badge variant='secondary' className='ml-1.5 text-[10px] px-1.5 py-0'>{tradeLogs.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value='all'>
              全部日志
              <Badge variant='secondary' className='ml-1.5 text-[10px] px-1.5 py-0'>{logs.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className='flex-1 overflow-y-auto max-h-[60vh] mt-2'>
            {displayLogs.length === 0 ? (
              <div className='py-8 text-center text-muted-foreground text-sm'>暂无日志</div>
            ) : (
              <div className='divide-y rounded-md border'>
                {displayLogs.map((log) =>
                  tab === 'trade' ? (
                    <TradeLogRow key={log.id} log={log} />
                  ) : (
                    <BotLogRow key={log.id} log={log} />
                  ),
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ── 交易记录行 ──

const TRADE_STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  trade_open: { label: '开仓', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  trade_add: { label: '加仓', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
  trade_reduce: { label: '减仓', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  trade_close: { label: '平仓', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  settle: { label: '结算', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
}

function TradeLogRow({ log }: { log: BotLog }) {
  const cfg = TRADE_STAGE_CONFIG[log.stage] ?? { label: '交易', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' }
  const detail = log.detail as Record<string, unknown>

  // 从 detail 提取关键信息
  const direction = detail?.direction as string | undefined
  const entryPrice = detail?.entry_price as number | undefined
  const tp = detail?.take_profit as number | undefined
  const sl = detail?.stop_loss as number | undefined
  const amount = detail?.amount as number | undefined
  const pnl = detail?.pnl as number ?? detail?.partial_pnl as number | undefined
  const currentPrice = detail?.current_price as number | undefined
  const reduceAmount = detail?.reduce_amount as number | undefined
  const newAmount = detail?.new_amount as number | undefined
  const scaleCount = detail?.scale_in_count as number ?? detail?.scale_out_count as number | undefined

  const time = new Date(log.created_at).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className={`px-4 py-2.5 ${cfg.bg} hover:bg-muted/30 transition-colors`}>
      <div className='flex items-start gap-3'>
        {/* 时间 + 标签 */}
        <div className='shrink-0 w-[100px]'>
          <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
          <div className='text-[10px] text-muted-foreground tabular-nums'>{time}</div>
        </div>

        {/* 内容 */}
        <div className='flex-1 min-w-0'>
          {log.stage === 'trade_open' && direction && (
            <div className='space-y-0.5'>
              <div className='flex items-center gap-2 text-xs'>
                <Badge variant='outline' className='text-[10px] px-1.5 py-0'>{log.coin}</Badge>
                <span className={direction === 'long' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {direction === 'long' ? '做多' : '做空'}
                </span>
                {amount != null && <span className='font-mono'>${amount.toFixed(0)}</span>}
                {entryPrice != null && <span className='text-muted-foreground'>@ {fmtPrice(entryPrice)}</span>}
              </div>
              {tp != null && sl != null && (
                <div className='text-[10px] font-mono text-muted-foreground'>
                  TP {fmtPrice(tp)} / SL {fmtPrice(sl)}
                </div>
              )}
            </div>
          )}

          {(log.stage === 'trade_add' || log.stage === 'trade_reduce') && (
            <div className='space-y-0.5'>
              <div className='flex items-center gap-2 text-xs'>
                <Badge variant='outline' className='text-[10px] px-1.5 py-0'>{log.coin}</Badge>
                <span className='text-xs'>{log.message}</span>
              </div>
              {(reduceAmount != null || newAmount != null || currentPrice != null) && (
                <div className='text-[10px] font-mono text-muted-foreground'>
                  {reduceAmount != null && <span>{log.stage === 'trade_add' ? '+' : '-'}${reduceAmount.toFixed(0)}</span>}
                  {newAmount != null && <span> → 仓位 ${newAmount.toFixed(0)}</span>}
                  {currentPrice != null && <span> @ {fmtPrice(currentPrice)}</span>}
                  {pnl != null && (
                    <span className={`ml-1 ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ({pnl >= 0 ? '+' : ''}${pnl.toFixed(2)})
                    </span>
                  )}
                  {scaleCount != null && <span className='ml-1'>第{scaleCount}次</span>}
                </div>
              )}
            </div>
          )}

          {(log.stage === 'trade_close' || log.stage === 'settle') && (
            <div className='flex items-center gap-2 text-xs'>
              <Badge variant='outline' className='text-[10px] px-1.5 py-0'>{log.coin}</Badge>
              <span>{log.message}</span>
              {pnl != null && (
                <span className={`font-mono font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                </span>
              )}
            </div>
          )}

          {!['trade_open', 'trade_add', 'trade_reduce', 'trade_close', 'settle'].includes(log.stage) && (
            <div className='flex items-center gap-2 text-xs'>
              <Badge variant='outline' className='text-[10px] px-1.5 py-0'>{log.coin}</Badge>
              <span>{log.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
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
                  <Alert>
                    <Info className='h-3 w-3' />
                    <AlertDescription className='text-[11px]'>
                      设置后对<strong>下一次开仓</strong>生效，会覆盖 AI 信号的止盈止损价格。不影响已有持仓。
                    </AlertDescription>
                  </Alert>
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
