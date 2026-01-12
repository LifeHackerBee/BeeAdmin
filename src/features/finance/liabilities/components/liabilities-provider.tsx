import { createContext, useContext, useState, type ReactNode } from 'react'
import { type Liability } from '../data/schema'

type LiabilitiesDialogsContextType = {
  mutateDrawerOpen: boolean
  setMutateDrawerOpen: (open: boolean) => void
  deleteDialogOpen: boolean
  setDeleteDialogOpen: (open: boolean) => void
  currentRow: Liability | undefined
  setCurrentRow: (row: Liability | undefined) => void
}

const LiabilitiesDialogsContext = createContext<
  LiabilitiesDialogsContextType | undefined
>(undefined)

export function LiabilitiesProvider({ children }: { children: ReactNode }) {
  const [mutateDrawerOpen, setMutateDrawerOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<Liability | undefined>()

  return (
    <LiabilitiesDialogsContext.Provider
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
    </LiabilitiesDialogsContext.Provider>
  )
}

export function useLiabilitiesDialogs() {
  const context = useContext(LiabilitiesDialogsContext)
  if (!context) {
    throw new Error('useLiabilitiesDialogs must be used within LiabilitiesProvider')
  }
  return context
}
