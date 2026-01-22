import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TasksImportDialog } from './tasks-import-dialog'
import { WalletsMutateDrawer } from './tasks-mutate-drawer'
import { BatchCreateTrackerDialog } from './batch-create-tracker-dialog'
import { useWallets as useWalletsContext } from './tasks-provider'
import { useWallets } from '../hooks/use-wallets'

export function WalletsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow, triggerRefresh } = useWalletsContext()
  const { deleteWallet, refetch } = useWallets()

  const handleDelete = async () => {
    if (!currentRow) return
    
    try {
      await deleteWallet(currentRow.id)
      await refetch()
      // 触发 Context 中的刷新，确保 Monitor 组件也更新
      triggerRefresh()
      toast.success('巨鲸钱包删除成功')
      setOpen(null)
      setTimeout(() => {
        setCurrentRow(null)
      }, 500)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除失败'
      toast.error(errorMessage)
    }
  }

  return (
    <>
      <WalletsMutateDrawer
        key='wallet-create'
        open={open === 'create'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
          } else {
            setOpen('create')
          }
        }}
      />

      <TasksImportDialog
        key='wallets-import'
        open={open === 'import'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
          } else {
            setOpen('import')
          }
        }}
      />

      <BatchCreateTrackerDialog />

      {currentRow && (
        <>
          <WalletsMutateDrawer
            key={`wallet-update-${currentRow.id}`}
            open={open === 'update'}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setOpen(null)
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
              } else {
                setOpen('update')
              }
            }}
            currentRow={currentRow}
          />

          <ConfirmDialog
            key='wallet-delete'
            destructive
            open={open === 'delete'}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
              setOpen(null)
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
              } else {
                setOpen('delete')
              }
            }}
            handleConfirm={handleDelete}
            className='max-w-md'
            title={`删除巨鲸钱包: ${currentRow.address.slice(0, 6)}...${currentRow.address.slice(-4)} ?`}
            desc={
              <>
                您即将删除巨鲸钱包地址 <strong>{currentRow.address}</strong>。
                <br />
                此操作无法撤销。
              </>
            }
            confirmText='删除'
          />
        </>
      )}
    </>
  )
}
