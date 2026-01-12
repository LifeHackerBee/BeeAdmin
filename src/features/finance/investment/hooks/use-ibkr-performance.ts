import { useQuery } from '@tanstack/react-query'

export type IBKRPeriodData = {
  freq: string
  startNAV: {
    date: string
    val: number
  }
  dates: string[]
  nav: number[]
  cps: number[]
}

export type IBKRAllPeriodsResponse = {
  pm?: string
  nd?: number
  id?: string
  currencyType?: string
  view?: string[]
  included?: string[]
  baseCurrency?: string
  start?: string
  end?: string
  periods?: string[]
  lastSuccessfulUpdate?: string
  // 账户ID作为动态键，值是时间段数据对象
  [key: string]: unknown
}

export function useIBKRAllPeriods(accountId: string) {
  const apiUrl = import.meta.env.VITE_IBKR_API_URL
  const apiKey = import.meta.env.VITE_IBKR_API_KEY

  return useQuery({
    queryKey: ['ibkr-all-periods', accountId, apiUrl, apiKey],
    queryFn: async (): Promise<IBKRAllPeriodsResponse> => {
      if (!apiUrl || !apiKey) {
        throw new Error('IBKR API 配置缺失')
      }

      if (!accountId) {
        throw new Error('账户ID不能为空')
      }

      const requestUrl = `${apiUrl}/api/pa/allperiods`

      if (import.meta.env.DEV) {
        console.log('[IBKR API 请求 - All Periods]', {
          url: requestUrl,
          accountId,
        })
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountIds: [accountId],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(
          `获取时间段失败: ${response.status} ${response.statusText}${errorText ? '\n' + errorText : ''}`
        )
      }

      const data = await response.json()
      
      if (import.meta.env.DEV) {
        console.log('[IBKR API 响应 - All Periods]', data)
      }

      return data
    },
    enabled: !!accountId && !!apiUrl && !!apiKey,
    staleTime: 1000 * 60 * 10, // 10分钟缓存
    gcTime: 1000 * 60 * 60, // 1小时垃圾回收时间
    retry: 2,
  })
}

export type IBKRPerformanceResponse = {
  [key: string]: unknown
}

export function useIBKRPerformance(accountId: string, period: string) {
  const apiUrl = import.meta.env.VITE_IBKR_API_URL
  const apiKey = import.meta.env.VITE_IBKR_API_KEY

  return useQuery({
    queryKey: ['ibkr-performance', accountId, period, apiUrl, apiKey],
    queryFn: async (): Promise<IBKRPerformanceResponse> => {
      if (!apiUrl || !apiKey) {
        throw new Error('IBKR API 配置缺失')
      }

      if (!accountId || !period) {
        throw new Error('账户ID和时间段不能为空')
      }

      const requestUrl = `${apiUrl}/api/pa/performance`

      if (import.meta.env.DEV) {
        console.log('[IBKR API 请求 - Performance]', {
          url: requestUrl,
          accountId,
          period,
        })
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountIds: [accountId],
          period: period,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(
          `获取性能数据失败: ${response.status} ${response.statusText}${errorText ? '\n' + errorText : ''}`
        )
      }

      const data = await response.json()
      
      if (import.meta.env.DEV) {
        console.log('[IBKR API 响应 - Performance]', data)
      }

      return data
    },
    enabled: !!accountId && !!period && !!apiUrl && !!apiKey,
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    gcTime: 1000 * 60 * 30, // 30分钟垃圾回收时间
    retry: 2,
  })
}
