import { createContext, useContext, useState, type ReactNode } from 'react'
import { type Asset } from '../data/schema'

type AssetsDialogsContextType = {
  mutateDrawerOpen: boolean
  setMutateDrawerOpen: (open: boolean) => void
  deleteDialogOpen: boolean
  setDeleteDialogOpen: (open: boolean) => void
  currentRow: Asset | undefined
  setCurrentRow: (row: Asset | undefined) => void
}

const AssetsDialogsContext = createContext<AssetsDialogsContextType | undefined>(undefined)

export function AssetsProvider({ children }: { children: ReactNode }) {
  const [mutateDrawerOpen, setMutateDrawerOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<Asset | undefined>()

  return (
    <AssetsDialogsContext.Provider
      value={{
        mutateDrawerOpen,
        setMutateDrawerOpen,
        deleteDialogOpen,
        setDeleteDialogOpen,
        currentRow,
        setCurrentRow,
      }}
    >
      {children}
    </AssetsDialogsContext.Provider>
  )
}

export function useAssetsDialogs() {
  const context = useContext(AssetsDialogsContext)
  if (!context) {
    throw new Error('useAssetsDialogs must be used within AssetsProvider')
  }
  return context
}
