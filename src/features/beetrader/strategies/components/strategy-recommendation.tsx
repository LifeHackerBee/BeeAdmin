import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { AlertTriangle, Shield, TrendingUp, TrendingDown, Minus, CircleDot } from 'lucide-react'
import type { Strategy, ResonanceDetail } from '../types'

const BIAS_CONFIG: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary'; label: string; emoji: string }> = {
  '强势看多': { variant: 'default', label: '强势看多', emoji: '🟢' },
  '震荡偏多': { variant: 'default', label: '震荡偏多', emoji: '🟡' },
  '观望': { variant: 'secondary', label: '观望', emoji: '⚪' },
  '震荡偏空': { variant: 'destructive', label: '震荡偏空', emoji: '🟡' },
  '强势看空': { variant: 'destructive', label: '强势看空', emoji: '🔴' },
}

// 权重 → 周期标签 (1h=1, 4h=2, 1d=3, 1w=4)
function weightToTimeframe(indicator: string, weight: number): string {
  if (indicator.includes('1w')) return '周线'
  if (indicator.includes('1d')) return '日线'
  if (indicator.includes('4h')) return '4小时'
  if (indicator.includes('1h')) return '1小时'
  if (weight >= 4) return '周线'
  if (weight >= 3) return '日线'
  if (weight >= 2) return '4小时'
  return '1小时'
}

// 提取指标类别名（去掉周期后缀）
function indicatorCategory(name: string): string {
  return name.replace(/\s*\d[hHdDwW]+$/, '')
}

function buildResonanceSummary(details: ResonanceDetail[], score: number): string {
  const bullish = details.filter((d) => d.signal === 'bullish' || d.signal === 'confirmed')
  const bearish = details.filter((d) => d.signal === 'bearish' || d.signal === 'warning')
  const neutral = details.filter((d) => d.signal === 'neutral')
  const parts: string[] = []

  if (bullish.length > 0) {
    const names = bullish.map((d) => indicatorCategory(d.indicator)).filter((v, i, a) => a.indexOf(v) === i)
    parts.push(`${bullish.length} 项看多 (${names.join('、')})`)
  }
  if (bearish.length > 0) {
    const names = bearish.map((d) => indicatorCategory(d.indicator)).filter((v, i, a) => a.indexOf(v) === i)
    parts.push(`${bearish.length} 项看空 (${names.join('、')})`)
  }
  if (neutral.length > 0) {
    parts.push(`${neutral.length} 项中性`)
  }

  const strength = score >= 8 ? '共振强烈' : score >= 6 ? '共振较好' : score >= 4 ? '信号分歧' : '共振较弱'
  return `${strength} · ${parts.join('，')}`
}

interface Props {
  data: Strategy
  currentPrice: number
}

export function StrategyRecommendation({ data }: Props) {
  const biasConfig = BIAS_CONFIG[data.bias] || { variant: 'outline' as const, label: data.bias, emoji: '⚪' }

  const summary = buildResonanceSummary(data.resonance_details, data.resonance_score)

  // 统计多空中性数量
  const bullCount = data.resonance_details.filter((d) => d.signal === 'bullish' || d.signal === 'confirmed').length
  const bearCount = data.resonance_details.filter((d) => d.signal === 'bearish' || d.signal === 'warning').length
  const total = data.resonance_details.length
  const neutralCount = total - bullCount - bearCount

  // 加权统计
  const bullishW = data.resonance_details
    .filter((d) => d.signal === 'bullish' || d.signal === 'confirmed')
    .reduce((s, d) => s + Math.abs(d.weight), 0)
  const bearishW = data.resonance_details
    .filter((d) => d.signal === 'bearish' || d.signal === 'warning')
    .reduce((s, d) => s + Math.abs(d.weight), 0)

  // 三段式进度条：多/中性/空 按数量比例
  const bullPct = total > 0 ? (bullCount / total) * 100 : 0
  const neutralPct = total > 0 ? (neutralCount / total) * 100 : 0
  const bearPct = total > 0 ? (bearCount / total) * 100 : 0

  // 净权重和总权重（用于展示计算过程）
  const netW = Math.abs(bullishW - bearishW)
  const allWeight = data.resonance_details.reduce((s, d) => {
    // 中性指标也有隐含权重（根据周期），但 weight=0
    const indicator = d.indicator
    if (d.weight !== 0) return s + Math.abs(d.weight)
    // 中性项的隐含权重
    if (indicator.includes('1d')) return s + 3
    if (indicator.includes('4h')) return s + 2
    if (indicator.includes('1h')) return s + 1
    if (indicator.includes('1w')) return s + 4
    return s + 3 // 多空分界线等无周期后缀的默认 3
  }, 0)

  // 按指标类别分组
  const grouped = data.resonance_details.reduce<Record<string, ResonanceDetail[]>>((acc, d) => {
    const cat = indicatorCategory(d.indicator)
    ;(acc[cat] ??= []).push(d)
    return acc
  }, {})

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base'>共振分析</CardTitle>
          <Badge variant={biasConfig.variant} className='text-sm px-3 py-1'>
            {biasConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* ── 共振评分总览 ── */}
        <div className='rounded-lg border p-3 space-y-3'>
          {/* 第一行：评分 + 评级 */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <CircleDot className='h-4 w-4 text-purple-500' />
              <span className='text-sm font-medium'>共振评分</span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                data.resonance_score >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : data.resonance_score >= 6 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : data.resonance_score >= 4 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {data.resonance_score >= 8 ? '强共振' : data.resonance_score >= 6 ? '较好' : data.resonance_score >= 4 ? '分歧' : '弱共振'}
              </span>
            </div>
            <span className='text-2xl font-bold tabular-nums'>
              {data.resonance_score}<span className='text-sm font-normal text-muted-foreground'>/10</span>
            </span>
          </div>

          {/* 第二行：计算过程 */}
          <div className='rounded-md bg-muted/40 px-3 py-2 space-y-1.5'>
            <div className='flex items-center gap-2 text-xs'>
              <span className='text-muted-foreground'>计算:</span>
              <span className='font-mono'>
                |<span className='text-green-600 dark:text-green-400'>{bullishW}</span>
                {' - '}
                <span className='text-red-600 dark:text-red-400'>{bearishW}</span>|
                {' / '}
                {allWeight}
                {' x 10 = '}
                <span className='font-semibold'>{(netW / allWeight * 10).toFixed(1)}</span>
              </span>
              <span className='text-muted-foreground'>
                {' -> '}{data.resonance_score}
              </span>
            </div>
            <div className='flex items-center gap-3 text-[10px] text-muted-foreground'>
              <span>
                <span className='text-green-600 dark:text-green-400 font-medium'>多方权重 {bullishW}</span>
                {' = '}
                {data.resonance_details
                  .filter((d) => d.signal === 'bullish' || d.signal === 'confirmed')
                  .filter((d) => d.weight > 0)
                  .map((d) => `${indicatorCategory(d.indicator)}(${d.weight})`)
                  .join(' + ') || '0'}
              </span>
            </div>
            <div className='flex items-center gap-3 text-[10px] text-muted-foreground'>
              <span>
                <span className='text-red-600 dark:text-red-400 font-medium'>空方权重 {bearishW}</span>
                {' = '}
                {data.resonance_details
                  .filter((d) => d.signal === 'bearish' || d.signal === 'warning')
                  .filter((d) => d.weight !== 0)
                  .map((d) => `${indicatorCategory(d.indicator)}(${Math.abs(d.weight)})`)
                  .join(' + ') || '0'}
              </span>
            </div>
          </div>

          {/* 第三行：三段式比例条 */}
          <div className='space-y-1.5'>
            <div className='flex h-2 rounded-full overflow-hidden'>
              {bullPct > 0 && <div className='bg-green-500' style={{ width: `${bullPct}%` }} />}
              {neutralPct > 0 && <div className='bg-yellow-400 dark:bg-yellow-600' style={{ width: `${neutralPct}%` }} />}
              {bearPct > 0 && <div className='bg-red-500' style={{ width: `${bearPct}%` }} />}
            </div>
            <div className='flex items-center justify-between text-[11px]'>
              <div className='flex items-center gap-3'>
                <span className='flex items-center gap-1'>
                  <span className='inline-block w-2 h-2 rounded-full bg-green-500' />
                  <span className='text-green-600 dark:text-green-400 font-medium'>看多 {bullCount}</span>
                </span>
                <span className='flex items-center gap-1'>
                  <span className='inline-block w-2 h-2 rounded-full bg-yellow-400 dark:bg-yellow-600' />
                  <span className='text-yellow-600 dark:text-yellow-400 font-medium'>中性 {neutralCount}</span>
                </span>
                <span className='flex items-center gap-1'>
                  <span className='inline-block w-2 h-2 rounded-full bg-red-500' />
                  <span className='text-red-600 dark:text-red-400 font-medium'>看空 {bearCount}</span>
                </span>
              </div>
              <span className='text-muted-foreground'>{total} 项指标</span>
            </div>
          </div>

          {/* 第四行：文字总结 */}
          <p className='text-xs text-muted-foreground'>{summary}</p>
        </div>

        {/* ── 共振指标明细 — 按类别分组 ── */}
        <div className='space-y-2'>
          <p className='text-xs font-medium text-muted-foreground'>共振指标明细</p>
          <div className='space-y-1.5'>
            {Object.entries(grouped).map(([category, items]) => {
              // 判断该类别的整体方向
              const catBull = items.filter((d) => d.signal === 'bullish' || d.signal === 'confirmed').length
              const catBear = items.filter((d) => d.signal === 'bearish' || d.signal === 'warning').length
              const catDir = catBull > catBear ? 'bullish' : catBear > catBull ? 'bearish' : 'neutral'

              return (
                <div key={category} className='rounded-md border overflow-hidden'>
                  {/* 类别标题行 */}
                  <div className={`flex items-center justify-between px-3 py-1.5 text-xs ${
                    catDir === 'bullish' ? 'bg-green-50 dark:bg-green-950/20'
                      : catDir === 'bearish' ? 'bg-red-50 dark:bg-red-950/20'
                        : 'bg-muted/30'
                  }`}>
                    <div className='flex items-center gap-1.5'>
                      {catDir === 'bullish' ? (
                        <TrendingUp className='h-3 w-3 text-green-600 dark:text-green-400' />
                      ) : catDir === 'bearish' ? (
                        <TrendingDown className='h-3 w-3 text-red-600 dark:text-red-400' />
                      ) : (
                        <Minus className='h-3 w-3 text-muted-foreground' />
                      )}
                      <span className='font-medium'>{category}</span>
                    </div>
                    <span className={`font-medium ${
                      catDir === 'bullish' ? 'text-green-600 dark:text-green-400'
                        : catDir === 'bearish' ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                    }`}>
                      {catDir === 'bullish' ? '偏多' : catDir === 'bearish' ? '偏空' : '中性'}
                    </span>
                  </div>
                  {/* 各周期明细 */}
                  <div className='divide-y'>
                    {items.map((d, i) => {
                      const signalColor = d.signal === 'bullish' || d.signal === 'confirmed'
                        ? 'text-green-600 dark:text-green-400'
                        : d.signal === 'bearish' || d.signal === 'warning'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      const signalLabel = d.signal === 'bullish' ? '看多' : d.signal === 'bearish' ? '看空' : d.signal === 'confirmed' ? '确认' : d.signal === 'warning' ? '警告' : '中性'
                      const signalBg = d.signal === 'bullish' || d.signal === 'confirmed'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : d.signal === 'bearish' || d.signal === 'warning'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-yellow-100 dark:bg-yellow-900/20'
                      const tf = weightToTimeframe(d.indicator, d.weight)

                      return (
                        <div key={i} className='flex items-center px-3 py-1.5 text-xs gap-2'>
                          <span className='text-muted-foreground w-12 shrink-0'>{tf}</span>
                          <span className={`font-medium px-1.5 py-0.5 rounded text-[10px] shrink-0 ${signalColor} ${signalBg}`}>{signalLabel}</span>
                          <span className='text-muted-foreground truncate flex-1' title={d.state || ''}>
                            {d.state || '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 风险与备注 ── */}
        {(data.warnings.length > 0 || data.error_prevention) && (
          <div className='rounded-lg border border-yellow-200 bg-yellow-50/50 dark:border-yellow-800/50 dark:bg-yellow-950/20 p-3 space-y-2'>
            <div className='flex items-center gap-1.5'>
              <AlertTriangle className='h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400' />
              <span className='text-xs font-medium text-yellow-700 dark:text-yellow-400'>风险提示</span>
            </div>
            {data.warnings.length > 0 && (
              <div className='space-y-1 pl-5'>
                {data.warnings.map((w, i) => (
                  <div key={i} className='flex items-start gap-1.5 text-xs text-yellow-700 dark:text-yellow-400'>
                    <span className='shrink-0'>•</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
            {data.error_prevention && (
              <div className='flex items-start gap-1.5 pl-5 text-xs text-orange-700 dark:text-orange-400 border-t border-yellow-200 dark:border-yellow-800/50 pt-2'>
                <Shield className='h-3 w-3 mt-0.5 shrink-0' />
                <span>{data.error_prevention}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
