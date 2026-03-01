import { useState, useCallback, useRef, useEffect } from 'react'
import { hyperliquidApiFetch } from '@/lib/hyperliquid-api-client'
import type { SimSignal } from './use-order-radar-ai'

export interface SimStatus {
  task_id: number
  status: 'running' | 'tp_hit' | 'sl_hit' | 'timeout' | 'cancelled' | 'error'
  coin: string
  direction: string
  entry_price: number
  take_profit: number
  stop_loss: number
  validity_minutes: number
  amount: number
  leverage: number
  current_price: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  elapsed_seconds: number
  result?: {
    exit_price: number
    exit_reason: string
    profit: number
    roi: number
    fee: number
  }
}

export interface SimRecord {
  task_id: number
  coin: string
  direction: string
  entry_price: number
  exit_price: number
  exit_reason: string
  profit: number
  roi: number
  amount: number
  leverage: number
  duration_seconds: number
  timestamp: string
}

export interface SimHistory {
  total: number
  wins: number
  losses: number
  timeouts: number
  win_rate: number
  total_pnl: number
  records: SimRecord[]
}

const POLL_INTERVAL = 5000 // 5 秒轮询

export function useSimulation() {
  const [simStatus, setSimStatus] = useState<SimStatus | null>(null)
  const [history, setHistory] = useState<SimHistory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // 轮询模拟状态
  const pollStatus = useCallback(async (taskId: number) => {
    try {
      const response = await hyperliquidApiFetch(`/api/order_radar/simulate/${taskId}`)
      if (!response.ok) return
      const data = await response.json() as SimStatus
      setSimStatus(data)
      // 模拟结束时停止轮询，刷新历史
      if (data.status !== 'running') {
        stopPolling()
        // 延迟 1 秒刷新历史，确保后端已写入
        setTimeout(() => fetchHistory(), 1000)
      }
    } catch {
      // 静默忽略轮询错误
    }
  }, [stopPolling])

  const startSim = useCallback(async (
    coin: string,
    signal: SimSignal,
    radarData?: Record<string, unknown>,
  ) => {
    setLoading(true)
    setError(null)
    setSimStatus(null)
    stopPolling()

    try {
      // 剥离 chart_data（体积大，对分析无用）
      const cleanRadar = radarData
        ? Object.fromEntries(Object.entries(radarData).filter(([k]) => k !== 'chart_data'))
        : undefined

      const response = await hyperliquidApiFetch('/api/order_radar/simulate', {
        method: 'POST',
        body: JSON.stringify({
          coin,
          direction: signal.action,
          entry_price: signal.entry_price,
          take_profit: signal.take_profit,
          stop_loss: signal.stop_loss,
          validity_minutes: signal.validity_minutes,
          ai_signal: signal,
          radar_data: cleanRadar,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `启动失败: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '启动模拟失败')
      }

      const taskId = result.task_id as number

      // 初始状态
      setSimStatus({
        task_id: taskId,
        status: 'running',
        coin,
        direction: signal.action,
        entry_price: signal.entry_price,
        take_profit: signal.take_profit,
        stop_loss: signal.stop_loss,
        validity_minutes: signal.validity_minutes,
        amount: 10000,
        leverage: 1,
        current_price: signal.entry_price,
        unrealized_pnl: 0,
        unrealized_pnl_pct: 0,
        elapsed_seconds: 0,
      })

      // 开始轮询
      pollRef.current = setInterval(() => pollStatus(taskId), POLL_INTERVAL)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '模拟启动失败'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [pollStatus, stopPolling])

  const fetchHistory = useCallback(async () => {
    try {
      const response = await hyperliquidApiFetch('/api/order_radar/simulate/history')
      if (!response.ok) return
      const data = await response.json() as SimHistory
      setHistory(data)
    } catch {
      // 静默忽略
    }
  }, [])

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  // 初始加载历史
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const resetSim = useCallback(() => {
    stopPolling()
    setSimStatus(null)
    setError(null)
  }, [stopPolling])

  return { startSim, simStatus, history, loading, error, resetSim, fetchHistory }
}
