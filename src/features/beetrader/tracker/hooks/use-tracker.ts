import { useState, useCallback, useEffect } from 'react'

const API_BASE_URL = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'

export interface MonitorTask {
  task_id: string
  wallet_address: string
  interval: number
  local_mode: boolean
  output_dir?: string | null
  status: 'pending' | 'running' | 'stopped' | 'error' | 'deleted'
  celery_task_id?: string | null
  created_at: string
  updated_at: string
  started_at?: string | null
  stopped_at?: string | null
  error_message?: string | null
  check_count: number
  success_count: number
  error_count: number
  last_check_time?: string | null
  total_events_count: number
  recent_events_count: number
}

export interface TaskListResponse {
  tasks: MonitorTask[]
  total: number
}

export interface CreateTaskRequest {
  wallet_address: string
  interval?: number
  local_mode?: boolean
  output_dir?: string
  event_config?: Record<string, unknown>
  debug_events?: boolean
  auto_start?: boolean
  overwrite?: boolean
}

export function useTracker() {
  const [tasks, setTasks] = useState<MonitorTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 获取任务列表
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/monitor/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result: TaskListResponse = await response.json()
      console.log('获取到的任务列表:', result)
      console.log('任务数量:', result.tasks?.length || 0, '总数:', result.total)
      
      const tasksList = result.tasks || []
      console.log('设置任务列表，数量:', tasksList.length)
      setTasks(tasksList)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取任务列表失败')
      setError(error)
      console.error('Error fetching tasks:', err)
      // 不抛出错误，只设置 error 状态，让 UI 可以显示错误信息
      return { tasks: [], total: 0 }
    } finally {
      setLoading(false)
    }
  }, [])

  // 创建任务
  const createTask = useCallback(async (request: CreateTaskRequest) => {
    try {
      setLoading(true)
      setError(null)

      // 验证地址格式
      if (!request.wallet_address || !request.wallet_address.startsWith('0x') || request.wallet_address.length !== 42) {
        throw new Error('无效的钱包地址格式')
      }

      const response = await fetch(`${API_BASE_URL}/api/monitor/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: request.wallet_address,
          interval: request.interval || 60,
          local_mode: request.local_mode || false,
          output_dir: request.output_dir,
          event_config: request.event_config,
          debug_events: request.debug_events || false,
          auto_start: request.auto_start !== false, // 默认 true
          overwrite: request.overwrite || false,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result: MonitorTask = await response.json()
      
      // 刷新任务列表
      await fetchTasks()
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('创建任务失败')
      setError(error)
      console.error('Error creating task:', err)
      throw error
    } finally {
      setLoading(false)
    }
  }, [fetchTasks])

  // 启动任务
  const startTask = useCallback(async (taskId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/monitor/tasks/${taskId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result: MonitorTask = await response.json()
      
      // 更新任务列表
      setTasks((prev) =>
        prev.map((task) => (task.task_id === taskId ? result : task))
      )
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('启动任务失败')
      setError(error)
      console.error('Error starting task:', err)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // 停止任务
  const stopTask = useCallback(async (taskId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/monitor/tasks/${taskId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const result: MonitorTask = await response.json()
      
      // 更新任务列表
      setTasks((prev) =>
        prev.map((task) => (task.task_id === taskId ? result : task))
      )
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('停止任务失败')
      setError(error)
      console.error('Error stopping task:', err)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // 删除任务
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/monitor/tasks/${taskId}`, {
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
      setTasks((prev) => prev.filter((task) => task.task_id !== taskId))
    } catch (err) {
      const error = err instanceof Error ? err : new Error('删除任务失败')
      setError(error)
      console.error('Error deleting task:', err)
      throw error
    } finally {
      setLoading(false)
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
    createTask,
    startTask,
    stopTask,
    deleteTask,
  }
}
