import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TimeframeStatus } from '../types'

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; icon: string }
> = {
  bullish_alert: {
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    icon: '▲',
  },
  bullish: {
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    icon: '▲',
  },
  strong: {
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    icon: '▲',
  },
  repair_alert: {
    color: 'text-yellow-700 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: '◆',
  },
  repair: {
    color: 'text-yellow-700 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: '◆',
  },
  neutral: {
    color: 'text-slate-700 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-950/30',
    border: 'border-slate-200 dark:border-slate-800',
    icon: '—',
  },
  weak_alert: {
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: '▼',
  },
  bearish_alert: {
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: '▼',
  },
  bearish: {
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: '▼',
  },
}

const TERM_LABELS: Record<string, { title: string; desc: string }> = {
  short_term: { title: '短线', desc: '1H - 4H' },
  mid_term: { title: '中线', desc: '日线' },
  long_term: { title: '长线', desc: '周线' },
}

interface Props {
  data: TimeframeStatus
}

export function TimeframeStatusCards({ data }: Props) {
  const terms = ['short_term', 'mid_term', 'long_term'] as const

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
      {terms.map((term) => {
        const item = data[term]
        const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.neutral
        const labels = TERM_LABELS[term]

        return (
          <Card
            key={term}
            className={`${config.bg} ${config.border} border`}
          >
            <CardContent className='pt-4 pb-3 px-4'>
              <div className='flex items-center justify-between mb-2'>
                <div>
                  <span className='text-sm font-semibold'>
                    {labels.title}
                  </span>
                  <span className='text-xs text-muted-foreground ml-2'>
                    {labels.desc}
                  </span>
                </div>
                <Badge
                  variant='outline'
                  className={`${config.color} ${config.border} text-xs`}
                >
                  {config.icon} {item.label}
                </Badge>
              </div>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                {item.detail}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
