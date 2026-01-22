import { useState, useCallback, useEffect } from 'react'

const API_BASE_URL = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'

export interface BacktestTrackerTask {
  id: number
  task_name: string
  wallet_address: string
  coin: string
  track_interval_seconds: number
  track_duration_seconds: number | null
  test_amount: number
  test_leverage: number
  status: 'running' | 'stopped' | 'completed'
  entry_price: number | null
  entry_time: string | null
  entry_direction: 'long' | 'short' | null
  beat_task_name: string | null
  last_tracked_at: string | null
  last_tracked_price: number | null
  total_tracks: number
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface BacktestTrackerSnapshot {
  id: number
  task_id: number
  snapshot_time: string
  elapsed_seconds: number
  current_price: number
  entry_price: number
  price_change: number
  price_change_pct: number
  unrealized_profit: number
  unrealized_roi: number
  position_value: number
  estimated_fee: number
  created_at: string
}

export interface CreateTrackerTaskRequest {
  task_name: string
  wallet_address: string
  coin: string
  direction: 'long' | 'short'
  track_interval_seconds?: number
  track_duration_seconds?: number | null
  test_amount?: number
  test_leverage?: number
}

export interface UpdateTrackerTaskRequest {
  task_name?: string
  track_interval_seconds?: number
  track_duration_seconds?: number | null
  test_amount?: number
  test_leverage?: number
}

export function useBacktestTracker() {
  const [tasks, setTasks] = useState<BacktestTrackerTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 获取任务列表
  const fetchTasks = useCallback(async (wallet_address?: string, status?: string) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (wallet_address) params.append('wallet_address', wallet_address)
      if (status) params.append('status', status)

      const url = `${API_BASE_URL}/api/backtest/tracker/tasks${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      setTasks(result.tasks || [])
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取任务列表失败')
      setError(error)
      console.error('Error fetching tracker tasks:', err)
      return { success: false, tasks: [], count: 0 }
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取单个任务
  const fetchTask = useCallback(async (taskId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/backtest/tracker/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      return result.task
    } catch (err) {
      console.error('Error fetching tracker task:', err)
      throw err
    }
  }, [])

  // 创建任务
  const createTask = useCallback(async (request: CreateTrackerTaskRequest) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/backtest/tracker/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      // 刷新任务列表
      await fetchTasks()
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('创建任务失败')
      setError(error)
      console.error('Error creating tracker task:', err)
      throw error
    } finally {
      setLoading(false)
    }
  }, [fetchTasks])

  // 更新任务
  const updateTask = useCallback(async (taskId: number, request: UpdateTrackerTaskRequest) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/backtest/tracker/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      // 刷新任务列表
      await fetchTasks()
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('更新任务失败')
      setError(error)
      console.error('Error updating tracker task:', err)
      throw error
    } finally {
      setLoading(false)
    }
  }, [fetchTasks])

  // 启动任务
  const startTask = useCallback(async (taskId: number) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/backtest/tracker/tasks/${taskId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      // 更新任务列表
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status: 'running' } : task))
      )
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('启动任务失败')
      setError(error)
      console.error('Error starting tracker task:', err)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // 停止任务
  const stopTask = useCallback(async (taskId: number) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/backtest/tracker/tasks/${taskId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      // 更新任务列表
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status: 'stopped' } : task))
      )
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('停止任务失败')
      setError(error)
      console.error('Error stopping tracker task:', err)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // 删除任务
  const deleteTask = useCallback(async (taskId: number) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/backtest/tracker/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      // 从列表中移除
      setTasks((prev) => prev.filter((task) => task.id !== taskId))
    } catch (err) {
      const error = err instanceof Error ? err : new Error('删除任务失败')
      setError(error)
      console.error('Error deleting tracker task:', err)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取任务的快照列表
  const fetchSnapshots = useCallback(async (taskId: number, limit?: number) => {
    try {
      const params = new URLSearchParams()
      if (limit) params.append('limit', limit.toString())

      const url = `${API_BASE_URL}/api/backtest/tracker/tasks/${taskId}/snapshots${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      return result.snapshots || []
    } catch (err) {
      console.error('Error fetching snapshots:', err)
      throw err
    }
  }, [])

  // 组件挂载时获取任务列表
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    startTask,
    stopTask,
    deleteTask,
    fetchSnapshots,
  }
}
