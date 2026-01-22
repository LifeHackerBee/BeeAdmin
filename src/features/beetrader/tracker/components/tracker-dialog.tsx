import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { CreateTaskRequest } from '../hooks/use-tracker'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TrackerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (request: CreateTaskRequest) => Promise<unknown>
  onSuccess?: () => void
}

export function TrackerDialog({ open, onOpenChange, onCreate, onSuccess }: TrackerDialogProps) {
  const [walletAddress, setWalletAddress] = useState('')
  const [interval, setInterval] = useState(60)
  const [localMode, setLocalMode] = useState(false)
  const [autoStart, setAutoStart] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!walletAddress.trim()) {
      setError('请输入钱包地址')
      return
    }

    // 验证地址格式
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      setError('无效的钱包地址格式（应为 0x 开头的 42 位地址）')
      return
    }

    // 验证间隔
    if (interval < 1 || interval > 3600) {
      setError('间隔必须在 1-3600 秒之间')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onCreate({
        wallet_address: walletAddress.trim(),
        interval,
        local_mode: localMode,
        auto_start: autoStart,
      })
      setWalletAddress('')
      setInterval(60)
      setLocalMode(false)
      setAutoStart(true)
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建任务失败')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setWalletAddress('')
      setInterval(60)
      setLocalMode(false)
      setAutoStart(true)
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>创建监控任务</DialogTitle>
            <DialogDescription>
              创建一个新的钱包监控任务，系统将定期检查钱包状态
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='wallet-address'>钱包地址 *</Label>
              <Input
                id='wallet-address'
                placeholder='0x...'
                value={walletAddress}
                onChange={(e) => {
                  setWalletAddress(e.target.value)
                  setError(null)
                }}
                disabled={loading}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='interval'>监控间隔（秒）</Label>
              <Input
                id='interval'
                type='number'
                min={1}
                max={3600}
                value={interval}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10)
                  if (!isNaN(value)) {
                    setInterval(value)
                  }
                }}
                disabled={loading}
              />
              <p className='text-xs text-muted-foreground'>范围：1-3600 秒，默认 60 秒</p>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='local-mode'
                checked={localMode}
                onCheckedChange={(checked) => setLocalMode(checked === true)}
                disabled={loading}
              />
              <Label htmlFor='local-mode' className='text-sm font-normal cursor-pointer'>
                本地模式（不保存到 Supabase）
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='auto-start'
                checked={autoStart}
                onCheckedChange={(checked) => setAutoStart(checked === true)}
                disabled={loading}
              />
              <Label htmlFor='auto-start' className='text-sm font-normal cursor-pointer'>
                自动启动任务
              </Label>
            </div>
            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type='submit' disabled={loading}>
              {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              创建任务
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
