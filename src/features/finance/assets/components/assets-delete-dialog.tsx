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
import { type Asset } from '../data/schema'
import { useAssetMutations } from '../hooks/use-asset-mutations'
import { useAssetsDialogs } from './assets-provider'

type AssetsDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Asset
}

export function AssetsDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: AssetsDeleteDialogProps) {
  const { delete: deleteAsset, isDeleting } = useAssetMutations()
  const { setCurrentRow } = useAssetsDialogs()

  const handleDelete = async () => {
    if (!currentRow) return

    try {
      await deleteAsset(currentRow.id)
      setCurrentRow(undefined)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete asset:', error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除资产 &quot;{currentRow?.name}&quot; 吗？此操作无法撤销。
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
