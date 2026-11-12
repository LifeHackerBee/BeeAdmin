import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getHyperliquidApiBaseUrl } from '@/lib/hyperliquid-api-client'

/**
 * 本地认证桥（2026-11-12 从 Auth0 SPA 迁移到自建账号 + JWT）
 *
 * - 登录：登录页 POST /api/auth/login → 后端返回 JWT → 存 localStorage
 * - 会话恢复：应用挂载时带 JWT 调 /api/auth/me → 填充 auth-store
 * - 全应用（路由守卫、RBAC、hyperliquid-api-client 等）继续读 auth-store，无需改动
 *
 * 用户存后端 PG 的 local_users 表（主键沿用原 Supabase profiles 的 UUID），
 * 因此按 user_id 关联的数据（如 kol_mvp_log）不断链。
 */

const TOKEN_KEY = 'beeadmin_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // localStorage 不可用（隐私模式等）：仅内存态，刷新后需重新登录
  }
}

/**
 * token 获取器：由 AuthBridgeSync 挂载时注册，
 * 供 React 组件树之外的代码（如 hyperliquid-api-client）调用。
 */
type TokenGetter = () => Promise<string | null>
let tokenGetter: TokenGetter = async () => getToken()

export const AuthBridge = {
  setTokenGetter(getter: TokenGetter) {
    tokenGetter = getter
  },
  /** 供非组件代码获取 access token（用于调后端 API 的 Bearer 头） */
  async getAccessToken(): Promise<string | null> {
    try {
      return await tokenGetter()
    } catch {
      return null
    }
  },
}

/** 会话恢复：GET /api/auth/me，401/网络失败都视为未登录 */
async function restoreSession(): Promise<void> {
  const store = useAuthStore.getState()
  const token = getToken()
  if (!token) {
    store.setUser(null)
    store.setSession(null)
    store.setLoading(false)
    return
  }

  try {
    const res = await fetch(`${getHyperliquidApiBaseUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as {
      user: {
        id: string
        email: string
        full_name?: string
        roles?: string[]
        allowed_modules?: string[]
      }
    }
    const u = data.user
    store.setUser({
      id: u.id,
      email: u.email ?? '',
      name: u.full_name || u.email,
      role: u.roles ?? ['user'],
      customPermissions: [],
      allowedModules: u.allowed_modules ?? [],
      isActive: true,
      isVerified: true,
    })
    store.setSession({ user: { id: u.id, email: u.email } })
  } catch {
    // token 失效或后端不可达：清掉登录态（后端不可达时也会被路由守卫拦回登录页）
    setToken(null)
    store.setUser(null)
    store.setSession(null)
  } finally {
    store.setLoading(false)
  }
}

/** React 组件：应用挂载时恢复会话，并注册 token 获取器 */
export function AuthBridgeSync() {
  useEffect(() => {
    AuthBridge.setTokenGetter(async () => getToken())
    void restoreSession()
  }, [])

  return null
}
