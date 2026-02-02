import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

const ANALYSIS_BASE_URL = 'https://app.coinmarketman.com/hypertracker/wallet'

export function WalletAddressCell({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)

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

  const analysisUrl = `${ANALYSIS_BASE_URL}/${address}`

  return (
    <div className='flex items-center gap-2 min-w-0'>
      <span className='font-mono text-sm break-all' title={address}>
        {address}
      </span>
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
          window.open(analysisUrl, '_blank')
        }}
        title='打开钱包分析'
      >
        <ExternalLink className='h-3 w-3' />
      </Button>
    </div>
  )
}
