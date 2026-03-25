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
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async (forJobId?: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: '100' })
      if (forJobId != null) params.set('job_id', String(forJobId))
      const res = await hyperliquidApiGet<LogsResponse>(
        `/api/strategy_bot/jobs/logs?${params.toString()}`,
      )
      const newLogs = res.logs ?? []
      if (forJobId != null) {
        // 合并: 替换该 job 的日志，保留其他 job 的
        setLogs((prev) => [
          ...prev.filter((l) => l.job_id !== forJobId),
          ...newLogs,
        ])
      } else {
        setLogs(newLogs)
      }
    } catch {
      // silent — logs are non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  return { logs, loading, refetch }
}
