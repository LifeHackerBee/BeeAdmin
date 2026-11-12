import { create } from 'zustand'

// 认证为本地账号 + JWT（2026-11-12 从 Auth0 迁移）。auth-store 仍是全应用的状态来源，
// 由 AuthBridgeSync（/api/auth/me 会话恢复）与登录页（/api/auth/login）填充。
interface AuthUser {
  id: string
  email: string
  name?: string
  avatar?: string
  role?: string[]
  customPermissions?: string[]
  allowedModules?: string[]
  isActive?: boolean
  isVerified?: boolean
  bio?: string
}

// 轻量 session（替代 Supabase Session）；只需让消费方判断「是否登录」
export interface AppSession {
  user: { id: string; email?: string }
  access_token?: string
}

interface AuthState {
  user: AuthUser | null
  session: AppSession | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  setSession: (session: AppSession | null) => void
  setLoading: (loading: boolean) => void
  /** 兼容旧调用（main.tsx / 路由守卫）。AuthBridgeSync 负责真正的状态同步，这里仅占位。 */
  initialize: () => Promise<void>
  /** 兼容旧调用（权限刷新）。本地账号模式下为空操作。 */
  refreshProfile: () => Promise<void>
  /** 清除本地状态。token 清理由 SignOutDialog 完成。 */
  signOut: () => Promise<void>
  reset: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  loading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),

  // AuthBridgeSync 已经在应用挂载时同步状态，这里保持兼容、不做事
  initialize: async () => {},
  refreshProfile: async () => {},

  signOut: async () => {
    // 仅清本地状态；token 清理由 SignOutDialog 完成
    set({ user: null, session: null })
  },

  reset: () => {
    set({ user: null, session: null })
  },
}))
