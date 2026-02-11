/**
 * 对单个钱包地址拉取 portfolio、clearinghouseState、userFills 实时数据
 */

import { useState, useCallback } from 'react'

const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/info'

export type PortfolioFrame = Record<string, { accountValueHistory?: [number, number][] }>
export type PortfolioResponse = Array<[string, PortfolioFrame[string]]>

/** API 可能返回 { clearinghouseState: Inner } 或直接返回 Inner */
export type ClearinghouseStateInner = {
  marginSummary?: {
    accountValue?: string
    totalMarginUsed?: string
    totalNtlPos?: string
    totalRawUsd?: string
  }
  assetPositions?: Array<{
    position?: {
      coin?: string
      szi?: string
      entryPx?: string
      positionValue?: string
      unrealizedPnl?: string
      leverage?: { type?: string; value?: string }
      liquidationPx?: string
      marginUsed?: string
      returnOnEquity?: string
      cumFunding?: { allTime?: string; sinceOpen?: string; sinceChange?: string }
    }
  }>
  withdrawable?: string
  openOrders?: unknown[]
}

export type ClearinghouseState = { clearinghouseState?: ClearinghouseStateInner } | ClearinghouseStateInner

export type UserFill = {
  coin: string
  px: string
  sz: string
  side: string
  time: number
  dir?: string
  closedPnl?: string
  hash?: string
  oid?: number
  crossed?: boolean
  startPosition?: string
  fee?: string
  feeToken?: string
  tid?: number
}

export type WalletLiveData = {
  portfolio: PortfolioResponse | null
  clearinghouse: ClearinghouseState | null
  fills: UserFill[]
}

async function postInfo<T>(body: object): Promise<T> {
  const res = await fetch(HYPERLIQUID_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json()
}

export function useWalletLive() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<WalletLiveData | null>(null)

  const fetchLive = useCallback(async (walletAddress: string, options?: { backgroundRefresh?: boolean }) => {
    const addr = walletAddress.trim()
    if (!addr || !addr.startsWith('0x') || addr.length !== 42) {
      setError(new Error('请输入有效的 0x 开头的 42 位钱包地址'))
      return
    }
    setAddress(addr)
    const isBackgroundRefresh = options?.backgroundRefresh === true
    if (isBackgroundRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const [portfolio, clearinghouse, fills] = await Promise.all([
        postInfo<PortfolioResponse>({ type: 'portfolio', user: addr }),
        postInfo<ClearinghouseState>({ type: 'clearinghouseState', user: addr }),
        postInfo<UserFill[]>({ type: 'userFills', user: addr, aggregateByTime: true }),
      ])
      setData({
        portfolio: Array.isArray(portfolio) ? portfolio : null,
        clearinghouse: clearinghouse ?? null,
        fills: Array.isArray(fills) ? fills : [],
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('获取实时数据失败'))
      if (!isBackgroundRefresh) setData(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const reset = useCallback(() => {
    setAddress('')
    setData(null)
    setError(null)
  }, [])

  return {
    address,
    loading,
    refreshing,
    error,
    data,
    fetchLive,
    reset,
  }
}
