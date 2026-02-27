import { Square } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface TrackerMultiStopDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTaskIds: string[]
  onConfirm: (taskIds: string[]) => Promise<void>
  onSuccess: () => void
}

export function TrackerMultiStopDialog({
  open,
  onOpenChange,
  selectedTaskIds,
  onConfirm,
  onSuccess,
}: TrackerMultiStopDialogProps) {
  const handleStop = async () => {
    try {
      await onConfirm(selectedTaskIds)
      onSuccess()
      onOpenChange(false)
      toast.success(`已停止 ${selectedTaskIds.length} 个追踪任务`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量停止失败'
      toast.error(errorMessage)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleStop}
      title={
        <span className='flex items-center gap-2'>
          <Square className='h-4 w-4' />
          停止 {selectedTaskIds.length} 个追踪任务
        </span>
      }
      desc={
        <p>
          确定要停止选中的 {selectedTaskIds.length} 个任务吗？
          停止后任务将不再执行仓位检查。
        </p>
      }
      confirmText='停止'
    />
  )
}
