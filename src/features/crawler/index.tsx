import { useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type CrawlMode = 'crawl' | 'md' | 'llm'

const DEFAULT_API_BASE =
  import.meta.env.VITE_CRAWL4AI_API_URL || 'https://crawl4ai.hackerbee.life'
const DEFAULT_TOKEN = import.meta.env.VITE_CRAWL4AI_SECRET_KEY || ''
const CF_ACCESS_CLIENT_ID = import.meta.env.VITE_CF_ACCESS_CLIENT_ID
const CF_ACCESS_CLIENT_SECRET = import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET

function maskSecret(value?: string) {
  if (!value) return '未设置'
  if (value.length <= 8) return `${value.slice(0, 2)}***`
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function parseUrls(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildHeaders(token: string) {
  const headers: Record<string, string> = {
    'CF-Access-Client-Id': CF_ACCESS_CLIENT_ID || '',
    'CF-Access-Client-Secret': CF_ACCESS_CLIENT_SECRET || '',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export function Crawler() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE)
  const [token, setToken] = useState(DEFAULT_TOKEN)
  const [mode, setMode] = useState<CrawlMode>('crawl')
  const [urlsText, setUrlsText] = useState('https://example.com')
  const [mdFilter, setMdFilter] = useState('raw')
  const [mdQuery, setMdQuery] = useState('')
  const [llmQuery, setLlmQuery] = useState('Extract title and main content')
  const [schemaText, setSchemaText] = useState('')
  const [useCache, setUseCache] = useState(true)
  const [headless, setHeadless] = useState(true)
  const [bypassCache, setBypassCache] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [responseBody, setResponseBody] = useState('')
  const [responseStatus, setResponseStatus] = useState<number | null>(null)
  const [responseContentType, setResponseContentType] = useState('')

  const urls = useMemo(() => parseUrls(urlsText), [urlsText])
  const hasCfAccess = Boolean(CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET)

  const handleRun = async () => {
    setError(null)
    setResponseBody('')
    setResponseStatus(null)
    setResponseContentType('')

    if (!apiBase) {
      setError('请设置 API Base URL')
      return
    }

    const normalizedBase = apiBase.replace(/\/+$/, '')

    if (!hasCfAccess) {
      setError('缺少 Cloudflare Access 配置，请检查环境变量')
      return
    }

    if (urls.length === 0) {
      setError('请至少输入一个 URL')
      return
    }

    if (mode === 'md' && ['bm25', 'llm'].includes(mdFilter) && !mdQuery.trim()) {
      setError('当前过滤类型需要提供 Query')
      return
    }

    if (mode === 'llm' && !llmQuery.trim()) {
      setError('LLM 模式需要提供 Query')
      return
    }

    let schemaPayload: Record<string, unknown> | undefined
    if (mode === 'llm' && schemaText.trim()) {
      try {
        schemaPayload = JSON.parse(schemaText)
      } catch (err) {
        setError('Schema JSON 解析失败，请检查格式')
        return
      }
    }

    setLoading(true)
    try {
      const headers = buildHeaders(token)
      let response: Response

      if (mode === 'crawl') {
        response = await fetch(`${normalizedBase}/crawl`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            urls,
            browser_config: { headless },
            crawler_config: {
              stream: false,
              cache_mode: bypassCache ? 'bypass' : 'default',
            },
          }),
        })
      } else if (mode === 'md') {
        // 新版 Crawl4AI 使用 POST 请求
        const body: Record<string, unknown> = {
          url: urls[0],
          f: mdFilter,
        }
        if (useCache) body.c = '1'
        if (['bm25', 'llm'].includes(mdFilter) && mdQuery) {
          body.q = mdQuery
        }
        response = await fetch(`${normalizedBase}/md`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })
      } else {
        // LLM 端点也使用 POST 请求
        const body: Record<string, unknown> = {
          url: urls[0],
          q: llmQuery,
        }
        if (useCache) body.c = '1'
        if (schemaPayload) {
          body.s = schemaPayload
        }
        response = await fetch(`${normalizedBase}/llm`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })
      }

      const contentType = response.headers.get('Content-Type') || ''
      setResponseStatus(response.status)
      setResponseContentType(contentType)

      if (contentType.includes('application/json')) {
        const json = await response.json()
        setResponseBody(JSON.stringify(json, null, 2))
      } else {
        const text = await response.text()
        setResponseBody(text)
      }

      if (!response.ok) {
        setError(`请求失败: ${response.status}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Crawl4AI 爬虫模块</h2>
          <p className='text-muted-foreground'>
            基于 Crawl4AI API 的爬取、Markdown 清洗与 LLM 抽取测试工具
          </p>
        </div>

        <div className='grid gap-6 lg:grid-cols-[1.2fr_1fr]'>
          <Card>
            <CardHeader>
              <CardTitle>请求配置</CardTitle>
              <CardDescription>
                通过环境变量读取 Cloudflare Access Key，并支持自定义 Bearer Token
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label>API Base URL</Label>
                  <Input
                    value={apiBase}
                    onChange={(event) => setApiBase(event.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Authorization Token (可选)</Label>
                  <Input
                    type='password'
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder='Bearer Token'
                  />
                </div>
              </div>

              <div className='grid gap-3 text-sm text-muted-foreground'>
                <div className='flex items-center gap-2'>
                  <Badge variant={hasCfAccess ? 'default' : 'destructive'}>
                    CF Access
                  </Badge>
                  <span>Client ID: {maskSecret(CF_ACCESS_CLIENT_ID)}</span>
                  <span>Secret: {maskSecret(CF_ACCESS_CLIENT_SECRET)}</span>
                </div>
              </div>

              <div className='space-y-2'>
                <Label>URL 列表</Label>
                <Textarea
                  value={urlsText}
                  onChange={(event) => setUrlsText(event.target.value)}
                  rows={4}
                  placeholder='支持多行或逗号分隔'
                />
              </div>

              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label>模式</Label>
                  <Select value={mode} onValueChange={(value) => setMode(value as CrawlMode)}>
                    <SelectTrigger>
                      <SelectValue placeholder='选择模式' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='crawl'>Crawl</SelectItem>
                      <SelectItem value='md'>Markdown</SelectItem>
                      <SelectItem value='llm'>LLM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex items-center gap-3 pt-6'>
                  <Switch id='use-cache' checked={useCache} onCheckedChange={setUseCache} />
                  <Label htmlFor='use-cache'>启用缓存</Label>
                </div>
              </div>

              {mode === 'crawl' && (
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='flex items-center gap-3'>
                    <Switch
                      id='headless'
                      checked={headless}
                      onCheckedChange={setHeadless}
                    />
                    <Label htmlFor='headless'>Headless 浏览器</Label>
                  </div>
                  <div className='flex items-center gap-3'>
                    <Switch
                      id='bypass-cache'
                      checked={bypassCache}
                      onCheckedChange={setBypassCache}
                    />
                    <Label htmlFor='bypass-cache'>绕过缓存</Label>
                  </div>
                </div>
              )}

              {mode === 'md' && (
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label>过滤类型</Label>
                    <Select value={mdFilter} onValueChange={setMdFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder='选择过滤类型' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='raw'>raw</SelectItem>
                        <SelectItem value='fit'>fit</SelectItem>
                        <SelectItem value='bm25'>bm25</SelectItem>
                        <SelectItem value='llm'>llm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label>Query (bm25/llm 必填)</Label>
                    <Input
                      value={mdQuery}
                      onChange={(event) => setMdQuery(event.target.value)}
                      placeholder='extract main content'
                    />
                  </div>
                </div>
              )}

              {mode === 'llm' && (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>LLM Query</Label>
                    <Input
                      value={llmQuery}
                      onChange={(event) => setLlmQuery(event.target.value)}
                      placeholder='Extract title and content'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Schema (可选 JSON)</Label>
                    <Textarea
                      value={schemaText}
                      onChange={(event) => setSchemaText(event.target.value)}
                      rows={4}
                      placeholder='{"type":"object","properties":{"title":{"type":"string"}}}'
                    />
                  </div>
                </div>
              )}

              <div className='flex items-center gap-3'>
                <Button onClick={handleRun} disabled={loading}>
                  {loading ? '请求中...' : '发送请求'}
                </Button>
                <span className='text-sm text-muted-foreground'>
                  当前 URL 数量：{urls.length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className='min-h-[480px]'>
            <CardHeader>
              <CardTitle>响应结果</CardTitle>
              <CardDescription>
                {responseStatus
                  ? `HTTP ${responseStatus} · ${responseContentType || 'unknown'}`
                  : '等待请求'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant='destructive' className='mb-4'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertTitle>请求失败</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className='rounded-md border bg-muted p-4 text-xs whitespace-pre-wrap break-words min-h-[320px]'>
                {responseBody || '暂无响应内容'}
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
