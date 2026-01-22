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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreateTrackerTaskRequest } from '../hooks/use-backtest-tracker'

interface TrackerTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (request: CreateTrackerTaskRequest) => Promise<unknown>
  onSuccess?: () => void
}

export function TrackerTaskDialog({
  open,
  onOpenChange,
  onCreate,
  onSuccess,
}: TrackerTaskDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateTrackerTaskRequest>({
    task_name: '',
    wallet_address: '',
    coin: 'BTC',
    direction: 'long',
    track_interval_seconds: 60,
    track_duration_seconds: null,
    test_amount: 1000,
    test_leverage: 1,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      await onCreate(formData)
      
      // 重置表单
      setFormData({
        task_name: '',
        wallet_address: '',
        coin: 'BTC',
        direction: 'long',
        track_interval_seconds: 60,
        track_duration_seconds: null,
        test_amount: 1000,
        test_leverage: 1,
      })
      
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('创建追踪任务失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const intervalOptions = [
    { value: 60, label: '1分钟' },
    { value: 300, label: '5分钟' },
    { value: 600, label: '10分钟' },
    { value: 1800, label: '30分钟' },
    { value: 3600, label: '1小时' },
  ]

  const durationOptions = [
    { value: null, label: '持续追踪' },
    { value: 3600, label: '1小时' },
    { value: 7200, label: '2小时' },
    { value: 14400, label: '4小时' },
    { value: 28800, label: '8小时' },
    { value: 86400, label: '24小时' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>创建追踪任务</DialogTitle>
            <DialogDescription>
              创建新的跟单测试追踪任务，系统将按照设置的间隔定时记录收益情况
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='task_name'>任务名称</Label>
              <Input
                id='task_name'
                value={formData.task_name}
                onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                placeholder='例如: BTC多单追踪'
                required
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='wallet_address'>钱包地址</Label>
              <Input
                id='wallet_address'
                value={formData.wallet_address}
                onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                placeholder='0x...'
                required
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='coin'>币种</Label>
                <Input
                  id='coin'
                  value={formData.coin}
                  onChange={(e) => setFormData({ ...formData, coin: e.target.value })}
                  placeholder='BTC'
                  required
                />
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='direction'>方向</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(value: 'long' | 'short') => 
                    setFormData({ ...formData, direction: value })
                  }
                >
                  <SelectTrigger id='direction'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='long'>做多 (Long)</SelectItem>
                    <SelectItem value='short'>做空 (Short)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='test_amount'>测试金额 (USDC)</Label>
                <Input
                  id='test_amount'
                  type='number'
                  value={formData.test_amount}
                  onChange={(e) => setFormData({ ...formData, test_amount: parseFloat(e.target.value) })}
                  min='1'
                  step='1'
                  required
                />
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='test_leverage'>杠杆倍数</Label>
                <Input
                  id='test_leverage'
                  type='number'
                  value={formData.test_leverage}
                  onChange={(e) => setFormData({ ...formData, test_leverage: parseFloat(e.target.value) })}
                  min='1'
                  max='50'
                  step='0.1'
                  required
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='track_interval'>追踪间隔</Label>
              <Select
                value={formData.track_interval_seconds?.toString() || '60'}
                onValueChange={(value) => 
                  setFormData({ ...formData, track_interval_seconds: parseInt(value) })
                }
              >
                <SelectTrigger id='track_interval'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intervalOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='track_duration'>追踪时长</Label>
              <Select
                value={formData.track_duration_seconds?.toString() || 'null'}
                onValueChange={(value) => 
                  setFormData({ 
                    ...formData, 
                    track_duration_seconds: value === 'null' ? null : parseInt(value) 
                  })
                }
              >
                <SelectTrigger id='track_duration'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem 
                      key={option.value?.toString() || 'null'} 
                      value={option.value?.toString() || 'null'}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? '创建中...' : '创建任务'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
