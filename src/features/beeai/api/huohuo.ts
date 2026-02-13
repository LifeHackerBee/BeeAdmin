/**
 * 火火 Agent API 客户端
 * - 直连：通过 Cloudflare Tunnel，鉴权用 CF-Access-Client-Id / CF-Access-Client-Secret
 * - 代理：VITE_HUOHUO_USE_PROXY=true 时请求同源 /api/huohuo-stream，由 Vercel 转发，避免 CORS
 */

const USE_PROXY = import.meta.env.VITE_HUOHUO_USE_PROXY === 'true'
const BASE_URL = USE_PROXY
  ? '' // 同源，用相对路径
  : (import.meta.env.VITE_HUOHUO_API_URL || 'https://huohuo.hackerbee.life')
const STREAM_PATH = USE_PROXY ? '/api/huohuo-stream' : '/ask/stream'
const CF_CLIENT_ID = import.meta.env.VITE_CF_ACCESS_CLIENT_ID || ''
const CF_CLIENT_SECRET = import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET || ''

function authHeaders(): Record<string, string> {
  if (USE_PROXY) return {} // 代理由服务端带 CF 头
  return {
    'CF-Access-Client-Id': CF_CLIENT_ID,
    'CF-Access-Client-Secret': CF_CLIENT_SECRET,
  }
}

export type HealthResponse = { status: string }

export type AskResponse =
  | { stdout: string; stderr: string; returncode: number }
  | { error: string; stdout: null; stderr: null }

/** GET /health（代理模式下不直连，可忽略） */
export async function healthCheck(): Promise<HealthResponse> {
  if (USE_PROXY) return { status: 'ok' }
  const res = await fetch(`${BASE_URL}/health`, {
    method: 'GET',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`health check failed: ${res.status}`)
  return res.json() as Promise<HealthResponse>
}

/** POST /ask 阻塞式调用 */
export async function ask(message: string): Promise<AskResponse> {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ message }),
  })
  const data = (await res.json()) as AskResponse
  if (!res.ok) throw new Error((data as { error?: string }).error || `ask failed: ${res.status}`)
  return data
}

/**
 * POST /ask/stream 流式调用（SSE）
 * onChunk: 每收到一行 data 调用一次（不含 "data: " 前缀，[DONE] 时结束）
 * 返回：完整拼接后的回复内容
 */
export async function askStream(
  message: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const url = USE_PROXY ? STREAM_PATH : `${BASE_URL}/ask/stream`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...authHeaders(),
    },
    body: JSON.stringify({ message }),
    signal,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `stream failed: ${res.status}`)
  }
  const reader = res.body?.getReader()
  if (!reader) throw new Error('no response body')
  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') return fullContent
          if (data) {
            fullContent += data
            onChunk(data)
          }
        }
      }
    }
    if (buffer.startsWith('data: ')) {
      const data = buffer.slice(6).trim()
      if (data !== '[DONE]' && data) {
        fullContent += data
        onChunk(data)
      }
    }
  } finally {
    reader.releaseLock()
  }
  return fullContent
}
