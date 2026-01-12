import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { type Liability } from '../data/schema'
import { useLiabilityMutations } from '../hooks/use-liability-mutations'
import { useLiabilitiesDialogs } from './liabilities-provider'

type LiabilitiesDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Liability
}

export function LiabilitiesDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: LiabilitiesDeleteDialogProps) {
  const { delete: deleteLiability, isDeleting } = useLiabilityMutations()
  const { setCurrentRow } = useLiabilitiesDialogs()

  const handleDelete = async () => {
    if (!currentRow) return

    try {
      await deleteLiability(currentRow.id)
      setCurrentRow(undefined)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete liability:', error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除负债 &quot;{currentRow?.name}&quot; 吗？此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {isDeleting ? '删除中...' : '删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
