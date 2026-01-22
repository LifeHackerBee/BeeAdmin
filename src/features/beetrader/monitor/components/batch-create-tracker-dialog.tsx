import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { useWallets } from './tasks-provider'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'

interface BatchCreateResult {
  wallet_address: string
  status: 'created' | 'skipped' | 'failed'
  task_id?: string | null
  message: string
}

interface BatchCreateResponse {
  total: number
  created: number
  skipped: number
  failed: number
  results: BatchCreateResult[]
}

export function BatchCreateTrackerDialog() {
  const { open, setOpen } = useWallets()
  const [loading, setLoading] = useState(false)
  const [wallets, setWallets] = useState<Array<{ id: string; address: string; note?: string }>>([])
  const [selectedWallets, setSelectedWallets] = useState<Set<string>>(new Set())
  const [interval, setInterval] = useState(60)
  const [autoStart, setAutoStart] = useState(true)
  const [overwrite, setOverwrite] = useState(false)
  const [result, setResult] = useState<BatchCreateResponse | null>(null)

  const isOpen = open === 'batch-create-tracker'

  // 加载钱包列表
  useEffect(() => {
    if (isOpen) {
      loadWallets()
    } else {
      // 关闭时重置状态
      setSelectedWallets(new Set())
      setResult(null)
    }
  }, [isOpen])

  const loadWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('id, address, note')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setWallets(data || [])
      // 默认全选
      setSelectedWallets(new Set((data || []).map((w) => w.id)))
    } catch (err) {
      toast.error('加载失败', {
        description: err instanceof Error ? err.message : '无法加载钱包列表',
      })
    }
  }

  const handleToggleWallet = (walletId: string) => {
    const newSelected = new Set(selectedWallets)
    if (newSelected.has(walletId)) {
      newSelected.delete(walletId)
    } else {
      newSelected.add(walletId)
    }
    setSelectedWallets(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedWallets.size === wallets.length) {
      setSelectedWallets(new Set())
    } else {
      setSelectedWallets(new Set(wallets.map((w) => w.id)))
    }
  }

  const handleSubmit = async () => {
    if (selectedWallets.size === 0) {
      toast.error('请至少选择一个钱包地址')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      // 获取选中的钱包地址
      const selectedAddresses = wallets
        .filter((w) => selectedWallets.has(w.id))
        .map((w) => w.address)

      const response = await fetch(`${API_BASE_URL}/api/monitor/tasks/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_addresses: selectedAddresses,
          interval,
          auto_start: autoStart,
          overwrite,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const batchResult: BatchCreateResponse = await response.json()
      setResult(batchResult)

      if (batchResult.failed === 0) {
        toast.success('成功', {
          description: `成功创建 ${batchResult.created} 个监控任务${batchResult.skipped > 0 ? `，跳过 ${batchResult.skipped} 个已存在的任务` : ''}`,
        })
      } else {
        toast.error('部分成功', {
          description: `创建了 ${batchResult.created} 个任务，${batchResult.failed} 个失败`,
        })
      }
    } catch (error) {
      toast.error('创建失败', {
        description: error instanceof Error ? error.message : '未知错误',
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedCount = selectedWallets.size

  return (
    <Dialog open={isOpen} onOpenChange={(open) => setOpen(open ? 'batch-create-tracker' : null)}>
      <DialogContent className='sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle>批量创建监控任务</DialogTitle>
          <DialogDescription>
            从巨鲸钱包列表中选择钱包地址，批量创建监控任务
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-auto space-y-4 py-4'>
          {/* 选择钱包 */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label>选择钱包 ({selectedCount}/{wallets.length})</Label>
              <Button variant='ghost' size='sm' onClick={handleSelectAll}>
                {selectedWallets.size === wallets.length ? '取消全选' : '全选'}
              </Button>
            </div>
            <div className='border rounded-md max-h-[200px] overflow-auto'>
              {wallets.length === 0 ? (
                <div className='p-4 text-center text-sm text-muted-foreground'>
                  暂无钱包地址
                </div>
              ) : (
                <div className='divide-y'>
                  {wallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className='flex items-center space-x-2 p-2 hover:bg-muted/50 cursor-pointer'
                      onClick={() => handleToggleWallet(wallet.id)}
                    >
                      <Checkbox
                        checked={selectedWallets.has(wallet.id)}
                        onCheckedChange={() => handleToggleWallet(wallet.id)}
                      />
                      <div className='flex-1 min-w-0'>
                        <div className='text-sm font-mono truncate'>{wallet.address}</div>
                        {wallet.note && (
                          <div className='text-xs text-muted-foreground truncate'>{wallet.note}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 配置选项 */}
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>轮询间隔 ({interval}秒)</Label>
              <Slider
                min={10}
                max={300}
                step={10}
                value={[interval]}
                onValueChange={(val) => setInterval(val[0])}
              />
            </div>

            <div className='flex items-center space-x-2'>
              <Checkbox
                id='autoStart'
                checked={autoStart}
                onCheckedChange={(checked) => setAutoStart(!!checked)}
              />
              <Label htmlFor='autoStart' className='cursor-pointer'>
                自动启动任务
              </Label>
            </div>

            <div className='flex items-center space-x-2'>
              <Checkbox
                id='overwrite'
                checked={overwrite}
                onCheckedChange={(checked) => setOverwrite(!!checked)}
              />
              <Label htmlFor='overwrite' className='cursor-pointer'>
                覆盖已存在的任务
              </Label>
            </div>
          </div>

          {/* 结果显示 */}
          {result && (
            <Alert>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                <div className='space-y-2'>
                  <div className='flex items-center gap-4'>
                    <span className='text-green-600'>
                      <CheckCircle2 className='inline h-4 w-4 mr-1' />
                      成功: {result.created}
                    </span>
                    {result.skipped > 0 && (
                      <span className='text-yellow-600'>
                        <XCircle className='inline h-4 w-4 mr-1' />
                        跳过: {result.skipped}
                      </span>
                    )}
                    {result.failed > 0 && (
                      <span className='text-red-600'>
                        <XCircle className='inline h-4 w-4 mr-1' />
                        失败: {result.failed}
                      </span>
                    )}
                  </div>
                  {result.failed > 0 && (
                    <div className='mt-2 text-xs space-y-1 max-h-[100px] overflow-auto'>
                      {result.results
                        .filter((r) => r.status === 'failed')
                        .map((r, idx) => (
                          <div key={idx} className='text-red-600'>
                            {r.wallet_address}: {r.message}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(null)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading || selectedCount === 0}>
            {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            创建任务 ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
