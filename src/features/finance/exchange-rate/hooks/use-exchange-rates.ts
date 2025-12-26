import { useQuery } from '@tanstack/react-query'

// 使用免费的汇率 API (exchangerate-api.com)
// 免费版本：https://api.exchangerate-api.com/v4/latest/{base_currency}
// 不需要 API key，但有请求频率限制

const EXCHANGE_RATE_API_BASE = 'https://api.exchangerate-api.com/v4/latest'

export type ExchangeRates = {
  base: string
  date: string
  rates: Record<string, number>
}

export function useExchangeRates(baseCurrency: string = 'CNY') {
  return useQuery({
    queryKey: ['exchange-rates', baseCurrency],
    queryFn: async (): Promise<ExchangeRates> => {
      const response = await fetch(`${EXCHANGE_RATE_API_BASE}/${baseCurrency}`)
      
      if (!response.ok) {
        throw new Error(`获取汇率失败: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        base: data.base,
        date: data.date,
        rates: data.rates,
      }
    },
    staleTime: 1000 * 60 * 60, // 1小时缓存
    gcTime: 1000 * 60 * 60 * 24, // 24小时垃圾回收时间
    retry: 2,
  })
}

// 转换金额到目标币种
// rates 是基于 baseCurrency 的汇率表
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
  baseCurrency: string
): number {
  if (fromCurrency === toCurrency) {
    return amount
  }

  // 如果 fromCurrency 是基础货币
  if (fromCurrency === baseCurrency) {
    const toRate = rates[toCurrency]
    if (toRate) {
      return amount * toRate
    }
  }
  // 如果 toCurrency 是基础货币
  else if (toCurrency === baseCurrency) {
    const fromRate = rates[fromCurrency]
    if (fromRate) {
      return amount / fromRate
    }
  }
  // 都不是基础货币，需要两次转换
  else {
    const fromRate = rates[fromCurrency]
    const toRate = rates[toCurrency]
    if (fromRate && toRate) {
      // 先转换到基础货币，再转换到目标货币
      const baseAmount = amount / fromRate
      return baseAmount * toRate
    }
  }

  return amount
}

