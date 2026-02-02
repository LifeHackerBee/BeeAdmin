import React from 'react'
import { useWallets } from '../hooks/use-wallets'

type WalletsDataContextValue = ReturnType<typeof useWallets>

const WalletsDataContext = React.createContext<WalletsDataContextValue | null>(null)

export function WalletsDataProvider({ children }: { children: React.ReactNode }) {
  const walletsData = useWallets()
  return (
    <WalletsDataContext.Provider value={walletsData}>
      {children}
    </WalletsDataContext.Provider>
  )
}

/** 优先使用 Provider 内的共享数据（events 与 wallets 标签同步）；无 Provider 时回退到 useWallets() */
export function useWalletsData(): WalletsDataContextValue {
  const ctx = React.useContext(WalletsDataContext)
  const local = useWallets()
  return ctx ?? local
}
