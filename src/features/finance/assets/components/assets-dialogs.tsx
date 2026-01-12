import { useAssetsDialogs } from './assets-provider'
import { AssetsMutateDrawer } from './assets-mutate-drawer'
import { AssetsDeleteDialog } from './assets-delete-dialog'

export function AssetsDialogs() {
  const {
    mutateDrawerOpen,
    setMutateDrawerOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    currentRow,
  } = useAssetsDialogs()

  return (
    <>
      <AssetsMutateDrawer
        open={mutateDrawerOpen}
        onOpenChange={setMutateDrawerOpen}
        currentRow={currentRow}
      />
      <AssetsDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        currentRow={currentRow}
      />
    </>
  )
}
