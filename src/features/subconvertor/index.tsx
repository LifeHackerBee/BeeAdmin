import { useMemo, useState } from 'react'
import { Copy, Link2 } from 'lucide-react'
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

const SUBCONVERTOR_BASE =
  import.meta.env.VITE_SUBCONVERTOR_BASE || 'https://subconvertor.dajin-tech.com.cn/sub'
const SUBCONVERTOR_TARGETS = [
  { value: 'clash', label: 'Clash' },
  { value: 'surge', label: 'Surge' },
  { value: 'shadowrocket', label: 'Shadowrocket' },
  { value: 'quanx', label: 'Quantumult X' },
  { value: 'v2ray', label: 'V2Ray' },
] as const

function buildSubconvertorUrl(base: string, target: string, subscriptionUrl: string): string {
  const normalizedBase = base.replace(/\/+$/, '')
  const encoded = encodeURIComponent(subscriptionUrl.trim())
  return `${normalizedBase}?target=${encodeURIComponent(target)}&url=${encoded}`
}

export function Subconvertor() {
  const [base, setBase] = useState(SUBCONVERTOR_BASE)
  const [target, setTarget] = useState('clash')
  const [subscriptionUrl, setSubscriptionUrl] = useState('')
  const [outputFilename, setOutputFilename] = useState('clash.yaml')

  const resultUrl = useMemo(() => {
    const trimmed = subscriptionUrl.trim()
    if (!trimmed) return ''
    return buildSubconvertorUrl(base, target, trimmed)
  }, [base, target, subscriptionUrl])

  const wgetCommand = useMemo(() => {
    if (!resultUrl) return ''
    const name = outputFilename.trim() || 'clash.yaml'
    return `wget "${resultUrl}" -O ${name}`
  }, [resultUrl, outputFilename])

  const handleCopy = async () => {
    if (!resultUrl) return
    await navigator.clipboard.writeText(resultUrl)
  }

  const handleCopyWget = async () => {
    if (!wgetCommand) return
    await navigator.clipboard.writeText(wgetCommand)
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
          <h2 className='text-2xl font-bold tracking-tight'>Subconvertor 转换</h2>
          <p className='text-muted-foreground'>
            输入订阅链接，自动 URL 编码并拼接到转换服务地址，生成 Clash/Surge 等客户端可用的转换链接与 wget 命令
          </p>
        </div>

        <div className='grid gap-6 lg:grid-cols-[1fr_1fr]'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Link2 className='h-5 w-5' />
                配置
              </CardTitle>
              <CardDescription>
                转换服务地址、目标格式与订阅链接
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label>转换服务 Base URL</Label>
                <Input
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  placeholder='https://subconvertor.dajin-tech.com.cn/sub'
                />
              </div>
              <div className='space-y-2'>
                <Label>目标格式 (target)</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder='选择格式' />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBCONVERTOR_TARGETS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>订阅链接 (原始 URL)</Label>
                <Textarea
                  value={subscriptionUrl}
                  onChange={(e) => setSubscriptionUrl(e.target.value)}
                  rows={4}
                  placeholder='https://example.com/api/v1/sub?token=xxx'
                />
              </div>
              <div className='space-y-2'>
                <Label>输出文件名 (用于 wget -O)</Label>
                <Input
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder='clash.yaml'
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>转换结果</CardTitle>
              <CardDescription>
                将上述订阅链接 URL 编码后拼接到 Base?target=xxx&url= 的链接，可直接用于客户端订阅或 wget 下载
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='rounded-md border bg-muted p-4 text-xs whitespace-pre-wrap break-words min-h-[120px]'>
                {resultUrl || '输入订阅链接后自动生成'}
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleCopy}
                  disabled={!resultUrl}
                  className='gap-2'
                >
                  <Copy className='h-4 w-4' />
                  复制链接
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleCopyWget}
                  disabled={!wgetCommand}
                  className='gap-2'
                >
                  <Copy className='h-4 w-4' />
                  复制 wget 命令
                </Button>
              </div>
              {wgetCommand && (
                <div className='space-y-2'>
                  <Label className='text-muted-foreground'>wget 命令</Label>
                  <div className='rounded-md border bg-muted p-3 text-xs font-mono whitespace-pre-wrap break-all'>
                    {wgetCommand}
                  </div>
                </div>
              )}
              {resultUrl && (
                <a
                  href={resultUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='block text-sm text-primary hover:underline'
                >
                  在新标签页打开
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
