import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
import type { AiStrategyOutput } from '../../strategies/hooks/use-ai-strategy'

interface AiStrategyPanelProps {
  coin: string
  result: AiStrategyOutput | null
  loading: boolean
}

export function AiStrategyPanel({
  coin,
  result,
  loading,
}: AiStrategyPanelProps) {
  if (!result && !loading) return null

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <Sparkles className='h-4 w-4' />
          {coin} AI 策略
          {loading && (
            <Badge variant='secondary' className='text-xs'>分析中...</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className='prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap'>
            {result.content}
          </div>
        ) : (
          <div className='text-sm text-muted-foreground py-4 text-center'>
            AI 正在分析技术指标...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
