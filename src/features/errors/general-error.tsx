import { cn } from '@/lib/utils'
import { translations } from '@/lib/i18n/translations'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
  error?: Error
}

// 安全翻译函数，直接引用 translations 对象，不依赖 React context
function safeT(key: string): string {
  try {
    return (translations as Record<string, Record<string, string>>)['zh']?.[key]
      ?? (translations as Record<string, Record<string, string>>)['en']?.[key]
      ?? key
  } catch {
    return key
  }
}

export function GeneralError({
  className,
  minimal = false,
  error,
}: GeneralErrorProps) {
  // 打印原始错误方便调试
  if (error) {
    console.error('[GeneralError] 原始错误:', error)
  }

  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>{safeT('error.500.title')}</span>
        <p className='text-center text-muted-foreground'>
          {safeT('error.500.description')}
        </p>
        {error && (
          <pre className='mt-2 max-w-lg overflow-auto rounded bg-muted p-3 text-xs text-destructive'>
            {error.message}
          </pre>
        )}
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            <button
              className='inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent'
              onClick={() => window.history.back()}
            >
              {safeT('common.goBack')}
            </button>
            <button
              className='inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
              onClick={() => (window.location.href = '/')}
            >
              {safeT('common.backToHome')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
