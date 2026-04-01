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
  total: number
}

const PAGE_SIZE = 20

export function useBotLogs() {
  const [logs, setLogs] = useState<BotLog[]>([])
  const [tradeLogs, setTradeLogs] = useState<BotLog[]>([])
  const [loading, setLoading] = useState(false)
  // 全部日志分页
  const [allTotal, setAllTotal] = useState(0)
  const [allPage, setAllPage] = useState(1)
  // 交易记录分页
  const [tradeTotal, setTradeTotal] = useState(0)
  const [tradePage, setTradePage] = useState(1)
  // 当前 job
  const [currentJobId, setCurrentJobId] = useState<number | undefined>()

  const fetchPage = useCallback(async (jobId: number | undefined, tab: 'all' | 'trade', page: number) => {
    try {
      setLoading(true)
      const offset = (page - 1) * PAGE_SIZE
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
      if (jobId != null) params.set('job_id', String(jobId))
      if (tab === 'trade') params.set('level', 'trade')

      const res = await hyperliquidApiGet<LogsResponse>(`/api/strategy_bot/jobs/logs?${params.toString()}`)
      const items = res.logs ?? []
      const total = res.total ?? 0

      if (tab === 'trade') {
        setTradeLogs(items)
        setTradeTotal(total)
        setTradePage(page)
      } else {
        setLogs(items)
        setAllTotal(total)
        setAllPage(page)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  const refetch = useCallback(async (forJobId?: number) => {
    setCurrentJobId(forJobId)
    setAllPage(1)
    setTradePage(1)
    // 并行拉取两个 tab 的第 1 页
    await Promise.all([
      fetchPage(forJobId, 'all', 1),
      fetchPage(forJobId, 'trade', 1),
    ])
  }, [fetchPage])

  const goPage = useCallback((tab: 'all' | 'trade', page: number) => {
    fetchPage(currentJobId, tab, page)
  }, [fetchPage, currentJobId])

  /** 获取某条交易日志之前最近的 ai_signal 日志（用于展示 AI 决策分析） */
  const fetchSignalContext = useCallback(async (beforeAt: string): Promise<BotLog | null> => {
    try {
      const params = new URLSearchParams({
        limit: '1',
        offset: '0',
        level: 'signal',
        stage: 'ai_signal',
        before_at: beforeAt,
      })
      if (currentJobId != null) params.set('job_id', String(currentJobId))
      const res = await hyperliquidApiGet<LogsResponse>(`/api/strategy_bot/jobs/logs?${params.toString()}`)
      return res.logs?.[0] ?? null
    } catch {
      return null
    }
  }, [currentJobId])

  return {
    logs, tradeLogs, loading,
    allTotal, allPage, tradeTotal, tradePage,
    pageSize: PAGE_SIZE,
    refetch, goPage, fetchSignalContext,
  }
}
