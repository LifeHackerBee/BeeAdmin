import { useState, useCallback, useRef } from 'react'
import { hyperliquidApiFetch } from '@/lib/hyperliquid-api-client'
import type { OrderRadarData } from './use-order-radar'

export function useOrderRadarAI() {
  const [streaming, setStreaming] = useState(false)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const analyze = useCallback(async (coin: string, data: OrderRadarData) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStreaming(true)
    setContent('')
    setError(null)

    try {
      const response = await hyperliquidApiFetch('/api/order_radar/ai-analysis', {
        method: 'POST',
        body: JSON.stringify({ coin, data }),
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `请求失败: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无响应体')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const chunk = line.slice(6)
            if (chunk === '[DONE]') {
              setStreaming(false)
              return
            }
            if (chunk.startsWith('[ERROR]')) {
              throw new Error(chunk.slice(8))
            }
            if (chunk) {
              setContent((prev) => prev + chunk)
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : '请求失败'
      setError(msg)
    } finally {
      setStreaming(false)
    }
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setContent('')
    setError(null)
    setStreaming(false)
  }, [])

  return { analyze, streaming, content, error, abort, reset }
}
