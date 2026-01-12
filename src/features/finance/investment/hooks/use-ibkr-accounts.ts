import { useQuery } from '@tanstack/react-query'

export type IBKRAccount = {
  id: string
  'PrepaidCrypto-Z': boolean
  'PrepaidCrypto-P': boolean
  brokerageAccess: boolean
  accountId: string
  accountVan: string
  accountTitle: string
  displayName: string
  accountAlias: string | null
  accountStatus: number
  currency: string
  type: string
  tradingType: string
  businessType: string
  category: string
  ibEntity: string
  faclient: boolean
  clearingStatus: string
  covestor: boolean
  noClientTrading: boolean
  trackVirtualFXPortfolio: boolean
  acctCustType: string
  parent: {
    mmc: unknown[]
    accountId: string
    isMParent: boolean
    isMChild: boolean
    isMultiplex: boolean
  }
  desc: string
}

export function useIBKRAccounts() {
  const apiUrl = import.meta.env.VITE_IBKR_API_URL
  const apiKey = import.meta.env.VITE_IBKR_API_KEY

  // 开发环境下输出调试信息
  if (import.meta.env.DEV) {
    console.log('[IBKR API 调试]', {
      apiUrl: apiUrl || 'undefined',
      apiKey: apiKey ? '已设置（长度: ' + apiKey.length + '）' : 'undefined',
      allEnvKeys: Object.keys(import.meta.env).filter((key) =>
        key.includes('IBKR')
      ),
    })
  }

  return useQuery({
    queryKey: ['ibkr-accounts', apiUrl, apiKey], // 将环境变量加入 queryKey，确保变化时重新查询
    queryFn: async (): Promise<IBKRAccount[]> => {
      // 检查环境变量
      if (!apiUrl || !apiKey) {
        // 开发环境下显示更详细的错误信息
        const debugInfo = import.meta.env.DEV
          ? `\n调试信息:\n- VITE_IBKR_API_URL: ${apiUrl || 'undefined'}\n- VITE_IBKR_API_KEY: ${apiKey ? '已设置（长度: ' + apiKey.length + '）' : 'undefined'}\n\n提示: 请确保已重启开发服务器 (pnpm run dev)`
          : ''
        throw new Error(
          `IBKR API 配置缺失，请检查环境变量 VITE_IBKR_API_URL 和 VITE_IBKR_API_KEY${debugInfo}`
        )
      }

      // 确保 URL 格式正确
      const requestUrl = `${apiUrl}/api/portfolio/accounts`
      
      if (import.meta.env.DEV) {
        console.log('[IBKR API 请求]', {
          url: requestUrl,
          hasApiKey: !!apiKey,
        })
      }

      const response = await fetch(requestUrl, {
        headers: {
          'X-API-Key': apiKey,
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(
          `获取账户信息失败: ${response.status} ${response.statusText}${errorText ? '\n' + errorText : ''}`
        )
      }

      const data = await response.json()
      return data
    },
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    gcTime: 1000 * 60 * 30, // 30分钟垃圾回收时间
    retry: 2,
  })
}
