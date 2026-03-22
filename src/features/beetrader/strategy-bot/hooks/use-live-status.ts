import { useState, useCallback, useEffect, useRef } from 'react'
import { hyperliquidApiGet, hyperliquidApiPost } from '@/lib/hyperliquid-api-client'

export interface LiveHealthData {
  online: boolean
  account_address?: string
  account_value?: number
  positions_count?: number
  positions?: Array<{
    coin: string
    size: number
    entry_price: number
    unrealized_pnl: number
  }>
  error?: string
}

export interface VerifyResult {
  success: boolean
  account_address?: string
  account_value?: number
  positions_count?: number
  error?: string
}

const API_PREFIX = '/api/strategy_bot/jobs'

export function useLiveStatus(enabled: boolean) {
  const [health, setHealth] = useState<LiveHealthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      const res = await hyperliquidApiGet<LiveHealthData>(`${API_PREFIX}/live/health`)
      setHealth(res)
    } catch {
      setHealth({ online: false, error: '无法连接后端' })
    }
  }, [])

  // 启用时立即检查 + 30s 轮询
  useEffect(() => {
    if (!enabled) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }
    setLoading(true)
    checkHealth().finally(() => setLoading(false))
    pollRef.current = setInterval(checkHealth, 30_000)
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [enabled, checkHealth])

  const verify = useCallback(async (accountAddress: string, secretKey: string): Promise<VerifyResult> => {
    try {
      const res = await hyperliquidApiPost<VerifyResult>(`${API_PREFIX}/live/verify`, {
        account_address: accountAddress,
        secret_key: secretKey,
      })
      if (res.success) setVerified(true)
      return res
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }, [])

  return { health, loading, verified, setVerified, verify, checkHealth }
}
