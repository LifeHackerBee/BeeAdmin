/**
 * 钱包地址实时查询：图表化展示 Total Balance、PnL、环形图、当前持仓表
 */

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { AlertCircle, RefreshCw, TrendingUp, ListOrdered, Sparkles } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWalletLive, type WalletLiveData, type UserFill, type ClearinghouseStateInner } from '../hooks/use-wallet-live'
import { useAnalyzer } from '../hooks/use-analyzer'
import { AnalysisResult } from './analysis-result'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { WalletAddressCell } from '../../components/wallet-address-cell'

function formatCurrency(v: number | string | undefined | null): string {
  if (v === undefined || v === null) return '-'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (Number.isNaN(n)) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatShortCurrency(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

/** 从 portfolio 历史中取最接近目标时间的账户价值 */
function valueAtTime(history: [number, number][], targetTimeMs: number): number | null {
  if (!history.length) return null
  const sorted = [...history].sort((a, b) => a[0] - b[0])
  let best = sorted[0]
  for (const p of sorted) {
    if (p[0] > targetTimeMs) break
    best = p
  }
  return best[1]
}

const DONUT_COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#eab308']

function BalanceChart({ data }: { data: WalletLiveData }) {
  const portfolioByFrame: Record<string, [number, number][]> = {}
  if (Array.isArray(data.portfolio)) {
    for (const item of data.portfolio) {
      const [key, val] = item
      if (val?.accountValueHistory?.length) portfolioByFrame[key] = val.accountValueHistory
    }
  }
  const weekHistory = portfolioByFrame.week ?? portfolioByFrame.day ?? []
  const sorted = weekHistory
    .map(([t, v]) => ({
      time: format(new Date(t), 'MM/dd', { locale: zhCN }),
      fullTime: format(new Date(t), 'yyyy-MM-dd HH:mm', { locale: zhCN }),
      balance: v,
      ts: t,
    }))
    .sort((a, b) => a.ts - b.ts)
  if (sorted.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Total Balance</CardTitle>
        <CardDescription>账户总资产随时间变化</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatShortCurrency(v)} />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="rounded-md border bg-background px-3 py-2 text-sm shadow">
                    {payload[0].payload?.fullTime} — {formatCurrency(payload[0].payload?.balance)}
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#balanceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

const RECENT_WIN_RATE_TRADES = 200

/**
 * 从成交记录计算最近 N 笔平仓胜率（与后端 analyzer 一致）
 * - 只统计 closedPnl !== 0 的成交（有已实现盈亏的平仓）
 * - 按时间升序后取最后 N 笔 = 时间上最近的 N 笔
 */
function getRecentWinRate(fills: UserFill[], recentN: number = RECENT_WIN_RATE_TRADES) {
  const withPnl = fills
    .filter((f) => parseFloat(f.closedPnl ?? '0') !== 0)
    .map((f) => ({ time: f.time ?? 0, pnl: parseFloat(f.closedPnl ?? '0') }))
  const sorted = [...withPnl].sort((a, b) => a.time - b.time)
  const recent = sorted.slice(-recentN)
  if (recent.length === 0) return null
  const wins = recent.filter((r) => r.pnl > 0).length
  const losses = recent.length - wins
  return {
    recentTrades: recent.length,
    winRate: Math.round((wins / recent.length) * 10000) / 100,
    winCount: wins,
    lossCount: losses,
  }
}

function RecentWinRateModule({ fills }: { fills: UserFill[] }) {
  const stat = getRecentWinRate(fills)
  return (
    <Card id="analyzer-recent-win-rate" className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="rounded-md bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 text-amber-700 dark:text-amber-300 font-medium">
            胜率统计
          </span>
        </CardTitle>
        <CardDescription>
          按时间取最近 {RECENT_WIN_RATE_TRADES} 条有已实现盈亏的成交，胜率 = 盈利笔数 ÷ 总笔数
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {stat ? (
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold tabular-nums ${
                  stat.winRate >= 50 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                }`}
              >
                {stat.winRate}%
              </span>
              <span className="text-sm text-muted-foreground">最近 {stat.recentTrades} 笔</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                胜 {stat.winCount}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                负 {stat.lossCount}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无平仓数据</p>
        )}
      </CardContent>
    </Card>
  )
}

function PnLCards({ data }: { data: WalletLiveData }) {
  const raw = data.clearinghouse
  const ch: ClearinghouseStateInner | null | undefined = raw
    ? 'clearinghouseState' in raw && raw.clearinghouseState != null
      ? raw.clearinghouseState
      : (raw as ClearinghouseStateInner)
    : null
  const currentVal =
    ch?.marginSummary?.accountValue != null ? parseFloat(ch.marginSummary.accountValue) : null
  const portfolioByFrame: Record<string, [number, number][]> = {}
  if (Array.isArray(data.portfolio)) {
    for (const item of data.portfolio) {
      const [key, val] = item
      if (val?.accountValueHistory?.length) portfolioByFrame[key] = val.accountValueHistory
    }
  }
  const dayHistory = portfolioByFrame.day ?? []
  const weekHistory = portfolioByFrame.week ?? []
  const now = Date.now()
  const v24h = valueAtTime(dayHistory.length >= 2 ? dayHistory : weekHistory, now - 24 * 60 * 60 * 1000)
  const v48h = valueAtTime(weekHistory, now - 48 * 60 * 60 * 1000)
  const v7d = valueAtTime(weekHistory, now - 7 * 24 * 60 * 60 * 1000)
  const v30d = valueAtTime(weekHistory, now - 30 * 24 * 60 * 60 * 1000)
  const base = currentVal ?? (dayHistory.length > 0 ? dayHistory[dayHistory.length - 1][1] : weekHistory.length > 0 ? weekHistory[weekHistory.length - 1][1] : null)
  const pnl24 = base != null && v24h != null ? base - v24h : null
  const pnl48 = base != null && v48h != null ? base - v48h : null
  const pnl7 = base != null && v7d != null ? base - v7d : null
  const pnl30 = base != null && v30d != null ? base - v30d : null
  const totalPnl = base != null && v30d != null ? base - v30d : pnl30

  const items: { label: string; value: number | null }[] = [
    { label: 'Total PnL', value: totalPnl },
    { label: '24h PnL', value: pnl24 },
    { label: '48h PnL', value: pnl48 },
    { label: '7d PnL', value: pnl7 },
    { label: '30d PnL', value: pnl30 },
  ]
  return (
    <div className="flex flex-col gap-3">
      {items.map(({ label, value }) => (
        <Card key={label}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p
              className={`text-lg font-semibold ${
                value == null ? 'text-muted-foreground' : (value >= 0 ? 'text-green-600' : 'text-red-600')
              }`}
            >
              {value != null ? formatCurrency(value) : '-'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SummaryDonuts({ data }: { data: WalletLiveData }) {
  const raw = data.clearinghouse
  const ch: ClearinghouseStateInner | null | undefined = raw
    ? 'clearinghouseState' in raw && raw.clearinghouseState != null
      ? raw.clearinghouseState
      : (raw as ClearinghouseStateInner)
    : null
  const accountValue = ch?.marginSummary?.accountValue != null ? parseFloat(ch.marginSummary.accountValue) : 0
  const totalNtlPos = ch?.marginSummary?.totalNtlPos != null ? parseFloat(ch.marginSummary.totalNtlPos) : 0
  const totalMarginUsed = ch?.marginSummary?.totalMarginUsed != null ? parseFloat(ch.marginSummary.totalMarginUsed) : 0
  const withdrawable = ch?.withdrawable != null ? parseFloat(ch.withdrawable) : 0
  const positionsCount =
    ch?.assetPositions?.filter((item: { position?: { szi?: string } }) => parseFloat(item?.position?.szi ?? '0') !== 0).length ?? 0
  const positionsWithLev = ch?.assetPositions?.filter((item: { position?: { szi?: string } }) => parseFloat(item?.position?.szi ?? '0') !== 0) ?? []
  const avgLeverage =
    positionsWithLev.length > 0
      ? positionsWithLev.reduce((acc, item) => acc + parseFloat(item?.position?.leverage?.value ?? '0'), 0) / positionsWithLev.length
      : 0

  const perpsData = [
    { name: '持仓价值', value: totalNtlPos, color: DONUT_COLORS[0] },
    { name: '其他', value: Math.max(0, accountValue - totalNtlPos), color: DONUT_COLORS[1] },
  ].filter((d) => d.value > 0)
  const accountData = [
    { name: '永续', value: accountValue, color: DONUT_COLORS[1] },
    { name: '现货', value: 0, color: DONUT_COLORS[2] },
  ].filter((d) => d.value > 0)
  if (accountData.length === 0 && accountValue > 0) accountData.push({ name: '账户', value: accountValue, color: DONUT_COLORS[1] })
  const marginData = [
    { name: '可提款', value: withdrawable, color: DONUT_COLORS[0] },
    { name: '已用', value: totalMarginUsed, color: DONUT_COLORS[1] },
  ].filter((d) => d.value > 0)
  const withdrawPct = accountValue > 0 ? (withdrawable / accountValue) * 100 : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Perps Position Value</CardTitle>
          <CardDescription>持仓 {positionsCount}，杠杆 {avgLeverage.toFixed(2)}x</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <p className="text-xl font-semibold">{formatCurrency(totalNtlPos)}</p>
          {perpsData.length > 0 && (
            <ResponsiveContainer width={80} height={80}>
              <PieChart>
                <Pie
                  data={perpsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={24}
                  outerRadius={36}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {perpsData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Account Total Value</CardTitle>
          <CardDescription>Perpetual {formatCurrency(accountValue)}，Spot $0</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <p className="text-xl font-semibold">{formatCurrency(accountValue)}</p>
          {accountData.length > 0 && (
            <ResponsiveContainer width={80} height={80}>
              <PieChart>
                <Pie
                  data={accountData}
                  cx="50%"
                  cy="50%"
                  innerRadius={24}
                  outerRadius={36}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {accountData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Free Margin Available</CardTitle>
          <CardDescription>Withdrawable {withdrawPct.toFixed(2)}%</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <p className="text-xl font-semibold">{formatCurrency(withdrawable)}</p>
          {marginData.length > 0 && (
            <ResponsiveContainer width={80} height={80}>
              <PieChart>
                <Pie
                  data={marginData}
                  cx="50%"
                  cy="50%"
                  innerRadius={24}
                  outerRadius={36}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {marginData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

type PositionRow = {
  coin: string
  side: 'Long' | 'Short'
  leverage: string
  value: number
  amount: number
  entryPrice: number
  unrealizedPnl: number
  returnPct: number
  funding: number
  liqPrice: number
}

function PositionsTable({ data }: { data: WalletLiveData }) {
  const raw = data.clearinghouse
  const ch: ClearinghouseStateInner | null | undefined = raw
    ? 'clearinghouseState' in raw && raw.clearinghouseState != null
      ? raw.clearinghouseState
      : (raw as ClearinghouseStateInner)
    : null
  const rows: PositionRow[] = []
  for (const item of ch?.assetPositions ?? []) {
    const pos = item?.position
    if (!pos) continue
    const szi = parseFloat(pos.szi ?? '0')
    if (szi === 0) continue
    const side: 'Long' | 'Short' = szi > 0 ? 'Long' : 'Short'
    const value = parseFloat(pos.positionValue ?? '0')
    const entryPrice = parseFloat(pos.entryPx ?? '0')
    const unrealizedPnl = parseFloat(pos.unrealizedPnl ?? '0')
    const returnPct = parseFloat(pos.returnOnEquity ?? '0') * 100
    const funding = pos.cumFunding?.allTime != null ? parseFloat(pos.cumFunding.allTime) : 0
    const liqPrice = parseFloat(pos.liquidationPx ?? '0')
    const lev = pos.leverage?.value ?? '0'
    rows.push({
      coin: pos.coin ?? '-',
      side,
      leverage: `${lev}X ${pos.leverage?.type === 'cross' ? 'Cross' : 'Isolated'}`,
      value,
      amount: Math.abs(szi),
      entryPrice,
      unrealizedPnl,
      returnPct,
      funding,
      liqPrice,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="h-4 w-4" />
          当前持仓 (Positions) — 共 {rows.length} 个
        </CardTitle>
        <CardDescription>Token、方向、杠杆、价值、数量、开仓价、盈亏、资金费、强平价</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">暂无持仓</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Token</TableHead>
                  <TableHead className="whitespace-nowrap">Side</TableHead>
                  <TableHead className="whitespace-nowrap">Leverage</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Value</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Amount</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Entry Price</TableHead>
                  <TableHead className="whitespace-nowrap text-right">PnL</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Funding</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Liq. Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.coin}-${i}`}>
                    <TableCell className="font-medium">{r.coin}</TableCell>
                    <TableCell>
                      <Badge variant={r.side === 'Long' ? 'default' : 'secondary'} className="text-xs">
                        {r.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.leverage}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(r.value)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {r.side === 'Short' ? '-' : ''}{r.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(r.entryPrice)}</TableCell>
                    <TableCell className={`text-right font-mono text-sm ${r.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {r.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(r.unrealizedPnl)} ({r.returnPct >= 0 ? '+' : ''}{r.returnPct.toFixed(2)}%)
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${r.funding >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(r.funding)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(r.liqPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FillsTable({ fills }: { fills: UserFill[] }) {
  const sorted = [...fills].sort((a, b) => (b.time ?? 0) - (a.time ?? 0)).slice(0, 50)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">最近成交 (Fills)</CardTitle>
        <CardDescription>展示最近 50 条</CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无成交</p>
        ) : (
          <div className="rounded-md border overflow-x-auto max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">时间</TableHead>
                  <TableHead className="whitespace-nowrap">币种</TableHead>
                  <TableHead className="whitespace-nowrap">方向</TableHead>
                  <TableHead className="whitespace-nowrap text-right">价格</TableHead>
                  <TableHead className="whitespace-nowrap text-right">数量</TableHead>
                  <TableHead className="whitespace-nowrap text-right">已实现盈亏</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((f, i) => (
                  <TableRow key={`${f.oid ?? i}-${f.time ?? i}`}>
                    <TableCell className="text-xs">{f.time ? format(f.time, 'MM/dd HH:mm', { locale: zhCN }) : '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{f.coin ?? '-'}</TableCell>
                    <TableCell className="text-xs">{f.dir ?? f.side ?? '-'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{f.px ?? '-'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{f.sz ?? '-'}</TableCell>
                    <TableCell className={`text-right font-mono text-sm ${parseFloat(f.closedPnl ?? '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(f.closedPnl)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const AUTO_REFRESH_INTERVAL_MS = 15_000

export function WalletLiveQuery() {
  const [inputAddr, setInputAddr] = useState('')
  const [aiDays, setAiDays] = useState(30)
  const { address, loading, refreshing, error, data, fetchLive, reset } = useWalletLive()
  const { analyze: runAnalyze, loading: analysisLoading, error: analysisError, data: analysisData, reset: resetAnalysis } = useAnalyzer()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleQuery = () => {
    fetchLive(inputAddr || address)
  }

  // 有地址且已成功拉过数据时，每 15 秒自动重新拉取数据（不刷新页面）
  useEffect(() => {
    if (!address || !data) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    intervalRef.current = setInterval(() => {
      fetchLive(address, { backgroundRefresh: true })
    }, AUTO_REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [address, data, fetchLive])

  return (
    <div className="flex flex-col space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            地址分析
          </CardTitle>
          <CardDescription>
            输入钱包地址，优先拉取实时数据（portfolio、clearinghouse、userFills）；可选进行 AI 分析。查询成功后每 15 秒自动刷新数据（不刷新页面）。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="live-address">钱包地址</Label>
            <div className="flex gap-2 flex-wrap">
              <Input
                id="live-address"
                placeholder="0x..."
                value={inputAddr || address}
                onChange={(e) => setInputAddr(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                disabled={loading}
                className="flex-1 min-w-[280px] font-mono"
              />
              <Button onClick={handleQuery} disabled={loading || !(inputAddr || address).trim()}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    查询中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    查询
                  </>
                )}
              </Button>
              {data && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setInputAddr('')
                    reset()
                    resetAnalysis()
                  }}
                  disabled={loading}
                >
                  清空
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>查询失败</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* 仅首次加载时显示骨架屏；后台刷新时保留当前内容，只更新数据 */}
      {loading && !data && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {data && address && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap border-b pb-4">
            <span className="text-sm text-muted-foreground">地址</span>
            <WalletAddressCell address={address} />
            {refreshing && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                更新数据中…
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
            <div className="order-2 lg:order-1 flex flex-col gap-3">
              <PnLCards data={data} />
            </div>
            <div className="order-1 lg:order-2 space-y-4">
              <BalanceChart data={data} />
              <SummaryDonuts data={data} />
            </div>
          </div>

          <RecentWinRateModule fills={data.winRateFills?.length ? data.winRateFills : data.fills} />

          <PositionsTable data={data} />
          <FillsTable fills={data.fills} />

          {/* 可选：AI 分析 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />
                AI 分析（可选）
              </CardTitle>
              <CardDescription>
                基于历史数据评估交易策略与风险，需调用后端分析接口
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">分析周期</span>
                  <Select value={aiDays.toString()} onValueChange={(v) => setAiDays(Number(v))} disabled={analysisLoading}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 天</SelectItem>
                      <SelectItem value="30">30 天</SelectItem>
                      <SelectItem value="60">60 天</SelectItem>
                      <SelectItem value="90">90 天</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => runAnalyze(address, aiDays)}
                  disabled={analysisLoading}
                >
                  {analysisLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      AI 分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      进行 AI 分析
                    </>
                  )}
                </Button>
              </div>
              {analysisError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{analysisError.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {analysisData && !analysisLoading && <AnalysisResult data={analysisData} />}
        </div>
      )}
    </div>
  )
}
