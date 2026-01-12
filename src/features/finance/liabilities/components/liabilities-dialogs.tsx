import { useLiabilitiesDialogs } from './liabilities-provider'
import { LiabilitiesMutateDrawer } from './liabilities-mutate-drawer'
import { LiabilitiesDeleteDialog } from './liabilities-delete-dialog'

export function LiabilitiesDialogs() {
  const {
    mutateDrawerOpen,
    setMutateDrawerOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    currentRow,
  } = useLiabilitiesDialogs()

  return (
    <>
      <LiabilitiesMutateDrawer
        open={mutateDrawerOpen}
        onOpenChange={setMutateDrawerOpen}
        currentRow={currentRow}
      />
      <LiabilitiesDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        currentRow={currentRow}
      />
    </>
  )
}
