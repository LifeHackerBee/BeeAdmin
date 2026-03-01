import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Loader2,
  StopCircle,
  RotateCcw,
  Clock,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { OrderRadarData } from '../hooks/use-order-radar'
import { useOrderRadarAI } from '../hooks/use-order-radar-ai'
import type { SimSignal } from '../hooks/use-order-radar-ai'
import { useSimulation } from '../hooks/use-simulation'
import { SimulationStatus, SimulationHistory } from './simulation-card'

interface AIAnalysisProps {
  data: OrderRadarData
  autoAnalyze?: boolean
}

/** 从 AI 输出中提取有效期小时数 */
function parseValidityHours(text: string): number | null {
  const hourMatch = text.match(/有效期[：:]\s*(\d+(?:\.\d+)?)\s*小时/)
  if (hourMatch) return parseFloat(hourMatch[1])
  const minMatch = text.match(/有效期[：:]\s*(\d+)\s*分钟/)
  if (minMatch) return parseFloat(minMatch[1]) / 60
  return null
}

/** 计算剩余时间描述 */
function remainingText(generatedAt: Date, validHours: number): { text: string; expired: boolean } {
  const now = Date.now()
  const expiresAt = generatedAt.getTime() + validHours * 3600_000
  const remaining = expiresAt - now

  if (remaining <= 0) return { text: '已过期', expired: true }

  const mins = Math.floor(remaining / 60_000)
  if (mins < 60) return { text: `剩余 ${mins} 分钟`, expired: false }
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return { text: `剩余 ${h}h${m > 0 ? `${m}m` : ''}`, expired: false }
}

// ============================================
// 信号卡片（结构化 JSON 信号展示）
// ============================================

function SignalCard({
  signal,
  coin,
  onStartSim,
  simRunning,
}: {
  signal: SimSignal
  coin: string
  onStartSim: () => void
  simRunning: boolean
}) {
  const isLong = signal.action === 'long'
  const isWait = signal.action === 'wait'
  const DirIcon = isLong ? TrendingUp : TrendingDown
  const dirLabel = isLong ? '做多' : isWait ? '观望' : '做空'
  const dirColor = isLong ? 'border-green-500/50 bg-green-500/5' : isWait ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-red-500/50 bg-red-500/5'
  const confColor = signal.confidence >= 7 ? 'text-green-500' : signal.confidence >= 5 ? 'text-yellow-500' : 'text-red-500'

  return (
    <Card className={`${dirColor} border`}>
      <CardContent className='pt-4 pb-3 space-y-3'>
        {/* 头部：方向 + 信心度 */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            {isWait ? (
              <AlertTriangle className='h-4 w-4 text-yellow-500' />
            ) : (
              <DirIcon className={`h-4 w-4 ${isLong ? 'text-green-500' : 'text-red-500'}`} />
            )}
            <span className='font-semibold'>{coin} {dirLabel}</span>
            <Badge variant='outline' className={`text-xs ${confColor}`}>
              信心 {signal.confidence}/10
            </Badge>
          </div>
          {!isWait && (
            <Button
              size='sm'
              variant='outline'
              className='gap-1 text-xs'
              onClick={onStartSim}
              disabled={simRunning}
            >
              <FlaskConical className='h-3 w-3' />
              {simRunning ? '模拟中...' : '开始模拟'}
            </Button>
          )}
        </div>

        {/* 价位 */}
        {!isWait && (
          <div className='grid grid-cols-4 gap-2 text-xs'>
            <div>
              <div className='text-muted-foreground flex items-center gap-1'>
                <Target className='h-3 w-3' />
                入场
              </div>
              <div className='font-mono font-medium'>${signal.entry_price.toFixed(2)}</div>
            </div>
            <div>
              <div className='text-muted-foreground text-green-500'>止盈</div>
              <div className='font-mono font-medium text-green-500'>${signal.take_profit.toFixed(2)}</div>
            </div>
            <div>
              <div className='text-muted-foreground text-red-500'>止损</div>
              <div className='font-mono font-medium text-red-500'>${signal.stop_loss.toFixed(2)}</div>
            </div>
            <div>
              <div className='text-muted-foreground flex items-center gap-1'>
                <ShieldCheck className='h-3 w-3' />
                盈亏比
              </div>
              <div className='font-mono font-medium'>{signal.risk_reward_ratio.toFixed(1)}</div>
            </div>
          </div>
        )}

        {/* 理由 + 有效期 */}
        <div className='flex items-center justify-between text-xs text-muted-foreground'>
          <span>{signal.reason}</span>
          <span className='flex items-center gap-1'>
            <Clock className='h-3 w-3' />
            有效 {signal.validity_minutes} 分钟
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 主组件
// ============================================

export function AIAnalysis({ data, autoAnalyze }: AIAnalysisProps) {
  const {
    analyze, fetchSignal, streaming, content, error, abort, reset,
    signal, signalLoading,
  } = useOrderRadarAI()
  const sim = useSimulation()
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [, setTick] = useState(0)

  // 追踪 data 变化，用于自动触发 AI 分析
  const prevDataRef = useRef<OrderRadarData | null>(null)
  const autoAnalyzeRef = useRef(autoAnalyze)
  autoAnalyzeRef.current = autoAnalyze

  const validHours = content ? parseValidityHours(content) : null

  // 流式结束时记录生成时间
  useEffect(() => {
    if (content && !streaming && !generatedAt) {
      setGeneratedAt(new Date())
    }
  }, [content, streaming, generatedAt])

  // 每分钟刷新倒计时
  useEffect(() => {
    if (!generatedAt || !validHours) return
    const timer = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(timer)
  }, [generatedAt, validHours])

  // 自动 AI 分析：data 变化时自动触发
  useEffect(() => {
    if (!autoAnalyzeRef.current) {
      prevDataRef.current = data
      return
    }
    // 首次 data 或 data 引用变化 → 触发 AI
    if (data && data !== prevDataRef.current) {
      prevDataRef.current = data
      reset()
      sim.resetSim()
      setGeneratedAt(null)
      analyze(data.coin, data)
      fetchSignal(data.coin, data)
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // 自动模拟：信号出来后如果是 long/short 且没有正在运行的模拟，自动启动
  useEffect(() => {
    if (!autoAnalyzeRef.current) return
    if (!signal || signal.action === 'wait') return
    if (sim.simStatus?.status === 'running' || sim.loading) return
    sim.startSim(data.coin, signal, data as unknown as Record<string, unknown>)
  }, [signal]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = () => {
    setGeneratedAt(null)
    analyze(data.coin, data)
    fetchSignal(data.coin, data)
  }

  const handleReAnalyze = () => {
    reset()
    sim.resetSim()
    setGeneratedAt(null)
    analyze(data.coin, data)
    fetchSignal(data.coin, data)
  }

  const handleStartSim = () => {
    if (signal && signal.action !== 'wait') {
      sim.startSim(data.coin, signal, data as unknown as Record<string, unknown>)
    }
  }

  const validity =
    generatedAt && validHours ? remainingText(generatedAt, validHours) : null

  const isAnalyzing = streaming || signalLoading

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Sparkles className='h-4 w-4' />
              AI 交易建议
              {isAnalyzing && (
                <Badge variant='secondary' className='text-xs gap-1'>
                  <Loader2 className='h-3 w-3 animate-spin' />
                  分析中
                </Badge>
              )}
              {validity && (
                <Badge
                  variant={validity.expired ? 'destructive' : 'secondary'}
                  className='text-xs gap-1'
                >
                  <Clock className='h-3 w-3' />
                  {validity.text}
                </Badge>
              )}
            </CardTitle>
            <div className='flex items-center gap-1'>
              {streaming ? (
                <Button variant='outline' size='sm' onClick={abort} className='gap-1 text-xs'>
                  <StopCircle className='h-3 w-3' />
                  停止
                </Button>
              ) : (
                <Button
                  variant={content ? 'outline' : 'default'}
                  size='sm'
                  onClick={content ? handleReAnalyze : handleAnalyze}
                  disabled={isAnalyzing}
                  className='gap-1 text-xs'
                >
                  {content ? <RotateCcw className='h-3 w-3' /> : <Sparkles className='h-3 w-3' />}
                  {content ? '重新分析' : 'AI 分析'}
                </Button>
              )}
            </div>
          </div>
          {generatedAt && !streaming && (
            <div className='text-[10px] text-muted-foreground mt-1'>
              生成于 {generatedAt.toLocaleTimeString()}
              {validHours && ` · 有效期 ${validHours >= 1 ? `${validHours}小时` : `${Math.round(validHours * 60)}分钟`}`}
            </div>
          )}
        </CardHeader>
        {(content || streaming || error) && (
          <CardContent>
            {error && <div className='text-sm text-destructive'>{error}</div>}
            {content && (
              <div className='prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_p]:my-1.5 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-medium [&_ul]:my-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-1.5 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0.5 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono'>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {content}
                </ReactMarkdown>
                {streaming && (
                  <span className='inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle' />
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 结构化信号卡片 */}
      {signal && (
        <SignalCard
          signal={signal}
          coin={data.coin}
          onStartSim={handleStartSim}
          simRunning={sim.simStatus?.status === 'running' || sim.loading}
        />
      )}

      {/* 模拟状态 */}
      {sim.simStatus && <SimulationStatus sim={sim.simStatus} />}

      {/* 模拟历史统计 */}
      {sim.history && <SimulationHistory history={sim.history} />}
    </div>
  )
}
