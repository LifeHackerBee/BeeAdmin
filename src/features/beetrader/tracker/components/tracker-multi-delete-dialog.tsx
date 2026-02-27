import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface TrackerMultiDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTaskIds: string[]
  onConfirm: (taskIds: string[]) => Promise<void>
  onSuccess: () => void
}

const CONFIRM_WORD = '删除'

export function TrackerMultiDeleteDialog({
  open,
  onOpenChange,
  selectedTaskIds,
  onConfirm,
  onSuccess,
}: TrackerMultiDeleteDialogProps) {
  const [value, setValue] = useState('')

  const handleOpenChange = (open: boolean) => {
    if (!open) setValue('')
    onOpenChange(open)
  }

  const handleDelete = async () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(`请输入"${CONFIRM_WORD}"以确认。`)
      return
    }

    try {
      await onConfirm(selectedTaskIds)
      setValue('')
      onSuccess()
      onOpenChange(false)
      toast.success(`已删除 ${selectedTaskIds.length} 个追踪任务`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量删除失败'
      toast.error(errorMessage)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== CONFIRM_WORD}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          删除 {selectedTaskIds.length} 个追踪任务
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            您确定要删除选中的追踪任务吗？
            <br />
            如果任务正在运行，将先停止再删除。此操作无法撤销。
          </p>

          <Label className='my-4 flex flex-col items-start gap-1.5'>
            <span>请输入"{CONFIRM_WORD}"以确认：</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`请输入"${CONFIRM_WORD}"以确认。`}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>警告！</AlertTitle>
            <AlertDescription>
              请谨慎操作，此操作无法撤销。
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText='删除'
      destructive
    />
  )
}
