import { useState, useCallback } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

export interface BotLog {
  id: number
  job_id: number
  coin: string
  level: 'info' | 'warn' | 'error' | 'trade' | 'signal'
  stage: string
  message: string
  detail: Record<string, unknown>
  created_at: string
}

interface LogsResponse {
  success: boolean
  logs: BotLog[]
}

export function useBotLogs() {
  const [logs, setLogs] = useState<BotLog[]>([])
  const [tradeLogs, setTradeLogs] = useState<BotLog[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async (forJobId?: number) => {
    try {
      setLoading(true)
      const base = new URLSearchParams({ limit: '100' })
      if (forJobId != null) base.set('job_id', String(forJobId))

      const tradeParams = new URLSearchParams(base)
      tradeParams.set('level', 'trade')

      // 并行拉取: 全部日志 + trade 日志
      const [allRes, tradeRes] = await Promise.all([
        hyperliquidApiGet<LogsResponse>(`/api/strategy_bot/jobs/logs?${base.toString()}`),
        hyperliquidApiGet<LogsResponse>(`/api/strategy_bot/jobs/logs?${tradeParams.toString()}`),
      ])

      const allLogs = allRes.logs ?? []
      const newTradeLogs = tradeRes.logs ?? []

      if (forJobId != null) {
        setLogs((prev) => [...prev.filter((l) => l.job_id !== forJobId), ...allLogs])
        setTradeLogs((prev) => [...prev.filter((l) => l.job_id !== forJobId), ...newTradeLogs])
      } else {
        setLogs(allLogs)
        setTradeLogs(newTradeLogs)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  return { logs, tradeLogs, loading, refetch }
}
