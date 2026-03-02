import { useState } from 'react'
import { useOrderRadarJobs, type OrderRadarJob } from '../hooks/use-order-radar-jobs'
import { useSignalTasks, calcPnl, type BacktestTrackerTask } from '../hooks/use-signal-tasks'
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
  Radar,
  Trophy,
} from 'lucide-react'

// ============================================
// 状态 Badge
// ============================================

function StatusBadge({ status }: { status: OrderRadarJob['status'] }) {
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

// ============================================
// 信号 Badge
// ============================================

function SignalBadge({
  action,
  confidence,
}: {
  action: string | null
  confidence: number | null
}) {
  if (!action) return <span className='text-muted-foreground text-xs'>-</span>

  const Icon = action === 'long' ? TrendingUp : action === 'short' ? TrendingDown : Minus
  const color =
    action === 'long'
      ? 'text-green-500'
      : action === 'short'
        ? 'text-red-500'
        : 'text-yellow-500'
  const label = action === 'long' ? '做多' : action === 'short' ? '做空' : '观望'

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className='h-3 w-3' />
      {label}
      {confidence != null && (
        <span className='font-mono text-[10px] opacity-70'>({confidence})</span>
      )}
    </span>
  )
}

// ============================================
// 创建对话框
// ============================================

function CreateJobDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (coin: string, interval: number, autoSim: boolean) => Promise<unknown>
}) {
  const [coin, setCoin] = useState('')
  const [interval, setInterval] = useState(60)
  const [autoSim, setAutoSim] = useState(true)
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!coin.trim()) return
    setCreating(true)
    try {
      await onCreate(coin.trim(), interval, autoSim)
      setCoin('')
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
          <DialogTitle>添加监控币种</DialogTitle>
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
            <Label>分析间隔 (秒)</Label>
            <Input
              type='number'
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              min={30}
              max={3600}
            />
          </div>
          <div className='flex items-center gap-2'>
            <Switch id='auto-sim' checked={autoSim} onCheckedChange={setAutoSim} />
            <Label htmlFor='auto-sim' className='cursor-pointer'>
              信号触发时自动模拟
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={creating || !coin.trim()}>
            {creating ? '创建中...' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// 主组件
// ============================================

export function RadarJobsTab() {
  const { jobs, loading, error, createJob, startJob, pauseJob, deleteJob, fetchJobs } =
    useOrderRadarJobs()
  const signalTasks = useSignalTasks()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchJobs(), signalTasks.refetch()])
    setRefreshing(false)
  }

  const runningCount = jobs.filter((j) => j.status === 'running').length
  const totalAnalyses = jobs.reduce((sum, j) => sum + j.total_analyses, 0)
  const totalSignals = jobs.reduce((sum, j) => sum + j.total_signals, 0)

  return (
    <div className='space-y-3'>
      {/* 顶部操作栏 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          {jobs.length > 0 && (
            <div className='flex items-center gap-3 text-xs text-muted-foreground'>
              <span>
                {runningCount}/{jobs.length} 运行中
              </span>
              <span>共分析 {totalAnalyses} 次</span>
              <span>信号 {totalSignals} 次</span>
            </div>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button size='sm' onClick={() => setDialogOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            添加监控
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* 加载态 */}
      {loading ? (
        <div className='space-y-2'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-40 w-full' />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className='py-8 text-center text-muted-foreground'>
            <Activity className='h-10 w-10 mx-auto mb-2 opacity-30' />
            <p>暂无监控任务</p>
            <p className='text-xs mt-1'>点击「添加监控」来创建后台分析任务</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-20'>币种</TableHead>
                <TableHead className='w-24'>状态</TableHead>
                <TableHead className='w-16'>间隔</TableHead>
                <TableHead>上次分析</TableHead>
                <TableHead>最新信号</TableHead>
                <TableHead className='w-20'>分析/信号</TableHead>
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
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ============================================ */}
      {/* 信号模拟统计 + 任务列表 */}
      {/* ============================================ */}

      {/* 信号统计卡片 */}
      {signalTasks.stats.total > 0 && (
        <Card>
          <CardContent className='pt-4 pb-3'>
            <div className='flex items-center gap-6'>
              <div className='flex items-center gap-2'>
                <Radar className='h-4 w-4 text-blue-500' />
                <span className='text-sm font-medium'>AI 信号测试</span>
                <Badge variant='outline' className='text-xs'>
                  {signalTasks.stats.total} 次
                </Badge>
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
                    <span className='font-mono font-bold'>
                      {signalTasks.stats.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <span className='text-green-500 font-mono'>{signalTasks.stats.wins}W</span>
                  <span className='text-red-500 font-mono'>{signalTasks.stats.losses}L</span>
                  <span
                    className={`font-mono font-bold ${signalTasks.stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {signalTasks.stats.totalPnl >= 0 ? '+' : ''}$
                    {signalTasks.stats.totalPnl.toFixed(2)}
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

      <CreateJobDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={createJob} />
    </div>
  )
}

// ============================================
// 单行
// ============================================

function JobRow({
  job,
  onStart,
  onPause,
  onDelete,
}: {
  job: OrderRadarJob
  onStart: () => void
  onPause: () => void
  onDelete: () => void
}) {
  const lastAnalyzed = job.last_analyzed_at
    ? new Date(job.last_analyzed_at).toLocaleTimeString()
    : '-'

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
                  <p className='text-xs text-muted-foreground mt-1'>
                    连续错误 {job.consecutive_errors} 次
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell className='text-xs font-mono'>{job.analyze_interval_seconds}s</TableCell>
      <TableCell className='text-xs'>{lastAnalyzed}</TableCell>
      <TableCell>
        <SignalBadge action={job.last_signal_action} confidence={job.last_signal_confidence} />
      </TableCell>
      <TableCell className='text-xs font-mono'>
        {job.total_analyses}/{job.total_signals}
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
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive hover:text-destructive'
            onClick={onDelete}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ============================================
// 信号任务行
// ============================================

function SignalTaskRow({ task }: { task: BacktestTrackerTask }) {
  const pnl = calcPnl(task)
  const currentPrice = task.exit_price ?? task.last_tracked_price
  const roi = task.final_roi != null ? task.final_roi : pnl != null && task.test_amount > 0
    ? (pnl / task.test_amount) * 100
    : null

  const statusLabel = task.status === 'running'
    ? '运行中'
    : task.exit_reason === 'tp_hit'
      ? '止盈'
      : task.exit_reason === 'sl_hit'
        ? '止损'
        : task.exit_reason === 'timeout'
          ? '超时'
          : task.status

  const statusColor = task.status === 'running'
    ? ''
    : task.exit_reason === 'tp_hit'
      ? 'text-green-500'
      : task.exit_reason === 'sl_hit'
        ? 'text-red-500'
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
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </TableCell>
    </TableRow>
  )
}
