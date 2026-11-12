/**
 * Hyperliquid Trader API 客户端
 *
 * 认证模型（2026-11-12 本地账号 + JWT，前端零上游密钥）：
 *   - 登录后 JWT 存 localStorage；请求带 Authorization: Bearer <JWT>
 *   - 服务器内部/CLI 仍可用 X-API-Key（只存在后端 .env）
 */
import { getToken } from '@/components/auth-bridge'

// 动态读取环境变量，确保在运行时也能正确获取
function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL
  if (!url) {
    console.warn('VITE_HYPERLIQUID_TRADER_API_URL 未设置，使用默认值 http://localhost:8000')
    return 'http://localhost:8000'
  }
  return url
}

const API_BASE_URL = getApiBaseUrl()

/**
 * 获取 access token（带 Authorization: Bearer 头用）
 */
async function getAccessToken(): Promise<string | null> {
  try {
    return getToken()
  } catch {
    return null
  }
}

interface FetchOptions extends RequestInit {
  requireAuth?: boolean // 是否要求认证（默认 true）
}

/**
 * 获取请求头，登录后自动附加 Bearer token
 */
async function getHeaders(requireAuth: boolean = true): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (requireAuth) {
    const token = await getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    } else if (import.meta.env.DEV) {
      console.warn('[Hyperliquid API Client] 未获取到 access token，请求将无认证头')
    }
  }

  return headers
}

/**
 * 统一错误处理：优先取后端 FastAPI 的 detail 字段，给出干净的错误信息
 */
async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return
  const errorText = await response.text()
  let message = errorText
  try {
    const parsed = JSON.parse(errorText)
    if (parsed?.detail) {
      message = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail)
    }
  } catch {
    // 非 JSON，保留原文
  }
  throw new Error(message || `API 请求失败: ${response.status}`)
}

/**
 * 统一的 API 请求函数
 */
export async function hyperliquidApiFetch(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { requireAuth = true, ...fetchOptions } = options

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  const headers = {
    ...(await getHeaders(requireAuth)),
    ...(fetchOptions.headers || {}),
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  return response
}

/** 导出 base URL（WebSocket 等场景用） */
export function getHyperliquidApiBaseUrl(): string {
  return API_BASE_URL
}

/** 获取当前用户的 access token（WebSocket ticket 等场景用） */
export async function getHyperliquidAccessToken(): Promise<string | null> {
  return getAccessToken()
}

/**
 * GET 请求
 */
export async function hyperliquidApiGet<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await hyperliquidApiFetch(endpoint, {
    ...options,
    method: 'GET',
  })

  await throwIfNotOk(response)

  return response.json()
}

/**
 * POST 请求
 */
export async function hyperliquidApiPost<T = unknown>(
  endpoint: string,
  body?: unknown,
  options: FetchOptions = {}
): Promise<T> {
  const response = await hyperliquidApiFetch(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })

  await throwIfNotOk(response)

  return response.json()
}

/**
 * PUT 请求
 */
export async function hyperliquidApiPut<T = unknown>(
  endpoint: string,
  body?: unknown,
  options: FetchOptions = {}
): Promise<T> {
  const response = await hyperliquidApiFetch(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })

  await throwIfNotOk(response)

  return response.json()
}

/**
 * PATCH 请求
 */
export async function hyperliquidApiPatch<T = unknown>(
  endpoint: string,
  body?: unknown,
  options: FetchOptions = {}
): Promise<T> {
  const response = await hyperliquidApiFetch(endpoint, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  })

  await throwIfNotOk(response)

  return response.json()
}

/**
 * DELETE 请求
 */
export async function hyperliquidApiDelete<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await hyperliquidApiFetch(endpoint, {
    ...options,
    method: 'DELETE',
  })

  await throwIfNotOk(response)

  // DELETE 请求可能没有响应体
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  return response.json()
}
