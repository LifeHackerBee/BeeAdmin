import { useQuery } from '@tanstack/react-query'

const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/info'

export type HyperliquidClearinghouseState = {
  marginSummary?: {
    accountValue?: string
    totalMarginUsed?: string
    totalNtlPos?: string
    totalRawUsd?: string
    crossMarginSummary?: {
      marginUsed?: string
    }
  }
  assetPositions?: Array<{
    position?: {
      coin?: string
      szi?: string
      entryPx?: string
      leverage?: {
        type?: string
        value?: string
      }
      liquidationPx?: string
      marginUsed?: string
      returnOnEquity?: string
    }
  }>
  withdrawable?: string
  openOrders?: Array<{
    coin?: string
    side?: string
    limitPx?: string
    sz?: string
    oid?: number
  }>
}

export type HyperliquidInfo = {
  clearinghouseState?: HyperliquidClearinghouseState
}

export function useHyperliquidInfo(address: string | null) {
  return useQuery({
    queryKey: ['hyperliquid-info', address],
    queryFn: async (): Promise<HyperliquidInfo> => {
      if (!address) {
        throw new Error('钱包地址不能为空')
      }

      const response = await fetch(HYPERLIQUID_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: address,
        }),
      })

      if (!response.ok) {
        throw new Error(`获取 Hyperliquid 信息失败: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    },
    enabled: !!address, // 只有当地址存在时才发起请求
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    gcTime: 1000 * 60 * 10, // 10分钟垃圾回收时间
    retry: 2,
    retryDelay: 1000,
  })
}

