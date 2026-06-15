import { useEffect, useState, useRef, useCallback } from 'react'
import {
  hyperliquidApiGet,
  hyperliquidApiPost,
  hyperliquidApiPatch,
  hyperliquidApiDelete,
} from '@/lib/hyperliquid-api-client'
import { type Wallet } from '../data/schema'

const VISIBILITY_REFETCH_DEBOUNCE_MS = 15_000

interface WalletRow {
  id: string
  address: string
  note: string | null
  type: string | null
  volume: number | string | null
  created_at: string
  updated_at: string | null
}

function formatWallet(w: WalletRow): Wallet {
  return {
    id: w.id,
    address: w.address,
    note: w.note || '',
    type: (w.type as Wallet['type']) || null,
    volume: w.volume != null ? Number(w.volume) : null,
    createdAt: new Date(w.created_at),
    updatedAt: w.updated_at ? new Date(w.updated_at) : undefined,
  }
}

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const lastVisibilityRefetchAt = useRef<number>(0)

  const fetchWallets = useCallback(async (options?: { backgroundRefresh?: boolean }) => {
    const isBackgroundRefresh = options?.backgroundRefresh === true
    try {
      if (isBackgroundRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const res = await hyperliquidApiGet<{ success: boolean; wallets: WalletRow[] }>(
        '/api/beetrader/wallets'
      )
      setWallets((res.wallets || []).map(formatWallet))
    } catch (err) {
      setError(err instanceof Error ? err : new Error('获取钱包列表失败'))
      console.error('Error fetching wallets:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchWallets()
  }, [fetchWallets])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastVisibilityRefetchAt.current < VISIBILITY_REFETCH_DEBOUNCE_MS) return
      lastVisibilityRefetchAt.current = now
      void fetchWallets({ backgroundRefresh: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchWallets])

  const createWallet = async (wallet: {
    address: string
    note?: string
    type?: Wallet['type']
    volume?: number | null
  }) => {
    try {
      const res = await hyperliquidApiPost<{ success: boolean; wallet: WalletRow }>(
        '/api/beetrader/wallets',
        {
          address: wallet.address,
          note: wallet.note || null,
          type: wallet.type || null,
          volume: wallet.volume ?? null,
        }
      )
      await fetchWallets({ backgroundRefresh: true })
      return res.wallet
    } catch (err) {
      const error = err instanceof Error ? err : new Error('创建钱包失败')
      console.error('Error creating wallet:', err)
      throw error
    }
  }

  const updateWallet = async (
    id: string,
    updates: Partial<Pick<Wallet, 'note' | 'type' | 'volume'>>
  ) => {
    try {
      await hyperliquidApiPatch(`/api/beetrader/wallets/${id}`, {
        note: updates.note || null,
        type: updates.type || null,
        volume: updates.volume ?? null,
      })
      await fetchWallets({ backgroundRefresh: true })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('更新钱包失败')
      console.error('Error updating wallet:', err)
      throw error
    }
  }

  const deleteWallet = async (id: string) => {
    try {
      await hyperliquidApiDelete(`/api/beetrader/wallets/${id}`)
      await fetchWallets({ backgroundRefresh: true })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('删除钱包失败')
      console.error('Error deleting wallet:', err)
      throw error
    }
  }

  const deleteWallets = async (ids: string[]) => {
    try {
      await hyperliquidApiPost('/api/beetrader/wallets/batch-delete', { ids })
      await fetchWallets({ backgroundRefresh: true })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('批量删除钱包失败')
      console.error('Error deleting wallets:', err)
      throw error
    }
  }

  return {
    wallets,
    loading,
    refreshing,
    error,
    refetch: fetchWallets,
    createWallet,
    updateWallet,
    deleteWallet,
    deleteWallets,
  }
}
