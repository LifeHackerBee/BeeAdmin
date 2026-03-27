import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Wallet, RefreshCw, Plus, RotateCcw, X, ScrollText,
} from 'lucide-react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import { useSimExchange, type SimPosition, type SimFill } from '../hooks/use-sim-exchange'

function fmtPrice(v: number | null | undefined): string {
  if (v == null) return '-'
  return v >= 1000 ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `$${v.toFixed(4)}`
}

export function SimExchangePanel() {
  const sim = useSimExchange()
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false)
  const [fillsDialogOpen, setFillsDialogOpen] = useState(false)
  const [newBalance, setNewBalance] = useState('')

  // 市价单表单
  const [orderCoin, setOrderCoin] = useState('BTC')
  const [orderDir, setOrderDir] = useState<'long' | 'short'>('long')
  const [orderSize, setOrderSize] = useState('1000')
  const [orderTp, setOrderTp] = useState('')
  const [orderSl, setOrderSl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const account = sim.account

  const handleMarketOrder = async () => {
    if (!orderCoin || !orderSize) return
    setSubmitting(true)
    try {
      await sim.marketOrder({
        coin: orderCoin,
        direction: orderDir,
        size_usd: parseFloat(orderSize),
        take_profit: orderTp ? parseFloat(orderTp) : undefined,
        stop_loss: orderSl ? parseFloat(orderSl) : undefined,
      })
      setOrderDialogOpen(false)
    } catch { /* */ }
    finally { setSubmitting(false) }
  }

  const handleSetBalance = async () => {
    const val = parseFloat(newBalance)
    if (isNaN(val) || val < 0) return
    await sim.setBalance(val)
    setBalanceDialogOpen(false)
  }

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base flex items-center gap-2'>
            <Wallet className='h-4 w-4 text-purple-500' />
            模拟交易所
          </CardTitle>
          <div className='flex items-center gap-1.5'>
            <Button variant='outline' size='sm' className='h-7 text-xs gap-1' onClick={sim.refetch} disabled={sim.loading}>
              <RefreshCw className={`h-3 w-3 ${sim.loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant='outline' size='sm' className='h-7 text-xs gap-1' onClick={() => setOrderDialogOpen(true)}>
              <Plus className='h-3 w-3' /> 下单
            </Button>
            <Button variant='outline' size='sm' className='h-7 text-xs gap-1' onClick={() => { setNewBalance(String(account?.balance ?? 20000)); setBalanceDialogOpen(true) }}>
              <Wallet className='h-3 w-3' /> 设置余额
            </Button>
            <Button variant='ghost' size='sm' className='h-7 text-xs gap-1 text-red-500' onClick={sim.resetAccount}>
              <RotateCcw className='h-3 w-3' /> 重置
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        {/* TP/SL 触发通知 */}
        {sim.lastTpSlEvents.length > 0 && (
          <div className='space-y-1'>
            {sim.lastTpSlEvents.map((e, i) => (
              <div key={i} className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-2 ${e.pnl >= 0 ? 'bg-green-50 dark:bg-green-950/20 text-green-700' : 'bg-red-50 dark:bg-red-950/20 text-red-700'}`}>
                <span className='font-bold'>{e.reason}触发</span>
                <span className='font-mono'>{e.coin}</span>
                <span className={`font-mono font-bold ${e.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {e.pnl >= 0 ? '+' : ''}${e.pnl.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 账户概览 — 突出显示 */}
        {account && (
          <div className='grid grid-cols-4 gap-3'>
            <div className='rounded-lg border p-3 text-center'>
              <div className='text-[10px] text-muted-foreground mb-1'>余额</div>
              <div className='text-lg font-bold font-mono'>${account.balance.toFixed(2)}</div>
            </div>
            <div className='rounded-lg border p-3 text-center'>
              <div className='text-[10px] text-muted-foreground mb-1'>净值</div>
              <div className='text-lg font-bold font-mono'>${(account.equity ?? account.balance).toFixed(2)}</div>
            </div>
            <div className='rounded-lg border p-3 text-center'>
              <div className='text-[10px] text-muted-foreground mb-1'>浮盈亏</div>
              <div className={`text-lg font-bold font-mono ${(account.unrealized_pnl ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(account.unrealized_pnl ?? 0) >= 0 ? '+' : ''}${(account.unrealized_pnl ?? 0).toFixed(2)}
              </div>
            </div>
            <div className='rounded-lg border p-3 text-center'>
              <div className='text-[10px] text-muted-foreground mb-1'>已实现</div>
              <div className={`text-lg font-bold font-mono ${account.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {account.total_pnl >= 0 ? '+' : ''}${account.total_pnl.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* 持仓 + 最近成交 — 左右两栏 */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
          {/* 左栏: 持仓 */}
          <div className='border rounded-lg'>
            <div className='flex items-center justify-between px-3 py-2 border-b bg-muted/30'>
              <span className='text-xs font-medium'>持仓 {sim.positions.length > 0 ? `(${sim.positions.length})` : ''}</span>
            </div>
            <div className='p-2'>
              {sim.positions.length > 0 ? (
                <div className='space-y-2'>
                  {sim.positions.map((pos) => (
                    <PositionCard key={pos.id} pos={pos}
                      onClose={(ratio) => sim.closePosition(pos.coin, ratio)}
                      onUpdateTpSl={(tp, sl) => sim.updateTpSl(pos.id, tp, sl)} />
                  ))}
                </div>
              ) : (
                <div className='text-xs text-muted-foreground py-6 text-center'>空仓</div>
              )}
              {/* 挂单 */}
              {sim.orders.length > 0 && (
                <div className='mt-2 pt-2 border-t space-y-1'>
                  <span className='text-[10px] font-medium text-muted-foreground'>挂单 ({sim.orders.length})</span>
                  {sim.orders.map((order) => (
                    <div key={order.id} className='flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded bg-muted/30'>
                      <Badge variant='outline' className='text-[10px] px-1 py-0 h-4'>{order.coin}</Badge>
                      <span className={order.side === 'buy' ? 'text-green-500' : 'text-red-500'}>{order.side}</span>
                      <span>{fmtPrice(order.price)}</span>
                      <span className='text-muted-foreground'>${order.size_usd.toFixed(0)}</span>
                      <Button variant='ghost' size='sm' className='h-5 w-5 p-0 ml-auto text-red-500' onClick={() => sim.cancelOrder(order.id)}>
                        <X className='h-3 w-3' />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右栏: 最近成交 */}
          <div className='border rounded-lg'>
            <div className='flex items-center justify-between px-3 py-2 border-b bg-muted/30'>
              <span className='text-xs font-medium'>最近成交</span>
              {sim.fills.length > 0 && (
                <Button variant='ghost' size='sm' className='h-5 text-[10px] px-1.5 gap-1' onClick={() => setFillsDialogOpen(true)}>
                  <ScrollText className='h-3 w-3' /> 全部
                </Button>
              )}
            </div>
            <div className='p-2'>
              {sim.fills.length > 0 ? (
                <div className='space-y-0.5'>
                  {sim.fills.slice(0, 8).map((fill) => (
                    <FillRow key={fill.id} fill={fill} />
                  ))}
                </div>
              ) : (
                <div className='text-xs text-muted-foreground py-6 text-center'>暂无成交</div>
              )}
            </div>
          </div>
        </div>

        {!account && !sim.loading && (
          <div className='text-center py-4 text-muted-foreground text-xs'>模拟交易所未初始化，点击操作自动创建</div>
        )}
      </CardContent>

      {/* 下单弹窗 */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader><DialogTitle className='text-sm'>市价下单</DialogTitle></DialogHeader>
          <div className='space-y-3 py-2'>
            <div className='grid grid-cols-2 gap-2'>
              <div className='space-y-1'>
                <Label className='text-xs'>币种</Label>
                <Input value={orderCoin} onChange={(e) => setOrderCoin(e.target.value.toUpperCase())} className='h-8 text-xs' />
              </div>
              <div className='space-y-1'>
                <Label className='text-xs'>方向</Label>
                <Select value={orderDir} onValueChange={(v) => setOrderDir(v as 'long' | 'short')}>
                  <SelectTrigger className='h-8 text-xs'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='long'><span className='text-green-500'>做多 Long</span></SelectItem>
                    <SelectItem value='short'><span className='text-red-500'>做空 Short</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='space-y-1'>
              <Label className='text-xs'>金额 (USD)</Label>
              <Input type='number' value={orderSize} onChange={(e) => setOrderSize(e.target.value)} className='h-8 text-xs' />
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <div className='space-y-1'>
                <Label className='text-xs'>止盈 (可选)</Label>
                <Input type='number' value={orderTp} onChange={(e) => setOrderTp(e.target.value)} className='h-8 text-xs' placeholder='TP' />
              </div>
              <div className='space-y-1'>
                <Label className='text-xs'>止损 (可选)</Label>
                <Input type='number' value={orderSl} onChange={(e) => setOrderSl(e.target.value)} className='h-8 text-xs' placeholder='SL' />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOrderDialogOpen(false)}>取消</Button>
            <Button onClick={handleMarketOrder} disabled={submitting} variant={orderDir === 'long' ? 'default' : 'destructive'}>
              {submitting ? '下单中...' : orderDir === 'long' ? '做多' : '做空'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 设置余额弹窗 */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent className='sm:max-w-xs'>
          <DialogHeader><DialogTitle className='text-sm'>设置余额</DialogTitle></DialogHeader>
          <div className='space-y-2 py-2'>
            <Label className='text-xs'>新余额 (USD)</Label>
            <Input type='number' value={newBalance} onChange={(e) => setNewBalance(e.target.value)}
              className='h-8 text-xs' onKeyDown={(e) => e.key === 'Enter' && handleSetBalance()} />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setBalanceDialogOpen(false)}>取消</Button>
            <Button onClick={handleSetBalance}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 全部成交记录弹窗 */}
      <FillsDialog open={fillsDialogOpen} onOpenChange={setFillsDialogOpen} />
    </Card>
  )
}

// ── 成交行 ──
function FillRow({ fill }: { fill: SimFill }) {
  return (
    <div className='flex items-center gap-2 text-[10px] font-mono py-0.5'>
      <Badge variant='outline' className='text-[10px] px-1 py-0 h-4'>{fill.coin}</Badge>
      <span className={fill.side === 'buy' ? 'text-green-500' : 'text-red-500'}>{fill.side}</span>
      <span>{fmtPrice(fill.price)}</span>
      <span className='text-muted-foreground'>${fill.size_usd.toFixed(0)}</span>
      {fill.pnl != null && fill.pnl !== 0 && (
        <span className={fill.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
          {fill.pnl >= 0 ? '+' : ''}${fill.pnl.toFixed(2)}
        </span>
      )}
      <span className='text-muted-foreground ml-auto'>
        {new Date(fill.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

// ── 全部成交弹窗（分页） ──
function FillsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const PAGE_SIZE = 20
  const [fills, setFills] = useState<SimFill[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const offset = (p - 1) * PAGE_SIZE
      const res = await hyperliquidApiGet<{ success: boolean; fills: SimFill[]; total: number }>(
        `/api/sim_exchange/fills?limit=${PAGE_SIZE}&offset=${offset}`
      )
      if (res.success) { setFills(res.fills); setTotal(res.total); setPage(p) }
    } catch { /* */ }
    finally { setLoading(false) }
  }, [])

  // 打开时加载第一页
  useState(() => { if (open) fetchPage(1) })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) fetchPage(1) }}>
      <DialogContent className='sm:max-w-xl max-h-[80vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-sm'>
            <ScrollText className='h-4 w-4' />
            成交记录
            {total > 0 && <Badge variant='secondary' className='text-[10px] px-1.5 py-0'>{total}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto min-h-0'>
          {loading ? (
            <div className='py-8 text-center text-muted-foreground text-sm'>加载中...</div>
          ) : fills.length === 0 ? (
            <div className='py-8 text-center text-muted-foreground text-sm'>暂无成交</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-[10px] h-7'>币种</TableHead>
                  <TableHead className='text-[10px] h-7'>方向</TableHead>
                  <TableHead className='text-[10px] h-7'>价格</TableHead>
                  <TableHead className='text-[10px] h-7'>金额</TableHead>
                  <TableHead className='text-[10px] h-7'>手续费</TableHead>
                  <TableHead className='text-[10px] h-7'>盈亏</TableHead>
                  <TableHead className='text-[10px] h-7'>类型</TableHead>
                  <TableHead className='text-[10px] h-7'>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fills.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className='text-xs'>{f.coin}</TableCell>
                    <TableCell><span className={`text-xs ${f.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>{f.side}</span></TableCell>
                    <TableCell className='text-xs font-mono'>{fmtPrice(f.price)}</TableCell>
                    <TableCell className='text-xs font-mono'>${f.size_usd.toFixed(0)}</TableCell>
                    <TableCell className='text-xs font-mono text-muted-foreground'>${f.fee.toFixed(2)}</TableCell>
                    <TableCell>
                      {f.pnl != null && f.pnl !== 0 ? (
                        <span className={`text-xs font-mono ${f.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {f.pnl >= 0 ? '+' : ''}${f.pnl.toFixed(2)}
                        </span>
                      ) : <span className='text-xs text-muted-foreground'>-</span>}
                    </TableCell>
                    <TableCell className='text-[10px] text-muted-foreground'>{f.order_type}</TableCell>
                    <TableCell className='text-[10px] text-muted-foreground'>
                      {new Date(f.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className='flex items-center justify-between pt-2 border-t'>
            <span className='text-[10px] text-muted-foreground'>共 {total} 条 · 第 {page}/{totalPages} 页</span>
            <div className='flex items-center gap-1'>
              <Button variant='outline' size='sm' className='h-7 text-xs px-2' disabled={page <= 1 || loading} onClick={() => fetchPage(page - 1)}>
                上一页
              </Button>
              <Button variant='outline' size='sm' className='h-7 text-xs px-2' disabled={page >= totalPages || loading} onClick={() => fetchPage(page + 1)}>
                下一页
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── 持仓卡片 ──
function PositionCard({ pos, onClose, onUpdateTpSl }: {
  pos: SimPosition
  onClose: (ratio: number) => void
  onUpdateTpSl: (tp: number | null, sl: number | null) => void
}) {
  const isLong = pos.direction === 'long'
  const pnl = pos.unrealized_pnl ?? 0
  const pnlPct = pos.unrealized_pnl_pct ?? 0
  const [editing, setEditing] = useState(false)
  const [editTp, setEditTp] = useState(String(pos.take_profit ?? ''))
  const [editSl, setEditSl] = useState(String(pos.stop_loss ?? ''))

  const handleSaveTpSl = () => {
    onUpdateTpSl(parseFloat(editTp) || null, parseFloat(editSl) || null)
    setEditing(false)
  }

  return (
    <div className={`rounded-lg border p-3 ${isLong ? 'border-green-500/20 bg-green-50/30 dark:bg-green-950/10' : 'border-red-500/20 bg-red-50/30 dark:bg-red-950/10'}`}>
      {/* 第一行: 币种 + 方向 + 盈亏 + 操作 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-bold'>{pos.coin}</span>
          <Badge variant='outline' className={`text-[10px] ${isLong ? 'text-green-600 border-green-500/30' : 'text-red-600 border-red-500/30'}`}>
            {isLong ? '做多' : '做空'}
          </Badge>
          <span className='text-xs font-mono text-muted-foreground'>${pos.size_usd.toFixed(0)}</span>
        </div>
        <div className='flex items-center gap-2'>
          <span className={`text-sm font-bold font-mono ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            <span className='text-[10px] ml-0.5'>({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
          </span>
          <Button variant='outline' size='sm' className='h-6 text-[10px] px-2' onClick={() => onClose(0.5)}>减半</Button>
          <Button variant='outline' size='sm' className='h-6 text-[10px] px-2 text-red-500 border-red-500/30' onClick={() => onClose(1)}>平仓</Button>
        </div>
      </div>

      {/* 第二行: 入场价 → 现价 + TP/SL */}
      <div className='flex items-center justify-between mt-2 text-xs'>
        <div className='flex items-center gap-3 font-mono'>
          <div>
            <span className='text-muted-foreground'>入场 </span>
            <span className='font-medium'>{fmtPrice(pos.entry_price)}</span>
          </div>
          <span className='text-muted-foreground'>→</span>
          <div>
            <span className='text-muted-foreground'>现价 </span>
            <span className='font-medium'>{fmtPrice(pos.current_price)}</span>
          </div>
        </div>
        <button onClick={() => { setEditTp(String(pos.take_profit ?? '')); setEditSl(String(pos.stop_loss ?? '')); setEditing(!editing) }}
          className='text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer'>
          {pos.take_profit || pos.stop_loss ? (
            <span>
              {pos.take_profit != null && <span className='text-green-600'>TP {fmtPrice(pos.take_profit)}</span>}
              {pos.take_profit && pos.stop_loss && <span className='text-muted-foreground mx-1'>|</span>}
              {pos.stop_loss != null && <span className='text-red-600'>SL {fmtPrice(pos.stop_loss)}</span>}
            </span>
          ) : (
            <span className='text-muted-foreground/50 underline'>设置 TP/SL</span>
          )}
        </button>
      </div>

      {/* TP/SL 编辑行 */}
      {editing && (
        <div className='flex items-center gap-2 mt-2 pt-2 border-t'>
          <span className='text-[10px] text-green-600'>TP</span>
          <Input type='number' value={editTp} onChange={(e) => setEditTp(e.target.value)}
            className='h-6 text-[10px] w-24 font-mono' placeholder='止盈价' />
          <span className='text-[10px] text-red-600'>SL</span>
          <Input type='number' value={editSl} onChange={(e) => setEditSl(e.target.value)}
            className='h-6 text-[10px] w-24 font-mono' placeholder='止损价' />
          <Button size='sm' className='h-6 text-[10px] px-2' onClick={handleSaveTpSl}>保存</Button>
          <Button variant='ghost' size='sm' className='h-6 text-[10px] px-2' onClick={() => setEditing(false)}>取消</Button>
          {(pos.take_profit || pos.stop_loss) && (
            <Button variant='ghost' size='sm' className='h-6 text-[10px] px-2 text-red-500'
              onClick={() => { onUpdateTpSl(null, null); setEditing(false) }}>清除</Button>
          )}
        </div>
      )}
    </div>
  )
}

