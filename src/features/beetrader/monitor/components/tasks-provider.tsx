import React, { useState, useCallback } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Wallet } from '../data/schema'

type WalletsDialogType = 'create' | 'update' | 'delete' | 'import'

type WalletsContextType = {
  open: WalletsDialogType | null
  setOpen: (str: WalletsDialogType | null) => void
  currentRow: Wallet | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Wallet | null>>
  refreshTrigger: number
  triggerRefresh: () => void
}

const WalletsContext = React.createContext<WalletsContextType | null>(null)

export function WalletsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<WalletsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Wallet | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  return (
    <WalletsContext.Provider value={{ open, setOpen, currentRow, setCurrentRow, refreshTrigger, triggerRefresh }}>
      {children}
    </WalletsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWallets = () => {
  const walletsContext = React.useContext(WalletsContext)

  if (!walletsContext) {
    throw new Error('useWallets has to be used within <WalletsProvider>')
  }

  return walletsContext
}
