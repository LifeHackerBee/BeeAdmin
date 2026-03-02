import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import type { BacktestTrackerTask } from '../../backtest/hooks/use-backtest-tracker'

export type { BacktestTrackerTask }

export interface SignalStats {
  total: number
  settled: number
  wins: number
  losses: number
  running: number
  winRate: number
  totalPnl: number
}

/** 计算单个任务的盈亏（兼容 final_pnl 为 null 的旧数据） */
export function calcPnl(t: BacktestTrackerTask): number | null {
  if (t.final_pnl != null) return t.final_pnl
  if (!t.entry_price || !t.last_tracked_price || !t.entry_direction) return null
  const change = (t.last_tracked_price - t.entry_price) / t.entry_price
  return t.entry_direction === 'long'
    ? change * t.test_amount * t.test_leverage
    : -change * t.test_amount * t.test_leverage
}

export function useSignalTasks() {
  const [allTasks, setAllTasks] = useState<BacktestTrackerTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await hyperliquidApiGet<{ tasks: BacktestTrackerTask[] }>(
        '/api/backtest/tracker/tasks',
      )
      setAllTasks(res.tasks || [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    }
  }, [])

  // 初始加载
  useEffect(() => {
    setLoading(true)
    fetchTasks().finally(() => setLoading(false))
  }, [fetchTasks])

  // 过滤 order_radar 任务
  const tasks = useMemo(
    () => allTasks.filter((t) => t.source === 'order_radar'),
    [allTasks],
  )

  // 统计
  const stats = useMemo<SignalStats>(() => {
    const completed = tasks.filter((t) => t.status === 'completed')
    const pnls = completed.map((t) => calcPnl(t)).filter((v): v is number => v != null)
    const wins = pnls.filter((v) => v > 0)
    const running = tasks.filter((t) => t.status === 'running')
    const totalPnl = pnls.reduce((sum, v) => sum + v, 0)
    return {
      total: tasks.length,
      settled: pnls.length,
      wins: wins.length,
      losses: pnls.length - wins.length,
      running: running.length,
      winRate: pnls.length > 0 ? (wins.length / pnls.length) * 100 : 0,
      totalPnl,
    }
  }, [tasks])

  // 自动轮询：有 running 任务时 10s
  useEffect(() => {
    const hasRunning = tasks.some((t) => t.status === 'running')
    if (hasRunning) {
      pollRef.current = setInterval(() => {
        fetchTasks()
      }, 10_000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [tasks, fetchTasks])

  return { tasks, stats, loading, error, refetch: fetchTasks }
}
