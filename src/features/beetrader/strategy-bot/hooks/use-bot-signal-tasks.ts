import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import type { BacktestTrackerTask } from '../../backtest/hooks/use-backtest-tracker'

export type { BacktestTrackerTask }

export interface BotSignalStats {
  total: number
  settled: number
  wins: number
  losses: number
  running: number
  winRate: number
  totalPnl: number
}

const DEFAULT_TAKER_FEE_RATE = 0.000410 // 0.0410%

export function calcPnl(t: BacktestTrackerTask, feeRate: number = DEFAULT_TAKER_FEE_RATE): number | null {
  if (t.final_pnl != null) return t.final_pnl
  if (!t.entry_price || !t.last_tracked_price || !t.entry_direction) return null
  const change = (t.last_tracked_price - t.entry_price) / t.entry_price
  const positionValue = t.test_amount * t.test_leverage
  const grossPnl = t.entry_direction === 'long'
    ? change * positionValue
    : -change * positionValue
  const fee = positionValue * feeRate * 2 // 开 + 平
  return grossPnl - fee
}

export function useBotSignalTasks() {
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

  useEffect(() => {
    setLoading(true)
    fetchTasks().finally(() => setLoading(false))
  }, [fetchTasks])

  // 过滤 strategy_bot 任务
  const tasks = useMemo(
    () => allTasks.filter((t) => t.source === 'strategy_bot'),
    [allTasks],
  )

  const stats = useMemo<BotSignalStats>(() => {
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
