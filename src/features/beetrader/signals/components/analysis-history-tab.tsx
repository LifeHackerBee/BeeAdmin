import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Clock, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

interface HistoryRecord {
  id: number
  coin: string
  source?: string
  strategy_data?: {
    current_price?: number
    timeframe_status?: {
      short_term?: { label: string }
      mid_term?: { label: string }
      long_term?: { label: string }
    }
    strategy?: {
      bias?: string
      resonance_score?: number
    }
  }
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

export function AnalysisHistoryTab() {
  const [coin, setCoin] = useState('BTC')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const handleSearch = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    try {
      // 北京时间该日 8:00 到次日 8:00
      const startBJ = `${date}T08:00:00+08:00`
      const endDate = new Date(new Date(date).getTime() + 86400000)
      const endBJ = `${endDate.toISOString().split('T')[0]}T08:00:00+08:00`

      const params = new URLSearchParams({
        limit: '50',
        coin: coin.toUpperCase(),
        source: 'scheduled',
        start_time: startBJ,
        end_time: endBJ,
      })
      const res = await hyperliquidApiGet<{ success: boolean; count: number; records: HistoryRecord[] }>(
        `/api/beetrader_strategy/history?${params.toString()}`
      )
      setRecords(res.records || [])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [coin, date])

  const handleLoadAll = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({
        limit: '50',
        coin: coin.toUpperCase(),
        source: 'scheduled',
      })
      const res = await hyperliquidApiGet<{ success: boolean; count: number; records: HistoryRecord[] }>(
        `/api/beetrader_strategy/history?${params.toString()}`
      )
      setRecords(res.records || [])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [coin])

  return (
    <div className='space-y-3'>
      {/* 搜索栏 */}
      <Card>
        <CardContent className='py-3 px-4'>
          <div className='flex items-center gap-2 flex-wrap'>
            <div className='space-y-1'>
              <Label className='text-[10px] text-muted-foreground'>币种</Label>
              <Input
                value={coin}
                onChange={(e) => setCoin(e.target.value.toUpperCase())}
                className='h-8 text-xs w-24'
                placeholder='BTC'
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-[10px] text-muted-foreground'>日期 (北京时间)</Label>
              <input
                type='date'
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className='h-8 text-xs border rounded px-2 bg-background'
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-[10px] text-muted-foreground'>&nbsp;</Label>
              <div className='flex gap-1.5'>
                <Button size='sm' className='h-8 text-xs gap-1' onClick={handleSearch} disabled={loading}>
                  <Search className='h-3.5 w-3.5' />
                  按日期搜索
                </Button>
                <Button variant='outline' size='sm' className='h-8 text-xs' onClick={handleLoadAll} disabled={loading}>
                  最近 50 条
                </Button>
              </div>
            </div>
            {searched && (
              <Badge variant='secondary' className='text-[10px] px-1.5 py-0 h-5 ml-auto'>
                {records.length} 条记录
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 结果列表 */}
      {loading ? (
        <div className='space-y-2'>
          {[1, 2, 3].map((i) => <Skeleton key={i} className='h-16 w-full' />)}
        </div>
      ) : !searched ? (
        <div className='py-12 text-center text-muted-foreground'>
          <Clock className='h-10 w-10 mx-auto mb-2 opacity-20' />
          <p className='text-sm'>选择日期搜索定时分析历史记录</p>
          <p className='text-xs mt-1'>定时分析按配置频率自动运行，结果保存 7 天</p>
        </div>
      ) : records.length === 0 ? (
        <div className='py-12 text-center text-muted-foreground'>
          <p className='text-sm'>该时间段暂无定时分析记录</p>
        </div>
      ) : (
        <div className='space-y-1.5'>
          {records.map((rec) => {
            const signal = rec.ai_signal
            const strategy = rec.strategy_data?.strategy
            const tf = rec.strategy_data?.timeframe_status
            const time = new Date(rec.created_at)
            const isExpanded = expandedId === rec.id

            return (
              <Card key={rec.id} className='overflow-hidden'>
                <button
                  className='w-full text-left px-4 py-2.5 hover:bg-muted/30 transition-colors'
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                >
                  <div className='flex items-center gap-3'>
                    {/* 时间 */}
                    <span className='font-mono text-xs text-muted-foreground w-32 shrink-0'>
                      {time.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })}
                    </span>

                    {/* 币种 + 价格 */}
                    <Badge variant='outline' className='text-[10px] px-1.5 py-0 h-5 shrink-0'>{rec.coin}</Badge>
                    {rec.strategy_data?.current_price && (
                      <span className='text-xs font-mono'>${rec.strategy_data.current_price.toLocaleString()}</span>
                    )}

                    {/* AI 信号 */}
                    {signal?.direction && (
                      <Badge className={`text-[10px] px-1.5 py-0 h-5 gap-0.5 ${
                        signal.direction === 'long' ? 'bg-green-500' :
                        signal.direction === 'short' ? 'bg-red-500' :
                        signal.direction === 'close' ? 'bg-orange-500' :
                        'bg-gray-500'
                      }`}>
                        {signal.direction === 'long' && <TrendingUp className='h-2.5 w-2.5' />}
                        {signal.direction === 'short' && <TrendingDown className='h-2.5 w-2.5' />}
                        {signal.direction === 'wait' && <Minus className='h-2.5 w-2.5' />}
                        {signal.direction}
                        {signal.confidence && ` ${signal.confidence}`}
                      </Badge>
                    )}

                    {/* 共振 */}
                    {strategy?.resonance_score != null && (
                      <span className='text-[10px] text-muted-foreground'>
                        共振 {strategy.resonance_score}/10
                      </span>
                    )}
                    {strategy?.bias && (
                      <span className='text-[10px] text-muted-foreground'>{strategy.bias}</span>
                    )}

                    <span className='ml-auto'>
                      {isExpanded ? <ChevronUp className='h-3.5 w-3.5 text-muted-foreground' /> : <ChevronDown className='h-3.5 w-3.5 text-muted-foreground' />}
                    </span>
                  </div>
                </button>

                {/* 展开详情 */}
                {isExpanded && (
                  <div className='px-4 pb-3 border-t space-y-2 pt-2'>
                    {/* 多周期状态 */}
                    {tf && (
                      <div className='flex gap-4 text-[10px]'>
                        <span>短线: <b>{tf.short_term?.label || '-'}</b></span>
                        <span>中线: <b>{tf.mid_term?.label || '-'}</b></span>
                        <span>长线: <b>{tf.long_term?.label || '-'}</b></span>
                      </div>
                    )}

                    {/* AI 信号详情 */}
                    {signal && (
                      <div className='text-[10px] space-y-1'>
                        {signal.reason && <p className='text-muted-foreground'>{signal.reason}</p>}
                        <div className='flex gap-3 font-mono text-muted-foreground'>
                          {signal.entry_price ? <span>入场: ${signal.entry_price}</span> : null}
                          {signal.take_profit ? <span className='text-green-500'>TP: ${signal.take_profit}</span> : null}
                          {signal.stop_loss ? <span className='text-red-500'>SL: ${signal.stop_loss}</span> : null}
                        </div>
                      </div>
                    )}

                    {/* 原始数据 */}
                    {signal && (
                      <details className='text-[10px]'>
                        <summary className='text-muted-foreground cursor-pointer hover:text-foreground'>原始 JSON</summary>
                        <pre className='mt-1 p-2 bg-muted/50 rounded text-[9px] overflow-x-auto max-h-40'>
                          {JSON.stringify(signal, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
