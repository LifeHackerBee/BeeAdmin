import { useState, useCallback, useEffect } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

export interface PositionEvent {
  id: number
  wallet_address: string
  coin: string
  event_type: string
  prev_szi?: number | null
  prev_side?: string | null  // LONG, SHORT, NONE
  prev_leverage?: number | null
  prev_position_value?: number | null
  prev_entry_px?: number | null
  prev_margin_used?: number | null
  prev_liquidation_px?: number | null
  now_szi: number
  now_side?: string | null  // LONG, SHORT, NONE
  now_leverage?: number | null
  now_position_value?: number | null
  now_entry_px?: number | null
  now_margin_used?: number | null
  now_liquidation_px?: number | null
  szi_change?: number | null
  position_value_change?: number | null
  mark_price?: number | null  // 事件发生时的市场价格
  event_time_ms?: number | null
  event_time?: string | null
  created_at: string
  metadata?: Record<string, unknown> | null
}

export interface EventListResponse {
  success: boolean
  count: number
  total?: number | null
  events: PositionEvent[]
}

export type UseEventsOptions = {
  page?: number
  pageSize?: number
}

export function useEvents(options: UseEventsOptions = {}) {
  const { page = 1, pageSize = 20 } = options
  const [events, setEvents] = useState<PositionEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | undefined>()
  const [eventType, setEventType] = useState<string | undefined>()
  const [coin, setCoin] = useState<string | undefined>()

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (walletAddress) {
        params.append('wallet_address', walletAddress)
      }
      if (eventType) {
        params.append('event_type', eventType)
      }
      if (coin) {
        params.append('coin', coin)
      }
      const offset = (page - 1) * pageSize
      params.append('limit', String(pageSize))
      params.append('offset', String(offset))

      // 注意：URL 末尾必须有斜杠，避免 FastAPI 的 307 重定向
      const result: EventListResponse = await hyperliquidApiGet<EventListResponse>(`/api/events/?${params.toString()}`)
      setEvents(result.events || [])
      setTotal(result.total ?? null)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取事件列表失败')
      setError(error)
      console.error('Error fetching events:', err)
      return { success: false, count: 0, total: null, events: [] }
    } finally {
      setLoading(false)
    }
  }, [walletAddress, eventType, coin, page, pageSize])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return {
    events,
    loading,
    error,
    total,
    walletAddress,
    setWalletAddress,
    eventType,
    setEventType,
    coin,
    setCoin,
    refetch: fetchEvents,
    page,
    pageSize,
  }
}
