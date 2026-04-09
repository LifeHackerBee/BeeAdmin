import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Zap, Loader2, Trash2, Plus, Square, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import {
  hyperliquidApiGet, hyperliquidApiPost, hyperliquidApiPatch, hyperliquidApiDelete,
} from '@/lib/hyperliquid-api-client'

interface ScalperConfig {
  id: number
  coin: string
  mode: string
  enabled: boolean
  spike_multiplier: number
  lookback_minutes: number
  tp_pct: number
  sl_pct: number
  max_hold_seconds: number
  order_usd: number
  cvd_confirm_ratio: number
  reverse_signal: boolean
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

export function CVDScalperDialog({ open, onOpenChange, mode }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: 'paper' | 'live'
}) {
  const [configs, setConfigs] = useState<ScalperConfig[]>([])
  const [trades, setTrades] = useState<ScalperTrade[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'config' | 'log'>('config')

  // 新建表单
  const [newCoin, setNewCoin] = useState('BTC')
  const [newSpike, setNewSpike] = useState('5')
  const [newTpPct, setNewTpPct] = useState('1.0')
  const [newSlPct, setNewSlPct] = useState('1.0')
  const [newMaxHold, setNewMaxHold] = useState('3600')
  const [newUsd, setNewUsd] = useState('50')
  const [newCvdRatio, setNewCvdRatio] = useState('0.4')
  const [newLookback, setNewLookback] = useState('30')
  const [creating, setCreating] = useState(false)

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await hyperliquidApiGet<{ configs: ScalperConfig[] }>(`${API}/configs`)
      setConfigs((res.configs || []).filter(c => c.mode === mode))
    } catch { /* ignore */ }
  }, [mode])

  const [tradeFilter, setTradeFilter] = useState<'all' | 'trades' | 'signals'>('trades')
  const [tradeTotal, setTradeTotal] = useState(0)
  const [tradePage, setTradePage] = useState(1)
  const TRADES_PAGE_SIZE = 10

  const fetchTrades = useCallback(async () => {
    try {
      const offset = (tradePage - 1) * TRADES_PAGE_SIZE
      let url = `${API}/trades?limit=${TRADES_PAGE_SIZE}&offset=${offset}`
      if (tradeFilter === 'trades') {
        url += '&action=open,close,error'
      } else if (tradeFilter === 'signals') {
        url += '&action=signal,skip'
      }
      const res = await hyperliquidApiGet<{ trades: ScalperTrade[]; total?: number }>(url)
      setTrades(res.trades || [])
      setTradeTotal(res.total || 0)
    } catch { /* ignore */ }
  }, [tradeFilter, tradePage])

  // 切换 filter 时重置到第 1 页
  useEffect(() => {
    setTradePage(1)
  }, [tradeFilter])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([fetchConfigs(), fetchTrades()]).finally(() => setLoading(false))
  }, [open, fetchConfigs, fetchTrades])

  const tradeTotalPages = Math.max(1, Math.ceil(tradeTotal / TRADES_PAGE_SIZE))

  const handleCreate = async () => {
    setCreating(true)
    try {
      await hyperliquidApiPost(`${API}/configs`, {
        coin: newCoin.toUpperCase().trim(),
        mode,
        spike_multiplier: parseFloat(newSpike) || 5,
        lookback_minutes: parseInt(newLookback) || 30,
        tp_pct: parseFloat(newTpPct) || 1.0,
        sl_pct: parseFloat(newSlPct) || 1.0,
        max_hold_seconds: parseInt(newMaxHold) || 3600,
        order_usd: parseFloat(newUsd) || 50,
        cvd_confirm_ratio: parseFloat(newCvdRatio) || 0.4,
      })
      toast.success(`${newCoin} CVD Scalper 已创建`)
      fetchConfigs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      await hyperliquidApiPatch(`${API}/configs/${id}`, { enabled })
      fetchConfigs()
    } catch { toast.error('更新失败') }
  }

  const handleDelete = async (id: number) => {
    try {
      await hyperliquidApiDelete(`${API}/configs/${id}`)
      toast.success('已删除')
      fetchConfigs()
    } catch { toast.error('删除失败') }
  }

  const handleForceClose = async (id: number, coin: string) => {
    try {
      await hyperliquidApiPost(`${API}/configs/${id}/force-close`)
      toast.success(`${coin} 已强制平仓`)
      fetchConfigs()
      fetchTrades()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '平仓失败')
    }
  }

  const [clearing, setClearing] = useState(false)
  const handleClearTrades = async (configId?: number) => {
    if (!confirm(configId ? '确认清除该配置的所有日志？' : '确认清除全部 CVD Scalper 日志？')) return
    setClearing(true)
    try {
      const url = configId ? `${API}/trades?config_id=${configId}` : `${API}/trades`
      await hyperliquidApiDelete(url)
      toast.success('日志已清除')
      setTradeTotal(0)
      setTrades([])
      setTradePage(1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '清除失败')
    } finally {
      setClearing(false)
    }
  }

  const handleUpdate = async (id: number, field: string, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    try {
      await hyperliquidApiPatch(`${API}/configs/${id}`, { [field]: num })
      fetchConfigs()
    } catch { /* ignore */ }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-sm'>
            <Zap className='h-4 w-4 text-yellow-500' />
            CVD Scalper — {mode === 'paper' ? '模拟' : '现网'}极短线追单
          </DialogTitle>
        </DialogHeader>

        {/* Tab 切换 */}
        <div className='flex gap-1 border-b pb-2'>
          <Button variant={tab === 'config' ? 'default' : 'ghost'} size='sm' className='h-7 text-xs' onClick={() => setTab('config')}>
            配置管理
          </Button>
          <Button variant={tab === 'log' ? 'default' : 'ghost'} size='sm' className='h-7 text-xs' onClick={() => { setTab('log'); fetchTrades() }}>
            交易日志
          </Button>
        </div>

        {tab === 'config' ? (
          <div className='space-y-4'>
            {/* 新建 */}
            <Card>
              <CardContent className='pt-4 space-y-3'>
                <p className='text-xs font-medium'>添加追单币种</p>
                <div className='grid grid-cols-4 gap-2'>
                  <div className='space-y-1'>
                    <Label className='text-[10px]'>币种</Label>
                    <Input value={newCoin} onChange={e => setNewCoin(e.target.value.toUpperCase())} className='h-7 text-xs' placeholder='BTC' />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[10px]'>量能倍数</Label>
                    <Input value={newSpike} onChange={e => setNewSpike(e.target.value)} className='h-7 text-xs' placeholder='5' type='number' />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[10px]'>止盈 %</Label>
                    <Input value={newTpPct} onChange={e => setNewTpPct(e.target.value)} className='h-7 text-xs' placeholder='1.0' type='number' step='0.1' />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[10px]'>止损 %</Label>
                    <Input value={newSlPct} onChange={e => setNewSlPct(e.target.value)} className='h-7 text-xs' placeholder='1.0' type='number' step='0.1' />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[10px]'>最长持仓 (秒)</Label>
                    <Input value={newMaxHold} onChange={e => setNewMaxHold(e.target.value)} className='h-7 text-xs' placeholder='3600' type='number' />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[10px]'>下单金额 ($)</Label>
                    <Input value={newUsd} onChange={e => setNewUsd(e.target.value)} className='h-7 text-xs' placeholder='50' type='number' />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[10px]'>CVD 确认比</Label>
                    <Input value={newCvdRatio} onChange={e => setNewCvdRatio(e.target.value)} className='h-7 text-xs' placeholder='0.4' type='number' step='0.1' />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[10px]'>回看分钟</Label>
                    <Input value={newLookback} onChange={e => setNewLookback(e.target.value)} className='h-7 text-xs' placeholder='30' type='number' />
                  </div>
                </div>
                <Button size='sm' className='h-7 text-xs gap-1' onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className='h-3 w-3 animate-spin' /> : <Plus className='h-3 w-3' />}
                  添加
                </Button>
              </CardContent>
            </Card>

            {/* 已有配置列表 */}
            {loading ? (
              <div className='flex justify-center py-8'>
                <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
              </div>
            ) : configs.length === 0 ? (
              <p className='text-center text-xs text-muted-foreground py-6'>暂无配置，请添加追单币种</p>
            ) : (
              <div className='space-y-2'>
                {configs.map(cfg => (
                  <Card key={cfg.id}>
                    <CardContent className='pt-3 pb-3 space-y-2'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <Badge variant='outline' className='text-xs'>{cfg.coin}</Badge>
                          <Switch checked={cfg.enabled} onCheckedChange={v => handleToggle(cfg.id, v)} />
                          {cfg.has_position && (
                            <Badge className='text-[10px] bg-orange-500'>
                              持仓中 ({cfg.last_direction})
                            </Badge>
                          )}
                          {cfg.enabled && !cfg.has_position && (
                            <Badge variant='secondary' className='text-[10px]'>监听中</Badge>
                          )}
                        </div>
                        <div className='flex items-center gap-1'>
                          {cfg.has_position && (
                            <Button variant='destructive' size='sm' className='h-6 text-[10px] gap-1' onClick={() => handleForceClose(cfg.id, cfg.coin)}>
                              <Square className='h-3 w-3' /> 强制平仓
                            </Button>
                          )}
                          <Button variant='ghost' size='sm' className='h-6 w-6 p-0 text-red-500' onClick={() => handleDelete(cfg.id)}>
                            <Trash2 className='h-3 w-3' />
                          </Button>
                        </div>
                      </div>

                      <div className='grid grid-cols-3 gap-x-4 gap-y-1 text-[10px]'>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground'>量能阈值</span>
                          <Input
                            className='h-5 w-14 text-[10px] text-right px-1'
                            defaultValue={cfg.spike_multiplier}
                            onBlur={e => handleUpdate(cfg.id, 'spike_multiplier', e.target.value)}
                            type='number'
                          />
                          <span className='text-muted-foreground'>x</span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground text-green-600'>止盈</span>
                          <Input
                            className='h-5 w-14 text-[10px] text-right px-1'
                            defaultValue={cfg.tp_pct}
                            onBlur={e => handleUpdate(cfg.id, 'tp_pct', e.target.value)}
                            type='number'
                            step='0.1'
                          />
                          <span className='text-muted-foreground'>%</span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground text-red-600'>止损</span>
                          <Input
                            className='h-5 w-14 text-[10px] text-right px-1'
                            defaultValue={cfg.sl_pct}
                            onBlur={e => handleUpdate(cfg.id, 'sl_pct', e.target.value)}
                            type='number'
                            step='0.1'
                          />
                          <span className='text-muted-foreground'>%</span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground'>最长持仓</span>
                          <Input
                            className='h-5 w-14 text-[10px] text-right px-1'
                            defaultValue={cfg.max_hold_seconds}
                            onBlur={e => handleUpdate(cfg.id, 'max_hold_seconds', e.target.value)}
                            type='number'
                          />
                          <span className='text-muted-foreground'>s</span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground'>金额</span>
                          <Input
                            className='h-5 w-14 text-[10px] text-right px-1'
                            defaultValue={cfg.order_usd}
                            onBlur={e => handleUpdate(cfg.id, 'order_usd', e.target.value)}
                            type='number'
                          />
                          <span className='text-muted-foreground'>$</span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground'>CVD比</span>
                          <Input
                            className='h-5 w-14 text-[10px] text-right px-1'
                            defaultValue={cfg.cvd_confirm_ratio}
                            onBlur={e => handleUpdate(cfg.id, 'cvd_confirm_ratio', e.target.value)}
                            type='number'
                            step='0.05'
                          />
                        </div>
                        <div className='flex items-center justify-between col-span-3'>
                          <span className='text-muted-foreground'>逆势模式 (CVD向上→做空)</span>
                          <Switch
                            checked={cfg.reverse_signal}
                            onCheckedChange={async v => {
                              await hyperliquidApiPatch(`${API}/configs/${cfg.id}`, { reverse_signal: v })
                              fetchConfigs()
                            }}
                          />
                        </div>
                      </div>

                      {cfg.last_triggered_at && (
                        <p className='text-[10px] text-muted-foreground'>
                          上次触发: {new Date(cfg.last_triggered_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                          {cfg.last_direction && ` (${cfg.last_direction})`}
                          {cfg.last_entry_price != null && ` @ $${Number(cfg.last_entry_price).toLocaleString()}`}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <p className='text-[10px] text-muted-foreground leading-relaxed'>
              策略逻辑: 每 5 秒扫描 CVD 1m 桶，当最新分钟 volume 超过均值 N 倍且 CVD 方向确认时市价追单。
              持仓后每 5 秒检查盈亏: 达到止盈 % 或止损 % 立即平仓，超过最长持仓时间兜底平仓。
              需要先在 CVD Monitor 中启用对应币种的监控。
            </p>
          </div>
        ) : (
          /* 交易日志 */
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1'>
                <Button
                  variant={tradeFilter === 'trades' ? 'default' : 'outline'}
                  size='sm' className='h-6 text-[10px] px-2'
                  onClick={() => setTradeFilter('trades')}
                >真实交易</Button>
                <Button
                  variant={tradeFilter === 'signals' ? 'default' : 'outline'}
                  size='sm' className='h-6 text-[10px] px-2'
                  onClick={() => setTradeFilter('signals')}
                >信号/跳过</Button>
                <Button
                  variant={tradeFilter === 'all' ? 'default' : 'outline'}
                  size='sm' className='h-6 text-[10px] px-2'
                  onClick={() => setTradeFilter('all')}
                >全部</Button>
                <span className='text-[10px] text-muted-foreground ml-2'>
                  共 {tradeTotal} 条 · 第 {tradePage}/{tradeTotalPages} 页
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <Button variant='ghost' size='sm' className='h-7 text-xs gap-1' onClick={fetchTrades}>
                  <RefreshCw className='h-3 w-3' /> 刷新
                </Button>
                <Button variant='ghost' size='sm' className='h-7 text-xs gap-1 text-red-500 hover:text-red-600' onClick={() => handleClearTrades()} disabled={clearing}>
                  <RotateCcw className='h-3 w-3' /> 清除全部
                </Button>
              </div>
            </div>
            {trades.length === 0 ? (
              <p className='text-center text-xs text-muted-foreground py-6'>暂无交易日志</p>
            ) : (
              <div className='overflow-x-auto max-h-[55vh]'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-[10px] w-28'>时间</TableHead>
                      <TableHead className='text-[10px] w-14'>币种</TableHead>
                      <TableHead className='text-[10px] w-14'>动作</TableHead>
                      <TableHead className='text-[10px]'>消息</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map(t => (
                      <TableRow key={t.id} className='text-[10px]'>
                        <TableCell className='font-mono text-muted-foreground py-1'>
                          {new Date(t.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Shanghai' })}
                        </TableCell>
                        <TableCell className='py-1'>{t.coin}</TableCell>
                        <TableCell className='py-1'>
                          <Badge variant={t.action === 'open' ? 'default' : t.action === 'close' ? 'secondary' : t.action === 'error' ? 'destructive' : 'outline'} className='text-[10px] px-1 py-0 h-4'>
                            {t.action}
                          </Badge>
                        </TableCell>
                        <TableCell className='py-1 max-w-xs truncate' title={t.message}>{t.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 分页控件 */}
            {tradeTotal > 0 && tradeTotalPages > 1 && (
              <div className='flex items-center justify-between border-t pt-2'>
                <span className='text-[10px] text-muted-foreground'>
                  第 {(tradePage - 1) * TRADES_PAGE_SIZE + 1}-{Math.min(tradePage * TRADES_PAGE_SIZE, tradeTotal)} 条，共 {tradeTotal} 条
                </span>
                <div className='flex items-center gap-1'>
                  <Button variant='outline' size='sm' className='h-6 w-6 p-0' disabled={tradePage <= 1} onClick={() => setTradePage(1)}>
                    <ChevronsLeft className='h-3 w-3' />
                  </Button>
                  <Button variant='outline' size='sm' className='h-6 w-6 p-0' disabled={tradePage <= 1} onClick={() => setTradePage(tradePage - 1)}>
                    <ChevronLeft className='h-3 w-3' />
                  </Button>
                  <span className='text-[10px] px-2 tabular-nums'>{tradePage} / {tradeTotalPages}</span>
                  <Button variant='outline' size='sm' className='h-6 w-6 p-0' disabled={tradePage >= tradeTotalPages} onClick={() => setTradePage(tradePage + 1)}>
                    <ChevronRight className='h-3 w-3' />
                  </Button>
                  <Button variant='outline' size='sm' className='h-6 w-6 p-0' disabled={tradePage >= tradeTotalPages} onClick={() => setTradePage(tradeTotalPages)}>
                    <ChevronsRight className='h-3 w-3' />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant='outline' size='sm' onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
