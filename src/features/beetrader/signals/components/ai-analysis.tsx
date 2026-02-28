import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, StopCircle, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { OrderRadarData } from '../hooks/use-order-radar'
import { useOrderRadarAI } from '../hooks/use-order-radar-ai'

interface AIAnalysisProps {
  data: OrderRadarData
}

export function AIAnalysis({ data }: AIAnalysisProps) {
  const { analyze, streaming, content, error, abort, reset } = useOrderRadarAI()

  const handleAnalyze = () => {
    analyze(data.coin, data)
  }

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm flex items-center gap-2'>
            <Sparkles className='h-4 w-4' />
            AI 交易建议
            {streaming && (
              <Badge variant='secondary' className='text-xs gap-1'>
                <Loader2 className='h-3 w-3 animate-spin' />
                分析中
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
                onClick={
                  content
                    ? () => {
                        reset()
                        handleAnalyze()
                      }
                    : handleAnalyze
                }
                className='gap-1 text-xs'
              >
                {content ? <RotateCcw className='h-3 w-3' /> : <Sparkles className='h-3 w-3' />}
                {content ? '重新分析' : 'AI 分析'}
              </Button>
            )}
          </div>
        </div>
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
  )
}
