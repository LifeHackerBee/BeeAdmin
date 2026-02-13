import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Bot, Send, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { askStream } from './api/huohuo'

const AGENT_NAME = '火火'

const markdownComponents: Components = {
  code(props) {
    const { className, children, ...rest } = props
    const match = /language-(\w+)/.exec(className ?? '')
    const code = String(children).replace(/\n$/, '')
    if (match) {
      return (
        <SyntaxHighlighter
          PreTag='div'
          style={oneDark}
          language={match[1]}
          customStyle={{
            margin: 0,
            borderRadius: '0.5rem',
            fontSize: '0.8125rem',
          }}
          codeTagProps={{ style: {} }}
        >
          {code}
        </SyntaxHighlighter>
      )
    }
    return (
      <code
        className='rounded bg-muted-foreground/15 px-1.5 py-0.5 font-mono text-sm'
        {...rest}
      >
        {children}
      </code>
    )
  },
}

/** 把火火输出的 ---##、)### 等连写格式转成标准 Markdown 换行与标题，便于正确渲染 */
function normalizeMarkdownContent(raw: string): string {
  return (
    raw
      // "当前场景)---##一、xxx" -> "当前场景)\n\n## 一、xxx"，让 ## 单独成段并识别为标题
      .replace(/---##/g, '\n\n## ')
      // "关键点在这:###" -> "关键点在这:\n\n### "，让 ### 单独成段
      .replace(/([：:)\）\s])###(?=\s|[\u4e00-\u9fff])/g, '$1\n\n### ')
      // "文字。\n下一段" 保持；"文字。下一段" 在中文句号后加空行，增加段落感
      .replace(/([。！？])([^\s\n\r])/g, '$1\n\n$2')
      // 独立的 "---" 前后加空行，渲染为分隔线
      .replace(/([^\n])\n---\n(?=[^\n#])/g, '$1\n\n---\n\n')
      .trim()
  )
}

function ChatMarkdown({ content }: { content: string }) {
  const normalized = normalizeMarkdownContent(content)
  return (
    <div className='chat-markdown text-sm leading-[1.65] [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:bg-muted/40 [&_blockquote]:py-1 [&_blockquote]:pl-3 [&_blockquote]:pr-2 [&_blockquote]:rounded-r [&_br]:block [&_br]:h-3 [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:scroll-mt-2 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:scroll-mt-2 [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-medium [&_li]:my-0.5 [&_li]:leading-6 [&_ol]:my-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_p]:my-2.5 [&_p]:leading-6 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_strong]:font-semibold [&_ul]:my-3 [&_ul]:pl-5 [&_ul]:list-disc'>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {normalized}
      </ReactMarkdown>
    </div>
  )
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const STORAGE_KEY = 'beeai-huohuo-messages'

function loadMessages(): Message[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m): m is Message =>
        m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        typeof m.timestamp === 'string'
    )
  } catch {
    return []
  }
}

function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {
    // ignore quota / private mode
  }
}

export function BeeAI() {
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streamContent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || streaming) return

    setInput('')
    setError(null)
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text, timestamp: new Date().toISOString() },
    ])
    setStreaming(true)
    setStreamContent('')

    try {
      const fullContent = await askStream(
        text,
        (chunk) => setStreamContent((c) => (c ?? '') + chunk),
        undefined
      )
      setStreamContent('')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: fullContent,
          timestamp: new Date().toISOString(),
        },
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setStreamContent('')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `[请求失败] ${msg}`,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setStreaming(false)
    }
  }

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
        </div>
      </Header>

      <Main fixed>
        <div className='flex h-full flex-col'>
          {/* 标题栏 */}
          <div className='flex shrink-0 items-center gap-3 border-b bg-card px-4 py-3'>
            <Avatar className='size-10'>
              <AvatarFallback className='text-xl'>🔥</AvatarFallback>
            </Avatar>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-lg font-semibold'>BeeAI</h1>
                <Sparkles size={18} className='text-primary' />
              </div>
              <p className='text-xs text-muted-foreground'>
                {AGENT_NAME} · OpenClaw 个人助手
              </p>
            </div>
          </div>

          {/* 消息区 */}
          <div
            ref={scrollRef}
            className='flex-1 overflow-y-auto p-4 space-y-4'
          >
            {messages.length === 0 && !streamContent && (
              <div className='flex flex-col items-center justify-center py-16 text-center text-muted-foreground'>
                <Bot className='size-12 mb-4 opacity-50' />
                <p className='text-sm'>和 {AGENT_NAME} 打个招呼吧</p>
                <p className='text-xs mt-1'>消息将实时流式返回</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={`${msg.role}-${msg.timestamp}`}
                className={cn(
                  'flex gap-3 max-w-[85%]',
                  msg.role === 'user' && 'ml-auto flex-row-reverse'
                )}
              >
                {msg.role === 'assistant' && (
                  <Avatar className='size-8 shrink-0'>
                    <AvatarFallback className='text-sm'>🔥</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 shadow-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className='flex items-center gap-1.5 mb-1.5'>
                      <Bot size={14} className='text-primary' />
                      <span className='text-xs font-medium text-muted-foreground'>
                        {AGENT_NAME}
                      </span>
                    </div>
                  )}
                  {msg.role === 'user' ? (
                    <div className='whitespace-pre-wrap'>{msg.content}</div>
                  ) : (
                    <ChatMarkdown content={msg.content} />
                  )}
                  <span
                    className={cn(
                      'mt-1.5 block text-xs',
                      msg.role === 'user'
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    )}
                  >
                    {format(new Date(msg.timestamp), 'HH:mm')}
                  </span>
                </div>
              </div>
            ))}

            {streaming && (
              <div className='flex gap-3 max-w-[85%]'>
                <Avatar className='size-8 shrink-0'>
                  <AvatarFallback className='text-sm'>🔥</AvatarFallback>
                </Avatar>
                <div className='rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 shadow-sm'>
                  <div className='flex items-center gap-1.5 mb-1.5'>
                    <Loader2 size={14} className='text-primary animate-spin' />
                    <span className='text-xs font-medium text-muted-foreground'>
                      {AGENT_NAME}
                    </span>
                  </div>
                  <div className='text-sm leading-relaxed'>
                    <ChatMarkdown content={streamContent} />
                    <span className='inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle' />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className='text-sm text-destructive px-1'>{error}</p>
            )}
          </div>

          {/* 输入区 */}
          <form
            onSubmit={handleSubmit}
            className='shrink-0 border-t bg-background p-4'
          >
            <div className='flex gap-2 rounded-lg border bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'>
              <input
                type='text'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='输入消息…'
                className='min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground'
                disabled={streaming}
                autoComplete='off'
              />
              <Button
                type='submit'
                size='icon'
                variant='ghost'
                disabled={!input.trim() || streaming}
                className='shrink-0'
              >
                {streaming ? (
                  <Loader2 size={20} className='animate-spin' />
                ) : (
                  <Send size={20} />
                )}
              </Button>
            </div>
          </form>
        </div>
      </Main>
    </>
  )
}
