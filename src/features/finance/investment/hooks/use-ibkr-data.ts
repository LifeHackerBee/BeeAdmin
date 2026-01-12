import { useQuery } from '@tanstack/react-query'

const apiUrl = import.meta.env.VITE_IBKR_API_URL
const apiKey = import.meta.env.VITE_IBKR_API_KEY

// 账户摘要类型
export type IBKRSummary = {
  [key: string]: unknown
}

// 持仓类型
export type IBKRPosition = {
  position: number
  conid: string
  avgCost: number
  avgPrice: number
  currency: string
  description: string
  marketPrice: number
  marketValue: number
  realizedPnl: number
  unrealizedPnl: number
  secType: string
  assetClass: string
  sector: string
  group: string
  [key: string]: unknown
}

// 分配信息类型
export type IBKRAllocation = {
  [key: string]: unknown
}

/**
 * 获取账户摘要
 */
export function useIBKRSummary(accountId: string) {
  return useQuery({
    queryKey: ['ibkr-summary', accountId, apiUrl, apiKey],
    queryFn: async (): Promise<IBKRSummary> => {
      if (!apiUrl || !apiKey) {
        throw new Error('IBKR API 配置缺失')
      }

      if (!accountId) {
        throw new Error('账户ID不能为空')
      }

      const requestUrl = `${apiUrl}/api/portfolio/${accountId}/summary`

      const response = await fetch(requestUrl, {
        headers: {
          'X-API-Key': apiKey,
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(
          `获取账户摘要失败: ${response.status} ${response.statusText}${errorText ? '\n' + errorText : ''}`
        )
      }

      return response.json()
    },
    enabled: !!accountId && !!apiUrl && !!apiKey,
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    gcTime: 1000 * 60 * 30, // 30分钟垃圾回收时间
    retry: 2,
  })
}

/**
 * 获取账户持仓
 */
export function useIBKRPositions(accountId: string) {
  return useQuery({
    queryKey: ['ibkr-positions', accountId, apiUrl, apiKey],
    queryFn: async (): Promise<IBKRPosition[]> => {
      if (!apiUrl || !apiKey) {
        throw new Error('IBKR API 配置缺失')
      }

      if (!accountId) {
        throw new Error('账户ID不能为空')
      }

      const requestUrl = `${apiUrl}/api/portfolio2/${accountId}/positions`

      const response = await fetch(requestUrl, {
        headers: {
          'X-API-Key': apiKey,
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(
          `获取持仓失败: ${response.status} ${response.statusText}${errorText ? '\n' + errorText : ''}`
        )
      }

      return response.json()
    },
    enabled: !!accountId && !!apiUrl && !!apiKey,
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    gcTime: 1000 * 60 * 30, // 30分钟垃圾回收时间
    retry: 2,
  })
}

/**
 * 获取账户分配信息
 */
export function useIBKRAllocation(accountId: string) {
  return useQuery({
    queryKey: ['ibkr-allocation', accountId, apiUrl, apiKey],
    queryFn: async (): Promise<IBKRAllocation> => {
      if (!apiUrl || !apiKey) {
        throw new Error('IBKR API 配置缺失')
      }

      if (!accountId) {
        throw new Error('账户ID不能为空')
      }

      const requestUrl = `${apiUrl}/api/portfolio/${accountId}/allocation`

      const response = await fetch(requestUrl, {
        headers: {
          'X-API-Key': apiKey,
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(
          `获取分配信息失败: ${response.status} ${response.statusText}${errorText ? '\n' + errorText : ''}`
        )
      }

      return response.json()
    },
    enabled: !!accountId && !!apiUrl && !!apiKey,
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    gcTime: 1000 * 60 * 30, // 30分钟垃圾回收时间
    retry: 2,
  })
}
