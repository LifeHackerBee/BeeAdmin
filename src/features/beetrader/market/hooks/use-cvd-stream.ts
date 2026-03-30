/**
 * useCvdStream
 * ─────────────────────────────────────────────────────────────────
 * 连接后端 /ws/cvd/{coin}，实时接收 CVD + VpS + L2 Imbalance 数据。
 *
 * 后端每 300ms 推一次 JSON 快照，格式：
 * {
 *   coin, ts, cvd, buy_vol, sell_vol, trade_cnt,
 *   vps, vps_ratio, imbalance,
 *   best_bid, best_ask, spread,
 *   history: [{ ts, cvd, vps }, ...]   // 最近 300 点
 * }
 */
import { useState, useEffect, useRef, useCallback } from 'react'

export interface CvdPoint {
  ts:  number
  cvd: number
  vps: number
}

export interface CvdSnapshot {
  coin:       string
  ts:         number
  cvd:        number
  buy_vol:    number
  sell_vol:   number
  trade_cnt:  number
  vps:        number       // 最近 5s 均量/s
  vps_ratio:  number       // 相对 30s 均量的放量比
  imbalance:  number       // 买盘深度 / 总深度 (0-1)
  best_bid:   number | null
  best_ask:   number | null
  spread:     number | null
  history:    CvdPoint[]
}

type Status = 'disconnected' | 'connecting' | 'connected' | 'error'

interface UseCvdStreamReturn {
  snapshot:   CvdSnapshot | null
  status:     Status
  error:      string | null
  connect:    (coin: string) => void
  disconnect: () => void
}

function getWsBaseUrl(): string {
  const httpUrl = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL as string | undefined
  if (!httpUrl) return 'ws://localhost:8000'
  return httpUrl.replace(/^http/, 'ws')
}

function getApiKey(): string | undefined {
  return import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY as string | undefined
}

const WS_BASE = getWsBaseUrl()
const API_KEY = getApiKey()

export function useCvdStream(): UseCvdStreamReturn {
  const [snapshot, setSnapshot]     = useState<CvdSnapshot | null>(null)
  const [status,   setStatus]       = useState<Status>('disconnected')
  const [error,    setError]        = useState<string | null>(null)

  const wsRef       = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const coinRef     = useRef<string | null>(null)

  const disconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current)
    if (wsRef.current) {
      wsRef.current.onclose = null   // 防止触发重连
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus('disconnected')
    setSnapshot(null)
    coinRef.current = null
  }, [])

  const connect = useCallback((coin: string) => {
    // 如果已经连接同一 coin，不重复连
    if (wsRef.current && coinRef.current === coin && wsRef.current.readyState === WebSocket.OPEN) return

    // 断开旧连接
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectRef.current) clearTimeout(reconnectRef.current)

    coinRef.current = coin
    setStatus('connecting')
    setError(null)
    setSnapshot(null)

    const url = API_KEY
      ? `${WS_BASE}/ws/cvd/${coin}?api_key=${API_KEY}`
      : `${WS_BASE}/ws/cvd/${coin}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      setError(null)
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data as string) as CvdSnapshot
        setSnapshot(data)
      } catch {
        // ignore malformed message
      }
    }

    ws.onerror = () => {
      setError('WebSocket 连接错误')
      setStatus('error')
    }

    ws.onclose = (evt) => {
      wsRef.current = null
      if (evt.code === 4001) {
        setError('API Key 无效，WebSocket 鉴权失败')
        setStatus('error')
        return
      }
      // 自动重连（3s 后）
      if (coinRef.current) {
        setStatus('connecting')
        reconnectRef.current = setTimeout(() => {
          if (coinRef.current) connect(coinRef.current)
        }, 3000)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [])

  return { snapshot, status, error, connect, disconnect }
}
