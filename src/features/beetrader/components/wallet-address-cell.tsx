import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const ANALYSIS_BASE_URL = 'https://app.coinmarketman.com/hypertracker/wallet'
const TRUNCATE_HEAD = 6
const TRUNCATE_TAIL = 8

function truncateAddress(addr: string): string {
  if (addr.length <= TRUNCATE_HEAD + TRUNCATE_TAIL + 3) return addr
  return `${addr.slice(0, TRUNCATE_HEAD)}...${addr.slice(-TRUNCATE_TAIL)}`
}

export function WalletAddressCell({
  address,
  linkToAnalyzer = false,
}: {
  address: string
  /** 为 true 时地址可点击跳转 Trader 分析并自动分析，外链按钮改为在新标签打开 Trader 分析 */
  linkToAnalyzer?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [showFull, setShowFull] = useState(false)
  const isShort = address.length <= TRUNCATE_HEAD + TRUNCATE_TAIL + 3
  const displayAddress = showFull || isShort ? address : truncateAddress(address)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address)
        setCopied(true)
        toast.success('地址已复制')
        setTimeout(() => setCopied(false), 2000)
      } else {
        const ta = document.createElement('textarea')
        ta.value = address
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopied(true)
        toast.success('地址已复制')
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  const analyzerUrl = linkToAnalyzer
    ? `/beetrader/analyzer?address=${encodeURIComponent(address)}&autoAnalyze=1`
    : `${ANALYSIS_BASE_URL}/${address}`

  const addressNode = linkToAnalyzer ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={analyzerUrl}
          className='font-mono text-sm break-all text-primary hover:underline focus:outline-none focus:underline'
          title={address}
          onClick={(e) => e.stopPropagation()}
        >
          {displayAddress}
        </a>
      </TooltipTrigger>
      <TooltipContent>跳转 Trader 分析并自动分析</TooltipContent>
    </Tooltip>
  ) : (
    <span className='font-mono text-sm break-all' title={address}>
      {displayAddress}
    </span>
  )

  return (
    <div className='flex items-center gap-2 min-w-0'>
      {addressNode}
      {!isShort && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 flex-shrink-0'
              onClick={(e) => {
                e.stopPropagation()
                setShowFull((v) => !v)
              }}
              title={showFull ? '收起地址' : '显示完整地址'}
            >
              {showFull ? (
                <EyeOff className='h-3 w-3' />
              ) : (
                <Eye className='h-3 w-3' />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showFull ? '收起地址' : '显示完整地址'}</TooltipContent>
        </Tooltip>
      )}
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6 flex-shrink-0'
        onClick={handleCopy}
        title='复制地址'
      >
        {copied ? (
          <Check className='h-3 w-3 text-green-500' />
        ) : (
          <Copy className='h-3 w-3' />
        )}
      </Button>
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6 flex-shrink-0'
        onClick={(e) => {
          e.stopPropagation()
          window.open(analyzerUrl, '_blank')
        }}
        title={linkToAnalyzer ? '在新标签打开 Trader 分析' : '打开钱包分析'}
      >
        <ExternalLink className='h-3 w-3' />
      </Button>
    </div>
  )
}
