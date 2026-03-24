import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Globe, Flame, Target, Swords } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AiStrategyOutput, AiSectionKey } from '../../strategies/hooks/use-ai-strategy'

const SECTION_META: Record<AiSectionKey, { icon: typeof Globe; color: string }> = {
  macro: { icon: Globe, color: 'text-blue-500' },
  sentiment: { icon: Flame, color: 'text-orange-500' },
  levels: { icon: Target, color: 'text-purple-500' },
  action: { icon: Swords, color: 'text-green-500' },
}

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
        {result?.sections ? (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {result.sections.map((section) => {
              const meta = SECTION_META[section.key]
              const Icon = meta.icon
              return (
                <div
                  key={section.key}
                  className='rounded-lg border p-3 space-y-2'
                >
                  <div className='flex items-center gap-1.5'>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    <span className='text-sm font-medium'>{section.title}</span>
                  </div>
                  <div className='prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_blockquote]:my-1'>
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
        ) : (
          <div className='text-sm text-muted-foreground py-4 text-center'>
            AI 正在分析技术指标...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
