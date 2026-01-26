/**
 * Hyperliquid Trader API 客户端
 * 统一处理 API 请求，自动添加 API Key 认证（仅在登录后）
 */
import { useAuthStore } from '@/stores/auth-store'

// 动态读取环境变量，确保在运行时也能正确获取
function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL
  if (!url) {
    console.warn('VITE_HYPERLIQUID_TRADER_API_URL 未设置，使用默认值 http://localhost:8000')
    return 'http://localhost:8000'
  }
  return url
}

function getApiKey(): string | undefined {
  return import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY
}

const API_BASE_URL = getApiBaseUrl()
const API_KEY = getApiKey()

// 开发环境下输出配置信息
if (import.meta.env.DEV) {
  console.log('[Hyperliquid API Client] 配置:', {
    API_BASE_URL,
    API_KEY: API_KEY ? `${API_KEY.substring(0, 10)}...` : '未设置',
  })
}

interface FetchOptions extends RequestInit {
  requireAuth?: boolean // 是否要求认证（默认 true）
}

/**
 * 获取请求头，自动添加 API Key（仅在登录后）
 */
function getHeaders(requireAuth: boolean = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  // 只在登录后且需要认证时添加 API Key
  if (requireAuth && API_KEY) {
    const { user, session } = useAuthStore.getState()
    // 检查用户是否已登录（检查 user 或 session）
    if (user || session?.user) {
      headers['X-API-Key'] = API_KEY
      if (import.meta.env.DEV) {
        console.log('[Hyperliquid API Client] 已添加 API Key 到请求头')
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn('[Hyperliquid API Client] 用户未登录，未添加 API Key', {
          hasUser: !!user,
          hasSession: !!session,
          hasSessionUser: !!session?.user,
        })
      }
    }
  }

  return headers
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
    ...getHeaders(requireAuth),
    ...(fetchOptions.headers || {}),
  }

  // 调试：检查是否包含 API Key
  if (import.meta.env.DEV) {
    const hasApiKey = 'X-API-Key' in headers
    console.log(`[Hyperliquid API Client] 请求 ${url}`, {
      hasApiKey,
      method: fetchOptions.method || 'GET',
    })
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  return response
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

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
  }

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

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
  }

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

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
  }

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

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
  }

  // DELETE 请求可能没有响应体
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  return response.json()
}
