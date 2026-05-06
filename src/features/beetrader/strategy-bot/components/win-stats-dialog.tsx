import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp } from 'lucide-react'
import type { WinWindowStat } from '../hooks/use-sim-exchange'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  fetchWinStats: () => Promise<WinWindowStat[]>
}

const WINDOW_LABELS: Record<WinWindowStat['label'], string> = {
  '30d': '近 30 天',
  '90d': '近 3 个月',
  'all': '全部时间',
}

function formatPnl(v: number) {
  const sign = v >= 0 ? '+' : ''
  return `${sign}$${v.toFixed(2)}`
}

function formatRatio(plr: number | null) {
  if (plr == null) return '∞'
  return plr.toFixed(2)
}

function StatRow({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className='flex items-center justify-between py-1.5 border-b border-border/40 last:border-0'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <span className={`text-xs font-mono font-medium ${valueClass ?? ''}`}>{value}</span>
    </div>
  )
}

function StatsContent({ stat }: { stat: WinWindowStat }) {
  if (stat.total_trades === 0) {
    return (
      <div className='py-8 text-center text-xs text-muted-foreground'>
        该时间段内暂无平仓记录
      </div>
    )
  }
  const pnlClass = stat.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'
  const plrClass = stat.profit_loss_ratio == null || stat.profit_loss_ratio >= 1 ? 'text-green-600' : 'text-red-600'
  return (
    <div className='space-y-0.5'>
      <StatRow label='总笔数' value={`${stat.total_trades} 笔`} />
      <StatRow
        label='胜 / 负'
        value={`${stat.win_count}W / ${stat.loss_count}L`}
      />
      <StatRow label='胜率' value={`${stat.win_rate.toFixed(2)}%`} />
      <StatRow label='盈亏比' value={formatRatio(stat.profit_loss_ratio)} valueClass={plrClass} />
      <StatRow label='平均盈利' value={formatPnl(stat.avg_win_pnl)} valueClass='text-green-600' />
      <StatRow label='平均亏损' value={formatPnl(stat.avg_loss_pnl)} valueClass='text-red-600' />
      <StatRow label='总盈亏' value={formatPnl(stat.total_pnl)} valueClass={pnlClass} />
    </div>
  )
}

export function WinStatsDialog({ open, onOpenChange, fetchWinStats }: Props) {
  const [windows, setWindows] = useState<WinWindowStat[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchWinStats()
      .then((res) => { if (!cancelled) setWindows(res) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, fetchWinStats])

  const getStat = (label: WinWindowStat['label']) => windows?.find((w) => w.label === label)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-base'>
            <TrendingUp className='h-4 w-4 text-blue-500' />
            胜率与盈亏比统计
          </DialogTitle>
          <DialogDescription className='text-xs'>
            仅统计平仓 (market_close / tp_hit / sl_hit / scalper_close)，加减仓不计入
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className='space-y-2 py-2'>
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-40 w-full' />
          </div>
        )}

        {error && !loading && (
          <div className='py-4 text-center text-xs text-destructive'>加载失败: {error}</div>
        )}

        {!loading && !error && windows && (
          <Tabs defaultValue='30d' className='w-full'>
            <TabsList className='grid grid-cols-3 w-full'>
              <TabsTrigger value='30d' className='text-xs'>{WINDOW_LABELS['30d']}</TabsTrigger>
              <TabsTrigger value='90d' className='text-xs'>{WINDOW_LABELS['90d']}</TabsTrigger>
              <TabsTrigger value='all' className='text-xs'>{WINDOW_LABELS['all']}</TabsTrigger>
            </TabsList>
            {(['30d', '90d', 'all'] as const).map((label) => {
              const stat = getStat(label)
              return (
                <TabsContent key={label} value={label} className='mt-3'>
                  {stat ? <StatsContent stat={stat} /> : (
                    <div className='py-8 text-center text-xs text-muted-foreground'>暂无数据</div>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
