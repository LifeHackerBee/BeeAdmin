import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import type { AiStrategyOutput } from '../hooks/use-ai-strategy'

interface Props {
  result: AiStrategyOutput | null
  loading: boolean
  error: Error | null
  onGenerate: () => void
  hasData: boolean
  coin: string
}

export function AiStrategyCard({
  result,
  loading,
  error,
  onGenerate,
  hasData,
  coin,
}: Props) {
  return (
    <Card className='border-2 border-dashed border-purple-300 dark:border-purple-700'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base flex items-center gap-2'>
            <Sparkles className='h-4 w-4 text-purple-500' />
            AI 策略判断
          </CardTitle>
          <Button
            size='sm'
            variant='outline'
            onClick={onGenerate}
            disabled={loading || !hasData}
            className='gap-1'
          >
            {loading ? (
              <>
                <RefreshCw className='h-3 w-3 animate-spin' />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className='h-3 w-3' />
                {result ? '重新生成' : 'AI 生成策略'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant='destructive' className='mb-3'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {!result && !loading && !error && (
          <p className='text-sm text-muted-foreground py-4 text-center'>
            {hasData
              ? '点击「AI 生成策略」让 AI 基于当前技术指标生成交易建议'
              : '请先分析币种数据，再生成 AI 策略'}
          </p>
        )}

        {loading && !result && (
          <div className='flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground'>
            <RefreshCw className='h-4 w-4 animate-spin' />
            AI 正在分析 {coin} 的多周期技术指标...
          </div>
        )}

        {result && (
          <div className='prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap'>
            {result.content}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
