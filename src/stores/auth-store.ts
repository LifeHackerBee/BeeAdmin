import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthUser {
  id: string
  email: string
  name?: string
  avatar?: string
  role?: string[]
}

interface AuthState {
  auth: {
    user: AuthUser | null
    session: Session | null
    loading: boolean
    setUser: (user: AuthUser | null) => void
    setSession: (session: Session | null) => void
    setLoading: (loading: boolean) => void
    initialize: () => Promise<void>
    signOut: () => Promise<void>
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
    auth: {
      user: null,
    session: null,
    loading: true,
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
    setSession: (session) =>
      set((state) => ({ ...state, auth: { ...state.auth, session } })),
    setLoading: (loading) =>
      set((state) => ({ ...state, auth: { ...state.auth, loading } })),
    initialize: async () => {
      try {
        // 设置 loading 为 true，防止并发初始化
        set((state) => ({
          ...state,
          auth: { ...state.auth, loading: true },
        }))

        // 先尝试从存储中获取 session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Error getting session:', sessionError)
          set((state) => ({
            ...state,
            auth: { ...state.auth, user: null, session: null, loading: false },
          }))
          return
        }

        // 检查 session 是否存在
        if (session?.user) {
          // 检查 token 是否过期（如果 expires_at 存在）
          let shouldRefresh = false
          if (session.expires_at) {
            const expiresAt = session.expires_at * 1000 // 转换为毫秒
            const now = Date.now()
            // 如果 token 已过期或即将过期（5分钟内），尝试刷新
            if (expiresAt < now || expiresAt < now + 5 * 60 * 1000) {
              shouldRefresh = true
            }
          }

          // 如果需要刷新，尝试刷新 session
          if (shouldRefresh) {
            console.log('Session expired or expiring soon, attempting to refresh...')
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
            
            if (refreshError || !refreshData.session) {
              console.log('Failed to refresh session:', refreshError)
              // 刷新失败，清除状态
              set((state) => ({
                ...state,
                auth: { ...state.auth, user: null, session: null, loading: false },
              }))
              return
            }
            
            // 使用刷新后的 session
            const refreshedSession = refreshData.session
            if (refreshedSession?.user) {
              // 处理角色数据
              let role = refreshedSession.user.user_metadata?.role || ['user']
              if (typeof role === 'string') {
                try {
                  role = JSON.parse(role)
                } catch {
                  role = [role]
                }
              }
              if (!Array.isArray(role)) {
                role = [role]
              }

              const user: AuthUser = {
                id: refreshedSession.user.id,
                email: refreshedSession.user.email || '',
                name: refreshedSession.user.user_metadata?.name || refreshedSession.user.user_metadata?.full_name,
                avatar: refreshedSession.user.user_metadata?.avatar_url,
                role: role as string[],
              }
              set((state) => ({
                ...state,
                auth: { ...state.auth, user, session: refreshedSession, loading: false },
              }))
              return
            }
          } else {
            // Token 未过期，使用现有 session
            // 处理角色数据
            let role = session.user.user_metadata?.role || ['user']
            if (typeof role === 'string') {
              try {
                role = JSON.parse(role)
              } catch {
                role = [role]
              }
            }
            if (!Array.isArray(role)) {
              role = [role]
            }

            const user: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.user_metadata?.full_name,
              avatar: session.user.user_metadata?.avatar_url,
              role: role as string[],
            }
            set((state) => ({
              ...state,
              auth: { ...state.auth, user, session, loading: false },
            }))
            return
          }
        }
        
        // 如果没有有效的 session，清除状态
        set((state) => ({
          ...state,
          auth: { ...state.auth, user: null, session: null, loading: false },
        }))

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            // 处理角色数据：可能是数组、JSON字符串或单个字符串
            let role = session.user.user_metadata?.role || ['user']
            if (typeof role === 'string') {
              try {
                // 尝试解析 JSON 字符串
                role = JSON.parse(role)
              } catch {
                // 如果不是 JSON，当作单个角色处理
                role = [role]
              }
            }
            // 确保是数组
            if (!Array.isArray(role)) {
              role = [role]
            }

            const user: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.user_metadata?.full_name,
              avatar: session.user.user_metadata?.avatar_url,
              role: role as string[],
            }
            set((state) => ({
              ...state,
              auth: { ...state.auth, user, session },
            }))
          } else {
            set((state) => ({
              ...state,
              auth: { ...state.auth, user: null, session: null },
            }))
  }
})
      } catch (error) {
        console.error('Error initializing auth:', error)
        set((state) => ({
          ...state,
          auth: { ...state.auth, loading: false },
        }))
      }
    },
    signOut: async () => {
      try {
        // 先清除本地状态，避免导航时请求被中止
        set((state) => ({
          ...state,
          auth: { ...state.auth, user: null, session: null },
        }))
        
        // 使用 local scope 登出，避免全局登出可能的问题
        // 如果需要在所有标签页登出，可以使用 { scope: 'global' }
        await supabase.auth.signOut({ scope: 'local' })
      } catch (error) {
        console.error('Error signing out:', error)
        // 即使 API 调用失败，也确保本地状态已清除
        set((state) => ({
          ...state,
          auth: { ...state.auth, user: null, session: null },
        }))
        // 不抛出错误，允许继续导航
      }
    },
    reset: () =>
      set((state) => ({
        ...state,
        auth: { ...state.auth, user: null, session: null },
      })),
  },
}))
