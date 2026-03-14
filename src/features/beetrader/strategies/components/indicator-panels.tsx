import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  MacdIndicator,
  BollingerIndicator,
  RsiIndicator,
  KdjIndicator,
} from '../types'

// ============================================
// MACD 面板
// ============================================

interface MacdPanelProps {
  data: Record<string, MacdIndicator>
}

export function MacdPanel({ data }: MacdPanelProps) {
  const timeframes = Object.keys(data)

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>MACD (12,26,9)</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={timeframes[0]}>
          <TabsList className='h-7'>
            {timeframes.map((tf) => (
              <TabsTrigger key={tf} value={tf} className='text-xs px-2 h-6'>
                {tf.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>
          {timeframes.map((tf) => {
            const m = data[tf]
            return (
              <TabsContent key={tf} value={tf} className='mt-2'>
                <div className='space-y-2'>
                  {/* 数值 */}
                  <div className='grid grid-cols-3 gap-2 text-xs'>
                    <div>
                      <span className='text-muted-foreground'>MACD</span>
                      <div
                        className={`font-mono tabular-nums ${m.macd > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {m.macd.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>Signal</span>
                      <div className='font-mono tabular-nums'>
                        {m.signal.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>Histogram</span>
                      <div
                        className={`font-mono tabular-nums ${m.histogram > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {m.histogram.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* 状态标签 */}
                  <div className='flex flex-wrap gap-1'>
                    {m.cross && (
                      <Badge
                        variant={
                          m.cross === 'golden' ? 'default' : 'destructive'
                        }
                        className='text-xs'
                      >
                        {m.cross === 'golden' ? '金叉' : '死叉'}
                      </Badge>
                    )}
                    <Badge variant='outline' className='text-xs'>
                      {m.above_zero ? '零轴上方' : '零轴下方'}
                    </Badge>
                    {m.approaching_zero && (
                      <Badge
                        variant='outline'
                        className='text-xs text-yellow-600 border-yellow-300 dark:text-yellow-400'
                      >
                        接近零轴
                      </Badge>
                    )}
                    <Badge variant='outline' className='text-xs'>
                      柱状图{m.histogram_trend === 'expanding' ? '扩张' : m.histogram_trend === 'contracting' ? '收缩' : '-'}
                    </Badge>
                  </div>

                  {/* 零轴距离可视化 */}
                  <ZeroAxisBar value={m.zero_distance} />
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}

function ZeroAxisBar({ value }: { value: number }) {
  // 将 MACD 值映射到 -100 ~ 100 的进度条
  const maxRange = Math.max(Math.abs(value) * 2, 100)
  const pct = Math.min(Math.max((value / maxRange) * 50 + 50, 5), 95)

  return (
    <div className='relative h-3 bg-muted rounded-full overflow-hidden'>
      {/* 零轴标记 */}
      <div className='absolute left-1/2 top-0 bottom-0 w-px bg-foreground/30' />
      {/* MACD 位置 */}
      <div
        className={`absolute top-0.5 bottom-0.5 w-2 rounded-full ${value > 0 ? 'bg-green-500' : 'bg-red-500'}`}
        style={{ left: `calc(${pct}% - 4px)` }}
      />
      <div className='absolute left-1 top-0 text-[9px] text-muted-foreground leading-3'>
        空
      </div>
      <div className='absolute right-1 top-0 text-[9px] text-muted-foreground leading-3'>
        多
      </div>
    </div>
  )
}

// ============================================
// 布林带面板
// ============================================

interface BollingerPanelProps {
  data: Record<string, BollingerIndicator>
}

export function BollingerPanel({ data }: BollingerPanelProps) {
  const timeframes = Object.keys(data)

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>布林带 (20,2)</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={timeframes[0]}>
          <TabsList className='h-7'>
            {timeframes.map((tf) => (
              <TabsTrigger key={tf} value={tf} className='text-xs px-2 h-6'>
                {tf.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>
          {timeframes.map((tf) => {
            const b = data[tf]
            return (
              <TabsContent key={tf} value={tf} className='mt-2'>
                <div className='space-y-2'>
                  <div className='grid grid-cols-3 gap-2 text-xs'>
                    <div>
                      <span className='text-muted-foreground'>上轨</span>
                      <div className='font-mono tabular-nums text-red-600 dark:text-red-400'>
                        ${b.upper.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>中轨</span>
                      <div className='font-mono tabular-nums'>
                        ${b.middle.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>下轨</span>
                      <div className='font-mono tabular-nums text-green-600 dark:text-green-400'>
                        ${b.lower.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 价格位置可视化 */}
                  <BollingerBar position={b.position_pct} />

                  <div className='flex gap-1'>
                    <Badge variant='outline' className='text-xs'>
                      中轨{b.price_vs_middle === 'above' ? '上方' : b.price_vs_middle === 'below' ? '下方' : '附近'}
                    </Badge>
                    <Badge variant='outline' className='text-xs'>
                      {b.bandwidth_direction === 'expanding' ? '开口扩张' : b.bandwidth_direction === 'contracting' ? '开口收缩' : '开口平稳'}
                    </Badge>
                  </div>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}

function BollingerBar({ position }: { position: number }) {
  const pct = Math.min(Math.max(position, 2), 98)

  return (
    <div className='relative h-4 bg-gradient-to-r from-green-100 via-slate-100 to-red-100 dark:from-green-950 dark:via-slate-900 dark:to-red-950 rounded-full overflow-hidden'>
      {/* 中轨标记 */}
      <div className='absolute left-1/2 top-0 bottom-0 w-px bg-foreground/20' />
      {/* 价格位置 */}
      <div
        className='absolute top-0.5 bottom-0.5 w-2.5 rounded-full bg-blue-500 shadow-sm'
        style={{ left: `calc(${pct}% - 5px)` }}
      />
      <div className='absolute left-1 top-0 text-[9px] text-muted-foreground leading-4'>
        下轨
      </div>
      <div className='absolute right-1 top-0 text-[9px] text-muted-foreground leading-4'>
        上轨
      </div>
    </div>
  )
}

// ============================================
// RSI 面板
// ============================================

interface RsiPanelProps {
  data: Record<string, RsiIndicator>
}

export function RsiPanel({ data }: RsiPanelProps) {
  const timeframes = Object.keys(data)

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>RSI (14)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {timeframes.map((tf) => {
            const r = data[tf]
            return (
              <div key={tf} className='space-y-1'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium'>
                    {tf.toUpperCase()}
                  </span>
                  <div className='flex items-center gap-1.5'>
                    <span
                      className={`text-sm font-mono tabular-nums font-medium ${
                        r.value >= 70
                          ? 'text-red-600 dark:text-red-400'
                          : r.value <= 30
                            ? 'text-green-600 dark:text-green-400'
                            : ''
                      }`}
                    >
                      {r.value.toFixed(1)}
                    </span>
                    <Badge variant='outline' className='text-[10px] h-4 px-1'>
                      {r.zone === 'overbought'
                        ? '超买'
                        : r.zone === 'oversold'
                          ? '超卖'
                          : r.zone === 'neutral_bullish'
                            ? '偏多'
                            : '偏空'}
                    </Badge>
                  </div>
                </div>
                <RsiBar value={r.value} />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function RsiBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 2), 98)

  return (
    <div className='relative h-2.5 bg-gradient-to-r from-green-200 via-slate-100 to-red-200 dark:from-green-900 dark:via-slate-800 dark:to-red-900 rounded-full overflow-hidden'>
      {/* 30/70 标记 */}
      <div className='absolute top-0 bottom-0 w-px bg-green-400/50' style={{ left: '30%' }} />
      <div className='absolute top-0 bottom-0 w-px bg-foreground/20' style={{ left: '50%' }} />
      <div className='absolute top-0 bottom-0 w-px bg-red-400/50' style={{ left: '70%' }} />
      {/* 当前值 */}
      <div
        className={`absolute top-0 bottom-0 w-2 rounded-full ${
          value >= 70
            ? 'bg-red-500'
            : value <= 30
              ? 'bg-green-500'
              : 'bg-blue-500'
        }`}
        style={{ left: `calc(${pct}% - 4px)` }}
      />
    </div>
  )
}

// ============================================
// KDJ 面板
// ============================================

interface KdjPanelProps {
  data: Record<string, KdjIndicator>
}

export function KdjPanel({ data }: KdjPanelProps) {
  const timeframes = Object.keys(data)

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>KDJ (9,3,3)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {timeframes.map((tf) => {
            const k = data[tf]
            return (
              <div key={tf} className='space-y-1'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium'>
                    {tf.toUpperCase()}
                  </span>
                  <div className='flex items-center gap-1'>
                    <span className='text-[10px] text-muted-foreground'>
                      K:{k.k.toFixed(0)} D:{k.d.toFixed(0)} J:{k.j.toFixed(0)}
                    </span>
                    {k.cross && (
                      <Badge
                        variant={
                          k.cross === 'golden' ? 'default' : 'destructive'
                        }
                        className='text-[10px] h-4 px-1'
                      >
                        {k.cross === 'golden' ? '金叉' : '死叉'}
                      </Badge>
                    )}
                    <Badge variant='outline' className='text-[10px] h-4 px-1'>
                      {k.zone === 'overbought'
                        ? '超买'
                        : k.zone === 'oversold'
                          ? '超卖'
                          : k.zone === 'bullish'
                            ? '偏多'
                            : k.zone === 'bearish'
                              ? '偏空'
                              : '中性'}
                    </Badge>
                  </div>
                </div>
                {/* 简易 K/D 条形图 */}
                <div className='flex gap-1'>
                  <KdjBar value={k.k} color='blue' />
                  <KdjBar value={k.d} color='orange' />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function KdjBar({
  value,
  color,
}: {
  value: number
  color: 'blue' | 'orange'
}) {
  const pct = Math.min(Math.max(value, 2), 98)
  const bgColor = color === 'blue' ? 'bg-blue-500' : 'bg-orange-500'

  return (
    <div className='flex-1 relative h-2 bg-muted rounded-full overflow-hidden'>
      <div
        className={`absolute top-0 bottom-0 left-0 ${bgColor} rounded-full`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
