import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { VolumeAnalysis as VolumeAnalysisData } from '../types'

const TREND_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  increasing: {
    icon: <TrendingUp className='h-4 w-4' />,
    label: '放量',
    color: 'text-green-600 dark:text-green-400',
  },
  declining: {
    icon: <TrendingDown className='h-4 w-4' />,
    label: '缩量',
    color: 'text-red-600 dark:text-red-400',
  },
  stable: {
    icon: <Minus className='h-4 w-4' />,
    label: '平稳',
    color: 'text-slate-600 dark:text-slate-400',
  },
  unknown: {
    icon: <Minus className='h-4 w-4' />,
    label: '未知',
    color: 'text-muted-foreground',
  },
}

interface Props {
  data: VolumeAnalysisData
}

export function VolumeAnalysisPanel({ data }: Props) {
  const trend = TREND_CONFIG[data.recent_trend] || TREND_CONFIG.unknown

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>成交量分析</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {/* 核心指标 */}
        <div className='grid grid-cols-3 gap-3'>
          <div className='rounded-md border p-2'>
            <div className='text-xs text-muted-foreground'>量能趋势</div>
            <div className={`flex items-center gap-1 text-sm font-medium ${trend.color}`}>
              {trend.icon}
              {trend.label}
            </div>
          </div>
          <div className='rounded-md border p-2'>
            <div className='text-xs text-muted-foreground'>量比</div>
            <div className='text-sm font-mono tabular-nums font-medium'>
              {data.vol_ratio?.toFixed(2) ?? '-'}x
            </div>
          </div>
          <div className='rounded-md border p-2'>
            <div className='text-xs text-muted-foreground'>价格变化</div>
            <div
              className={`text-sm font-mono tabular-nums font-medium ${
                data.price_change_pct > 0
                  ? 'text-green-600 dark:text-green-400'
                  : data.price_change_pct < 0
                    ? 'text-red-600 dark:text-red-400'
                    : ''
              }`}
            >
              {data.price_change_pct > 0 ? '+' : ''}
              {data.price_change_pct?.toFixed(2) ?? '0'}%
            </div>
          </div>
        </div>

        {/* 量价匹配 */}
        <div className='flex items-center gap-2'>
          <Badge
            variant={data.volume_price_match ? 'default' : 'destructive'}
            className='text-xs'
          >
            {data.volume_price_match ? '量价匹配' : '量价背离'}
          </Badge>
          {data.is_hollow_rally && (
            <Badge variant='destructive' className='text-xs'>
              无量拉升
            </Badge>
          )}
        </div>

        {/* 无量拉升警告 */}
        {data.is_hollow_rally && (
          <Alert className='border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'>
            <AlertTriangle className='h-4 w-4 text-red-600 dark:text-red-400' />
            <AlertDescription className='text-xs text-red-700 dark:text-red-400'>
              检测到无量拉升! 上涨缺乏资金承接，大概率面临"怎么上去怎么下来"的局面，切忌盲目追高。
            </AlertDescription>
          </Alert>
        )}

        {/* 分析说明 */}
        <p className='text-xs text-muted-foreground'>{data.hint}</p>
      </CardContent>
    </Card>
  )
}
