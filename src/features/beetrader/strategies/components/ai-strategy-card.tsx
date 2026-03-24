import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkles, RefreshCw, AlertCircle, Globe, Flame, Target, Swords } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AiStrategyOutput, AiSectionKey } from '../hooks/use-ai-strategy'

const SECTION_META: Record<AiSectionKey, { icon: typeof Globe; color: string }> = {
  macro: { icon: Globe, color: 'text-blue-500' },
  sentiment: { icon: Flame, color: 'text-orange-500' },
  levels: { icon: Target, color: 'text-purple-500' },
  action: { icon: Swords, color: 'text-green-500' },
}

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

        {result?.sections ? (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {result.sections.map((section) => {
              const meta = SECTION_META[section.key]
              const Icon = meta.icon
              return (
                <div key={section.key} className='rounded-lg border p-3 space-y-2'>
                  <div className='flex items-center gap-1.5'>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    <span className='text-sm font-medium'>{section.title}</span>
                  </div>
                  <div className='prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5'>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {section.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )
            })}
          </div>
        ) : result?.content ? (
          <div className='prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed'>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result.content}
            </ReactMarkdown>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
