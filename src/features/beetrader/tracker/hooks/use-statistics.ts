import { useState, useCallback, useEffect } from 'react'

const API_BASE_URL = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'

export interface TaskStatistics {
  total_tasks: number
  running_tasks: number
  stopped_tasks: number
  error_tasks: number
  pending_tasks: number
  deleted_tasks: number
  total_check_count: number
  total_success_count: number
  total_error_count: number
  total_events_count: number
  success_rate: number
  avg_check_count_per_task: number
  avg_events_per_task: number
}

export interface WalletStatistics {
  wallet_address: string
  task_count: number
  running_task_count: number
  total_check_count: number
  total_success_count: number
  total_error_count: number
  total_events_count: number
  success_rate: number
  last_check_time?: string | null
}

export interface DashboardStatistics {
  overview: {
    total_tasks: number
    running_tasks: number
    stopped_tasks: number
    error_tasks: number
  }
  statistics: {
    total_check_count: number
    total_success_count: number
    total_error_count: number
    total_events_count: number
    success_rate: number
  }
  recent_24h: {
    active_tasks: number
    check_count: number
    events_count: number
  }
  status_distribution: {
    running: number
    stopped: number
    error: number
    pending: number
    deleted: number
  }
  timestamp: string
}

export function useStatistics() {
  const [taskStats, setTaskStats] = useState<TaskStatistics | null>(null)
  const [walletStats, setWalletStats] = useState<WalletStatistics[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 获取任务统计
  const fetchTaskStatistics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/statistics/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result: TaskStatistics = await response.json()
      setTaskStats(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取任务统计失败')
      setError(error)
      console.error('Error fetching task statistics:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取钱包统计
  const fetchWalletStatistics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/statistics/wallets`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result: WalletStatistics[] = await response.json()
      setWalletStats(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取钱包统计失败')
      setError(error)
      console.error('Error fetching wallet statistics:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取仪表板统计
  const fetchDashboardStatistics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/statistics/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result: DashboardStatistics = await response.json()
      setDashboardStats(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取仪表板统计失败')
      setError(error)
      console.error('Error fetching dashboard statistics:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // 刷新所有统计
  const refetch = useCallback(async () => {
    await Promise.all([
      fetchTaskStatistics(),
      fetchWalletStatistics(),
      fetchDashboardStatistics(),
    ])
  }, [fetchTaskStatistics, fetchWalletStatistics, fetchDashboardStatistics])

  // 组件挂载时获取统计
  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    taskStats,
    walletStats,
    dashboardStats,
    loading,
    error,
    refetch,
    fetchTaskStatistics,
    fetchWalletStatistics,
    fetchDashboardStatistics,
  }
}
