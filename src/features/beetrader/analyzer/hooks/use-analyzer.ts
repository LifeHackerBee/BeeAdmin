import { useState, useCallback } from 'react'

const API_BASE_URL = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'

export interface AnalysisData {
  type: string | null
  signal_strength: string | null
  risk_level: string | null
  account_value: number | null
  reason: string | null
  key_metrics: {
    account_value: number | null
    max_drawdown: number | null
    total_pnl: number | null
    maker_ratio: number | null
    leverage: number | null
  }
  data_quality: {
    has_portfolio: boolean
    has_user_state: boolean
    has_user_fees: boolean
    has_ledger: boolean
    has_funding: boolean
    errors: string[]
  }
}

export interface AnalyzeResponse {
  success: boolean
  address: string
  analysis: AnalysisData
}

export function useAnalyzer() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<AnalyzeResponse | null>(null)

  const analyze = useCallback(async (address: string, days: number = 30) => {
    try {
      setLoading(true)
      setError(null)
      setData(null)

      // 验证地址格式
      if (!address || !address.startsWith('0x') || address.length !== 42) {
        throw new Error('无效的钱包地址格式')
      }

      // 使用 POST 方法调用 API
      const response = await fetch(`${API_BASE_URL}/api/analyzer/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          days,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result: AnalyzeResponse = await response.json()

      if (!result.success) {
        throw new Error('分析失败，请检查地址是否正确')
      }

      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('分析请求失败')
      setError(error)
      console.error('Error analyzing address:', err)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return {
    analyze,
    loading,
    error,
    data,
    reset,
  }
}
