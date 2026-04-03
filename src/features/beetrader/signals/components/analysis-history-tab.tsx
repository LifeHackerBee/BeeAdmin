import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Search, Clock, TrendingUp, TrendingDown, Minus, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

// ── Types ──

interface ResonanceDetail {
  indicator: string
  signal: string
  weight: number
  state?: string
}

interface StrategyData {
  coin?: string
  current_price?: number
  timestamp?: string
  timeframe_status?: {
    short_term?: { label: string; status: string; detail: string; timeframes: string[] }
    mid_term?: { label: string; status: string; detail: string; timeframes: string[] }
    long_term?: { label: string; status: string; detail: string; timeframes: string[] }
  }
  strategy?: {
    bias?: string
    resonance_score?: number
    resonance_details?: ResonanceDetail[]
    entry_strategy?: string
    warnings?: string[]
    error_prevention?: string
    key_levels?: { bull_bear_line?: number; entry_zone?: number[]; take_profit_1?: number; take_profit_2?: number; stop_loss?: number }
  }
  bull_bear_line?: {
    price?: number
    status?: string
    duration_hours?: number
    trend_score?: number
    hint?: string
  }
  volume_analysis?: {
    recent_trend?: string
    vol_ratio?: number
    price_change_pct?: number
    is_hollow_rally?: boolean
    volume_price_match?: boolean
    hint?: string
  }
  staircase_pattern?: Record<string, { pattern: string; swing_lows?: number[]; swing_highs?: number[] }>
}

interface HistoryRecord {
  id: number
  coin: string
  source?: string
  strategy_data?: StrategyData
  ai_signal?: {
    direction?: string
    confidence?: number
    reason?: string
    entry_price?: number
    take_profit?: number
    stop_loss?: number
  }
  created_at: string
}

interface HistoryResponse {
  success: boolean
  total?: number
  count: number
  records: HistoryRecord[]
}

// ── Signal badge helpers ──

const SIGNAL_COLORS: Record<string, string> = {
  long: 'bg-green-500', short: 'bg-red-500', close: 'bg-orange-500',
  add: 'bg-blue-500', reduce: 'bg-yellow-600', wait: 'bg-gray-500',
}

const SIGNAL_ICONS: Record<string, typeof TrendingUp> = {
  long: TrendingUp, short: TrendingDown, wait: Minus,
}

const TF_STATUS_COLORS: Record<string, string> = {
  bullish: 'text-green-500', bullish_alert: 'text-green-400',
  bearish: 'text-red-500', bearish_alert: 'text-red-400',
  neutral: 'text-muted-foreground', strong: 'text-green-600',
  weak_alert: 'text-red-400', repair_alert: 'text-yellow-500',
  repair: 'text-yellow-500', counter_trend_pullback: 'text-yellow-500',
}

const RESONANCE_SIGNAL_COLORS: Record<string, string> = {
  bullish: 'text-green-500', bearish: 'text-red-500',
  neutral: 'text-muted-foreground', confirmed: 'text-blue-500', warning: 'text-yellow-500',
}

const PAGE_SIZE = 20

// ── Main Component ──

export function AnalysisHistoryTab() {
  const [coin, setCoin] = useState('BTC')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [detailRecord, setDetailRecord] = useState<HistoryRecord | null>(null)
  const [initialized, setInitialized] = useState(false)

  // 分页状态
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  // 记住当前搜索模式，翻页时复用
  const [searchMode, setSearchMode] = useState<'recent' | 'date'>('recent')
  const [searchDate, setSearchDate] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchPage = useCallback(async (targetPage: number, mode: 'recent' | 'date', targetCoin?: string, targetDate?: string) => {
    setLoading(true)
    setSearched(true)
    try {
      const offset = (targetPage - 1) * PAGE_SIZE
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        coin: (targetCoin || coin).toUpperCase(),
      })

      if (mode === 'date' && targetDate) {
        const startBJ = `${targetDate}T00:00:00+08:00`
        const endDate = new Date(new Date(targetDate).getTime() + 86400000)
        const endBJ = `${endDate.toISOString().split('T')[0]}T00:00:00+08:00`
        params.set('start_time', startBJ)
        params.set('end_time', endBJ)
      }

      const res = await hyperliquidApiGet<HistoryResponse>(`/api/beetrader_strategy/history?${params.toString()}`)
      setRecords(res.records || [])
      setTotal(res.total ?? res.count ?? 0)
      setPage(targetPage)
      setSearchMode(mode)
      if (mode === 'date' && targetDate) setSearchDate(targetDate)
    } catch {
      setRecords([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [coin])

  // 首次自动加载
  if (!initialized) {
    setInitialized(true)
    fetchPage(1, 'recent')
  }

  const handleSearch = useCallback(() => {
    fetchPage(1, 'date', coin, date)
  }, [fetchPage, coin, date])

  const handleLoadRecent = useCallback(() => {
    fetchPage(1, 'recent', coin)
  }, [fetchPage, coin])

  const goToPage = useCallback((p: number) => {
    if (p < 1 || p > totalPages || p === page) return
    fetchPage(p, searchMode, coin, searchDate)
  }, [fetchPage, searchMode, coin, searchDate, page, totalPages])

  return (
    <div className='space-y-3'>
      {/* 搜索栏 */}
      <Card>
        <CardContent className='py-3 px-4'>
          <div className='flex items-center gap-2 flex-wrap'>
            <div className='space-y-1'>
              <Label className='text-[10px] text-muted-foreground'>币种</Label>
              <Input value={coin} onChange={(e) => setCoin(e.target.value.toUpperCase())} className='h-8 text-xs w-24' placeholder='BTC' />
            </div>
            <div className='space-y-1'>
              <Label className='text-[10px] text-muted-foreground'>日期 (北京时间)</Label>
              <input type='date' value={date} onChange={(e) => setDate(e.target.value)} className='h-8 text-xs border rounded px-2 bg-background' />
            </div>
            <div className='space-y-1'>
              <Label className='text-[10px] text-muted-foreground'>&nbsp;</Label>
              <div className='flex gap-1.5'>
                <Button size='sm' className='h-8 text-xs gap-1' onClick={handleSearch} disabled={loading}>
                  <Search className='h-3.5 w-3.5' /> 按日期搜索
                </Button>
                <Button variant='outline' size='sm' className='h-8 text-xs' onClick={handleLoadRecent} disabled={loading}>
                  最近记录
                </Button>
              </div>
            </div>
            {searched && (
              <Badge variant='secondary' className='text-[10px] px-1.5 py-0 h-5 ml-auto'>共 {total} 条</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 表格 */}
      {loading ? (
        <div className='space-y-2'>{[1, 2, 3].map((i) => <Skeleton key={i} className='h-12 w-full' />)}</div>
      ) : !searched ? (
        <div className='py-12 text-center text-muted-foreground'>
          <Clock className='h-10 w-10 mx-auto mb-2 opacity-20' />
          <p className='text-sm'>选择日期搜索分析历史记录</p>
        </div>
      ) : records.length === 0 ? (
        <div className='py-12 text-center text-muted-foreground'>
          <p className='text-sm'>该时间段暂无分析记录</p>
        </div>
      ) : (
        <Card>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-[10px] w-28'>时间</TableHead>
                  <TableHead className='text-[10px] w-16'>币种</TableHead>
                  <TableHead className='text-[10px] w-20'>价格</TableHead>
                  <TableHead className='text-[10px] w-20'>AI 信号</TableHead>
                  <TableHead className='text-[10px] w-16'>共振</TableHead>
                  <TableHead className='text-[10px]'>偏向</TableHead>
                  <TableHead className='text-[10px]'>短线</TableHead>
                  <TableHead className='text-[10px]'>中线</TableHead>
                  <TableHead className='text-[10px]'>长线</TableHead>
                  <TableHead className='text-[10px] w-20'>多空线</TableHead>
                  <TableHead className='text-[10px] w-16'>量比</TableHead>
                  <TableHead className='text-[10px] w-10'>详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => {
                  const s = rec.strategy_data?.strategy
                  const tf = rec.strategy_data?.timeframe_status
                  const bb = rec.strategy_data?.bull_bear_line
                  const vol = rec.strategy_data?.volume_analysis
                  const sig = rec.ai_signal
                  const time = new Date(rec.created_at)
                  const SigIcon = sig?.direction ? SIGNAL_ICONS[sig.direction] : null

                  return (
                    <TableRow key={rec.id} className='text-[10px]'>
                      <TableCell className='font-mono text-muted-foreground py-1.5'>
                        {time.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })}
                      </TableCell>
                      <TableCell className='py-1.5'>
                        <Badge variant='outline' className='text-[10px] px-1 py-0 h-4'>{rec.coin}</Badge>
                      </TableCell>
                      <TableCell className='font-mono py-1.5'>
                        {rec.strategy_data?.current_price ? `$${rec.strategy_data.current_price.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className='py-1.5'>
                        {sig?.direction ? (
                          <Badge className={`text-[10px] px-1.5 py-0 h-4 gap-0.5 ${SIGNAL_COLORS[sig.direction] || 'bg-gray-500'}`}>
                            {SigIcon && <SigIcon className='h-2.5 w-2.5' />}
                            {sig.direction}{sig.confidence ? ` ${sig.confidence}` : ''}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className='font-mono py-1.5'>
                        {s?.resonance_score != null ? `${s.resonance_score}/10` : '-'}
                      </TableCell>
                      <TableCell className='py-1.5'>
                        {s?.bias ? <span className='font-medium'>{s.bias}</span> : '-'}
                      </TableCell>
                      <TableCell className={`py-1.5 ${TF_STATUS_COLORS[tf?.short_term?.status || ''] || ''}`}>
                        {tf?.short_term?.label || '-'}
                      </TableCell>
                      <TableCell className={`py-1.5 ${TF_STATUS_COLORS[tf?.mid_term?.status || ''] || ''}`}>
                        {tf?.mid_term?.label || '-'}
                      </TableCell>
                      <TableCell className={`py-1.5 ${TF_STATUS_COLORS[tf?.long_term?.status || ''] || ''}`}>
                        {tf?.long_term?.label || '-'}
                      </TableCell>
                      <TableCell className='font-mono py-1.5'>
                        {bb?.price ? (
                          <span className={TF_STATUS_COLORS[bb.status || ''] || ''}>
                            ${bb.price.toLocaleString()}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className={`font-mono py-1.5 ${
                        (vol?.vol_ratio ?? 0) > 1.1 ? 'text-green-500' :
                        (vol?.vol_ratio ?? 0) < 0.8 ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        {vol?.vol_ratio != null ? `${vol.vol_ratio}x` : '-'}
                      </TableCell>
                      <TableCell className='py-1.5'>
                        <Button variant='ghost' size='sm' className='h-6 w-6 p-0' onClick={() => setDetailRecord(rec)}>
                          <Eye className='h-3 w-3' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between border-t px-4 py-2'>
              <span className='text-xs text-muted-foreground'>
                第 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} 条，共 {total} 条
              </span>
              <div className='flex items-center gap-1'>
                <Button variant='outline' size='sm' className='h-7 w-7 p-0' disabled={page <= 1} onClick={() => goToPage(1)}>
                  <ChevronsLeft className='h-3.5 w-3.5' />
                </Button>
                <Button variant='outline' size='sm' className='h-7 w-7 p-0' disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                  <ChevronLeft className='h-3.5 w-3.5' />
                </Button>
                {generatePageNumbers(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`dot-${i}`} className='px-1 text-xs text-muted-foreground'>...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size='sm'
                      className='h-7 min-w-7 px-2 text-xs'
                      onClick={() => goToPage(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button variant='outline' size='sm' className='h-7 w-7 p-0' disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
                  <ChevronRight className='h-3.5 w-3.5' />
                </Button>
                <Button variant='outline' size='sm' className='h-7 w-7 p-0' disabled={page >= totalPages} onClick={() => goToPage(totalPages)}>
                  <ChevronsRight className='h-3.5 w-3.5' />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 详情弹窗 */}
      {detailRecord && (
        <StrategyDetailDialog
          record={detailRecord}
          open={!!detailRecord}
          onOpenChange={(v) => !v && setDetailRecord(null)}
        />
      )}
    </div>
  )
}

/** 生成页码数组，中间省略 */
function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

// ── 策略详情弹窗 — 一页展示所有数据 ──

function StrategyDetailDialog({ record, open, onOpenChange }: {
  record: HistoryRecord
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const sd = record.strategy_data
  const s = sd?.strategy
  const tf = sd?.timeframe_status
  const bb = sd?.bull_bear_line
  const vol = sd?.volume_analysis
  const sp = sd?.staircase_pattern
  const sig = record.ai_signal
  const time = new Date(record.created_at)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-sm'>
            <Eye className='h-4 w-4' />
            {record.coin} 策略分析详情 — {time.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* 基础信息 */}
          <div className='grid grid-cols-2 sm:grid-cols-5 gap-2'>
            <InfoCard label='价格' value={sd?.current_price ? `$${sd.current_price.toLocaleString()}` : '-'} />
            <InfoCard label='偏向' value={s?.bias || '-'} />
            <InfoCard label='共振' value={s?.resonance_score != null ? `${s.resonance_score}/10` : '-'} />
            <InfoCard label='来源' value={record.source || 'manual'} />
            <InfoCard label='AI 信号' value={sig?.direction ? `${sig.direction} (${sig.confidence ?? '-'})` : '无'} />
          </div>

          {/* 多周期状态 */}
          {tf && (
            <Section title='多周期状态'>
              <div className='grid grid-cols-3 gap-2'>
                {(['short_term', 'mid_term', 'long_term'] as const).map((key) => {
                  const t = tf[key]
                  const labels = { short_term: '短线', mid_term: '中线', long_term: '长线' }
                  return (
                    <div key={key} className='border rounded-md p-2'>
                      <div className='flex items-center gap-1.5 mb-1'>
                        <span className='text-[10px] text-muted-foreground'>{labels[key]}</span>
                        {t?.timeframes && <span className='text-[10px] text-muted-foreground'>({t.timeframes.join('/')})</span>}
                      </div>
                      <span className={`text-xs font-medium ${TF_STATUS_COLORS[t?.status || ''] || ''}`}>{t?.label || '-'}</span>
                      {t?.detail && <p className='text-[10px] text-muted-foreground mt-0.5'>{t.detail}</p>}
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* 共振分析 */}
          {s?.resonance_details && s.resonance_details.length > 0 && (
            <Section title={`共振分析 (${s.resonance_score}/10 · ${s.bias})`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-[10px]'>指标</TableHead>
                    <TableHead className='text-[10px]'>信号</TableHead>
                    <TableHead className='text-[10px]'>权重</TableHead>
                    <TableHead className='text-[10px]'>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.resonance_details.map((d, i) => (
                    <TableRow key={i} className='text-[10px]'>
                      <TableCell className='py-1'>{d.indicator}</TableCell>
                      <TableCell className={`py-1 font-medium ${RESONANCE_SIGNAL_COLORS[d.signal] || ''}`}>{d.signal}</TableCell>
                      <TableCell className='py-1 font-mono'>{d.weight}</TableCell>
                      <TableCell className='py-1 text-muted-foreground'>{d.state || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          )}

          {/* 多空分界线 */}
          {bb && (
            <Section title='多空分界线'>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]'>
                <div><span className='text-muted-foreground'>价格: </span><span className='font-mono'>${bb.price?.toLocaleString()}</span></div>
                <div><span className='text-muted-foreground'>状态: </span><span className={TF_STATUS_COLORS[bb.status || ''] || ''}>{bb.status}</span></div>
                <div><span className='text-muted-foreground'>趋势评分: </span>{bb.trend_score ?? '-'}/5</div>
                <div><span className='text-muted-foreground'>持续: </span>{bb.duration_hours ?? '-'}h</div>
                {bb.hint && <div className='col-span-full text-muted-foreground'>{bb.hint}</div>}
              </div>
            </Section>
          )}

          {/* 成交量分析 */}
          {vol && (
            <Section title='成交量分析'>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]'>
                <div><span className='text-muted-foreground'>量比: </span><span className='font-mono'>{vol.vol_ratio}x</span></div>
                <div><span className='text-muted-foreground'>趋势: </span>{vol.recent_trend}</div>
                <div><span className='text-muted-foreground'>价格变动: </span>{vol.price_change_pct}%</div>
                <div><span className='text-muted-foreground'>量价匹配: </span>{vol.volume_price_match ? '✓' : '✗'}</div>
                {vol.hint && <div className='col-span-full text-muted-foreground'>{vol.hint}</div>}
              </div>
            </Section>
          )}

          {/* 阶梯形态 */}
          {sp && Object.keys(sp).length > 0 && (
            <Section title='阶梯形态'>
              <div className='flex gap-4 text-[10px]'>
                {Object.entries(sp).map(([k, v]) => (
                  <div key={k}>
                    <span className='text-muted-foreground'>{k}: </span>
                    <span className={v.pattern === 'higher_lows' || v.pattern === 'staircase_up' ? 'text-green-500 font-medium' : v.pattern === 'lower_lows' ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                      {v.pattern}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 入场策略 + 风险提示 */}
          {s?.entry_strategy && (
            <Section title='入场策略'>
              <div className='text-[10px] whitespace-pre-wrap'>{s.entry_strategy}</div>
            </Section>
          )}

          {s?.warnings && s.warnings.length > 0 && (
            <Section title='风险提示'>
              <div className='border-yellow-500/20 bg-yellow-500/5 rounded-md p-2 text-[10px] space-y-0.5'>
                {s.warnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
                {s.error_prevention && <p className='text-muted-foreground mt-1'>{s.error_prevention}</p>}
              </div>
            </Section>
          )}

          {/* AI 信号 */}
          {sig && (
            <Section title='AI 信号'>
              <div className='grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2'>
                <InfoCard label='方向' value={sig.direction || '-'} />
                <InfoCard label='置信度' value={sig.confidence != null ? `${sig.confidence}/10` : '-'} />
                <InfoCard label='入场价' value={sig.entry_price ? `$${sig.entry_price}` : '-'} />
                <InfoCard label='止盈' value={sig.take_profit ? `$${sig.take_profit}` : '-'} />
                <InfoCard label='止损' value={sig.stop_loss ? `$${sig.stop_loss}` : '-'} />
              </div>
              {sig.reason && <p className='text-[10px] text-muted-foreground'>{sig.reason}</p>}
            </Section>
          )}

          {/* 原始 JSON */}
          <details>
            <summary className='text-[10px] text-muted-foreground cursor-pointer hover:text-foreground'>查看原始 JSON 数据</summary>
            <pre className='mt-1 p-3 bg-muted/50 rounded text-[9px] overflow-x-auto max-h-[40vh]'>
              {JSON.stringify({ strategy_data: sd, ai_signal: sig }, null, 2)}
            </pre>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='space-y-1.5'>
      <h4 className='text-xs font-medium border-b pb-1'>{title}</h4>
      {children}
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='border rounded-md p-2'>
      <p className='text-[10px] text-muted-foreground'>{label}</p>
      <p className='text-xs font-medium'>{value}</p>
    </div>
  )
}
