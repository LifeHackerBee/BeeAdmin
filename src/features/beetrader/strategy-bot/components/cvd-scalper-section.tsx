import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Zap, RefreshCw, Square, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { toast } from 'sonner'
import {
  hyperliquidApiGet, hyperliquidApiPost, hyperliquidApiPatch,
} from '@/lib/hyperliquid-api-client'

interface ScalperConfig {
  id: number
  coin: string
  mode: string
  enabled: boolean
  spike_multiplier: number
  tp_pct: number
  sl_pct: number
  max_hold_seconds: number
  order_usd: number
  has_position: boolean
  last_direction: string | null
  last_entry_price: number | null
  last_triggered_at: string | null
}

interface ScalperTrade {
  id: number
  coin: string
  action: string
  message: string
  detail: Record<string, unknown>
  created_at: string
}

const API = '/api/cvd_scalper'

export function CVDScalperSection({ mode, onOpenConfig }: {
  mode: 'paper' | 'live'
  onOpenConfig: () => void
}) {
  const [configs, setConfigs] = useState<ScalperConfig[]>([])
  const [recentTrades, setRecentTrades] = useState<ScalperTrade[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([
        hyperliquidApiGet<{ configs: ScalperConfig[] }>(`${API}/configs`),
        hyperliquidApiGet<{ trades: ScalperTrade[] }>(`${API}/trades?limit=20`),
      ])
      setConfigs((c.configs || []).filter(x => x.mode === mode))
      setRecentTrades(t.trades || [])
    } catch {
      // ignore
    }
  }, [mode])

  useEffect(() => {
    fetchData()
    pollRef.current = setInterval(fetchData, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      await hyperliquidApiPatch(`${API}/configs/${id}`, { enabled })
      fetchData()
    } catch { toast.error('更新失败') }
  }

  const handleForceClose = async (id: number, coin: string) => {
    try {
      await hyperliquidApiPost(`${API}/configs/${id}/force-close`)
      toast.success(`${coin} 已强制平仓`)
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '平仓失败')
    }
  }

  const enabledCount = configs.filter(c => c.enabled).length
  const positionCount = configs.filter(c => c.has_position).length

  // 统计最近交易: 仅 close 类型
  const closeTrades = recentTrades.filter(t => t.action === 'close')
  const closeWins = closeTrades.filter(t => {
    const pnl = (t.detail as { pnl?: number })?.pnl
    return typeof pnl === 'number' && pnl > 0
  }).length
  const closeLosses = closeTrades.length - closeWins
  const totalPnl = closeTrades.reduce((sum, t) => {
    const pnl = (t.detail as { pnl?: number })?.pnl
    return sum + (typeof pnl === 'number' ? pnl : 0)
  }, 0)

  return (
    <Card>
      <div className='flex items-center justify-between px-4 pt-3 pb-2 border-b'>
        <div className='flex items-center gap-2'>
          <Zap className='h-4 w-4 text-yellow-500' />
          <span className='text-sm font-medium'>CVD Scalper</span>
          <Badge variant='outline' className='text-xs'>{configs.length} 个</Badge>
          {enabledCount > 0 && (
            <Badge className='text-[10px] bg-green-500'>{enabledCount} 监听中</Badge>
          )}
          {positionCount > 0 && (
            <Badge className='text-[10px] bg-orange-500'>{positionCount} 持仓中</Badge>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {closeTrades.length > 0 && (
            <span className='text-[10px] text-muted-foreground font-mono'>
              {closeTrades.length} 单 · 胜 {closeWins}/负 {closeLosses} ·
              <span className={totalPnl >= 0 ? 'text-green-500 ml-1' : 'text-red-500 ml-1'}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
            </span>
          )}
          <Button variant='outline' size='sm' className='h-8 text-xs' onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> 刷新
          </Button>
          <Button variant='outline' size='sm' className='h-8 text-xs' onClick={onOpenConfig}>
            配置管理
          </Button>
        </div>
      </div>

      <CardContent className='py-2 px-3 space-y-2'>
        {configs.length === 0 ? (
          <p className='text-center text-xs text-muted-foreground py-4'>
            暂无 CVD Scalper 配置 — 点击右上「配置管理」添加币种
          </p>
        ) : (
          <>
            {/* 配置列表 — 紧凑卡片 */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
              {configs.map(cfg => (
                <div key={cfg.id} className='border rounded-md px-2 py-1.5 flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <Switch checked={cfg.enabled} onCheckedChange={v => handleToggle(cfg.id, v)} className='scale-75' />
                    <Badge variant='outline' className='text-[10px] px-1 py-0 h-4'>{cfg.coin}</Badge>
                    <span className='text-[10px] text-muted-foreground font-mono truncate'>
                      {cfg.spike_multiplier}x · TP+{cfg.tp_pct}%/SL-{cfg.sl_pct}% · ${cfg.order_usd}
                    </span>
                    {cfg.has_position && (
                      <Badge className={`text-[10px] px-1 py-0 h-4 ${cfg.last_direction === 'long' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {cfg.last_direction === 'long' ? <TrendingUp className='h-2.5 w-2.5 mr-0.5' /> : <TrendingDown className='h-2.5 w-2.5 mr-0.5' />}
                        持仓
                      </Badge>
                    )}
                  </div>
                  <div className='flex items-center gap-1 flex-shrink-0'>
                    {cfg.has_position && (
                      <Button variant='destructive' size='sm' className='h-5 text-[9px] px-1.5' onClick={() => handleForceClose(cfg.id, cfg.coin)}>
                        <Square className='h-2.5 w-2.5 mr-0.5' /> 平
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 最近交易记录 */}
            {recentTrades.length > 0 && (
              <div className='border-t pt-2 space-y-1'>
                <div className='flex items-center gap-1 text-[10px] text-muted-foreground'>
                  <Activity className='h-3 w-3' />
                  最近 {recentTrades.length} 条记录
                </div>
                <div className='max-h-40 overflow-y-auto space-y-0.5'>
                  {recentTrades.slice(0, 10).map(t => {
                    const pnl = (t.detail as { pnl?: number })?.pnl
                    const direction = (t.detail as { direction?: string })?.direction
                    return (
                      <div key={t.id} className='flex items-center gap-2 text-[10px] font-mono py-0.5 px-1 rounded hover:bg-muted/40'>
                        <span className='text-muted-foreground w-12 flex-shrink-0'>
                          {new Date(t.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Shanghai' })}
                        </span>
                        <Badge variant='outline' className='text-[9px] px-1 py-0 h-3.5 flex-shrink-0'>{t.coin}</Badge>
                        <Badge
                          variant={t.action === 'open' ? 'default' : t.action === 'close' ? 'secondary' : t.action === 'error' ? 'destructive' : 'outline'}
                          className='text-[9px] px-1 py-0 h-3.5 flex-shrink-0'
                        >
                          {t.action}
                        </Badge>
                        {direction && (
                          <span className={direction === 'long' ? 'text-green-500' : 'text-red-500'}>
                            {direction === 'long' ? '↑' : '↓'}
                          </span>
                        )}
                        <span className='truncate text-muted-foreground flex-1' title={t.message}>{t.message}</span>
                        {typeof pnl === 'number' && (
                          <span className={pnl >= 0 ? 'text-green-500 flex-shrink-0' : 'text-red-500 flex-shrink-0'}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
