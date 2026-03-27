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
  Wallet, RefreshCw, Plus, Trash2, RotateCcw, X, ScrollText,
} from 'lucide-react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import { useSimExchange, type SimPosition, type SimOrder, type SimFill } from '../hooks/use-sim-exchange'

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
  const winRate = account && account.total_trades > 0
    ? (account.win_count / account.total_trades * 100).toFixed(0) : '0'

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
        {/* 账户概览 */}
        {account && (
          <div className='flex items-center gap-4 flex-wrap text-xs'>
            <div>
              <span className='text-muted-foreground'>余额</span>
              <span className='font-mono font-bold ml-1'>${account.balance.toFixed(2)}</span>
            </div>
            <div>
              <span className='text-muted-foreground'>净值</span>
              <span className='font-mono font-bold ml-1'>${(account.equity ?? account.balance).toFixed(2)}</span>
            </div>
            <div>
              <span className='text-muted-foreground'>浮盈亏</span>
              <span className={`font-mono font-bold ml-1 ${(account.unrealized_pnl ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(account.unrealized_pnl ?? 0) >= 0 ? '+' : ''}${(account.unrealized_pnl ?? 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className='text-muted-foreground'>已实现</span>
              <span className={`font-mono ml-1 ${account.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {account.total_pnl >= 0 ? '+' : ''}${account.total_pnl.toFixed(2)}
              </span>
            </div>
            <div>
              <span className='text-muted-foreground'>胜率</span>
              <span className='ml-1'>{winRate}% ({account.win_count}W/{account.loss_count}L)</span>
            </div>
          </div>
        )}

        {/* 持仓列表 — 始终显示 */}
        <div>
          <div className='text-xs font-medium text-muted-foreground mb-1'>
            持仓 {sim.positions.length > 0 ? `(${sim.positions.length})` : ''}
          </div>
          {sim.positions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-[10px] h-7'>币种</TableHead>
                  <TableHead className='text-[10px] h-7'>方向</TableHead>
                  <TableHead className='text-[10px] h-7'>入场价</TableHead>
                  <TableHead className='text-[10px] h-7'>数量</TableHead>
                  <TableHead className='text-[10px] h-7'>现价</TableHead>
                  <TableHead className='text-[10px] h-7'>浮盈亏</TableHead>
                  <TableHead className='text-[10px] h-7'>TP/SL</TableHead>
                  <TableHead className='text-[10px] h-7 w-16'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sim.positions.map((pos) => (
                  <PositionRow key={pos.id} pos={pos}
                    onClose={(ratio) => sim.closePosition(pos.coin, ratio)}
                    onUpdateTpSl={(tp, sl) => sim.updateTpSl(pos.id, tp, sl)} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className='text-xs text-muted-foreground py-2 text-center border rounded-md'>空仓 — 无持仓</div>
          )}
        </div>

        {/* 挂单列表 */}
        {sim.orders.length > 0 && (
          <div>
            <div className='text-xs font-medium text-muted-foreground mb-1'>挂单 ({sim.orders.length})</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-[10px] h-7'>币种</TableHead>
                  <TableHead className='text-[10px] h-7'>方向</TableHead>
                  <TableHead className='text-[10px] h-7'>价格</TableHead>
                  <TableHead className='text-[10px] h-7'>金额</TableHead>
                  <TableHead className='text-[10px] h-7'>时间</TableHead>
                  <TableHead className='text-[10px] h-7 w-16'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sim.orders.map((order) => (
                  <OrderRow key={order.id} order={order} onCancel={() => sim.cancelOrder(order.id)} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 最近成交 (最多5条) */}
        {sim.fills.length > 0 && (
          <div>
            <div className='flex items-center justify-between mb-1'>
              <span className='text-xs font-medium text-muted-foreground'>最近成交</span>
              <Button variant='ghost' size='sm' className='h-6 text-[10px] px-2 gap-1' onClick={() => setFillsDialogOpen(true)}>
                <ScrollText className='h-3 w-3' /> 查看全部
              </Button>
            </div>
            <div className='space-y-0.5'>
              {sim.fills.slice(0, 5).map((fill) => (
                <FillRow key={fill.id} fill={fill} />
              ))}
            </div>
          </div>
        )}

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

// ── 持仓行 ──
function PositionRow({ pos, onClose, onUpdateTpSl }: {
  pos: SimPosition
  onClose: (ratio: number) => void
  onUpdateTpSl: (tp: number | null, sl: number | null) => void
}) {
  const isLong = pos.direction === 'long'
  const pnl = pos.unrealized_pnl ?? 0
  const [editing, setEditing] = useState(false)
  const [editTp, setEditTp] = useState(String(pos.take_profit ?? ''))
  const [editSl, setEditSl] = useState(String(pos.stop_loss ?? ''))

  const handleSave = () => {
    const tp = parseFloat(editTp) || null
    const sl = parseFloat(editSl) || null
    onUpdateTpSl(tp, sl)
    setEditing(false)
  }

  return (
    <>
      <TableRow>
        <TableCell className='text-xs font-medium'>{pos.coin}</TableCell>
        <TableCell>
          <Badge variant='outline' className={`text-[10px] ${isLong ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30'}`}>
            {isLong ? '多' : '空'}
          </Badge>
        </TableCell>
        <TableCell className='text-xs font-mono'>{fmtPrice(pos.entry_price)}</TableCell>
        <TableCell className='text-xs font-mono'>${pos.size_usd.toFixed(0)}</TableCell>
        <TableCell className='text-xs font-mono'>{fmtPrice(pos.current_price)}</TableCell>
        <TableCell className={`text-xs font-mono ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
          {pos.unrealized_pnl_pct != null && <span className='text-[10px] ml-0.5'>({pos.unrealized_pnl_pct.toFixed(1)}%)</span>}
        </TableCell>
        <TableCell>
          <button onClick={() => { setEditTp(String(pos.take_profit ?? '')); setEditSl(String(pos.stop_loss ?? '')); setEditing(!editing) }}
            className='text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer'>
            {pos.take_profit || pos.stop_loss ? (
              <>
                {pos.take_profit != null && <span className='text-green-500/70'>TP {fmtPrice(pos.take_profit)}</span>}
                {pos.take_profit && pos.stop_loss && ' '}
                {pos.stop_loss != null && <span className='text-red-500/70'>SL {fmtPrice(pos.stop_loss)}</span>}
              </>
            ) : (
              <span className='text-muted-foreground/50'>设置 TP/SL</span>
            )}
          </button>
        </TableCell>
        <TableCell>
          <div className='flex gap-1'>
            <Button variant='ghost' size='sm' className='h-6 text-[10px] px-1.5' onClick={() => onClose(0.5)}>减半</Button>
            <Button variant='ghost' size='sm' className='h-6 text-[10px] px-1.5 text-red-500' onClick={() => onClose(1)}>
              <X className='h-3 w-3' />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {editing && (
        <TableRow>
          <TableCell colSpan={8} className='py-1.5 px-3 bg-muted/30'>
            <div className='flex items-center gap-2'>
              <span className='text-[10px] text-muted-foreground w-8'>TP</span>
              <Input type='number' value={editTp} onChange={(e) => setEditTp(e.target.value)}
                className='h-6 text-[10px] w-28 font-mono' placeholder='止盈价' />
              <span className='text-[10px] text-muted-foreground w-8'>SL</span>
              <Input type='number' value={editSl} onChange={(e) => setEditSl(e.target.value)}
                className='h-6 text-[10px] w-28 font-mono' placeholder='止损价' />
              <Button size='sm' className='h-6 text-[10px] px-2' onClick={handleSave}>保存</Button>
              <Button variant='ghost' size='sm' className='h-6 text-[10px] px-2' onClick={() => setEditing(false)}>取消</Button>
              {(pos.take_profit || pos.stop_loss) && (
                <Button variant='ghost' size='sm' className='h-6 text-[10px] px-2 text-red-500'
                  onClick={() => { onUpdateTpSl(null, null); setEditing(false) }}>清除</Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── 挂单行 ──
function OrderRow({ order, onCancel }: { order: SimOrder; onCancel: () => void }) {
  return (
    <TableRow>
      <TableCell className='text-xs font-medium'>{order.coin}</TableCell>
      <TableCell>
        <Badge variant='outline' className={`text-[10px] ${order.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
          {order.side}
        </Badge>
      </TableCell>
      <TableCell className='text-xs font-mono'>{fmtPrice(order.price)}</TableCell>
      <TableCell className='text-xs font-mono'>${order.size_usd.toFixed(0)}</TableCell>
      <TableCell className='text-[10px] text-muted-foreground'>
        {new Date(order.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
      </TableCell>
      <TableCell>
        <Button variant='ghost' size='sm' className='h-6 text-[10px] px-1.5 text-red-500' onClick={onCancel}>
          <Trash2 className='h-3 w-3' />
        </Button>
      </TableCell>
    </TableRow>
  )
}
