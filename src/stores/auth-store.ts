import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthUser {
  id: string
  email: string
  name?: string
  avatar?: string
  role?: string[]
  // 从 profiles 表读取的额外字段
  customPermissions?: string[]
  allowedModules?: string[]
  isActive?: boolean
  isVerified?: boolean
  bio?: string
}

interface AuthState {
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

// 从 Supabase profiles 表获取用户详细信息
async function fetchUserProfile(userId: string): Promise<Partial<AuthUser> | null> {
  try {
    console.log('🔍 开始获取用户 profile:', userId)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, bio, roles, custom_permissions, allowed_modules, is_active, is_verified')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('❌ Error fetching user profile:', error)
      return null
    }
    
    console.log('✅ Profile 数据获取成功:', {
      roles: data.roles,
      allowed_modules: data.allowed_modules,
      is_active: data.is_active,
    })
    
    // 确保 allowedModules 始终是数组（不是 undefined）
    const profile = {
      name: data.full_name,
      avatar: data.avatar_url,
      bio: data.bio,
      role: data.roles || ['user'],
      customPermissions: data.custom_permissions || [],
      allowedModules: data.allowed_modules || [], // 关键：确保不是 undefined
      isActive: data.is_active,
      isVerified: data.is_verified,
    }
    
    console.log('📦 返回的 profile 对象:', profile)
    return profile
  } catch (error) {
    console.error('❌ Exception fetching user profile:', error)
    return null
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  loading: true,
  
  setUser: (user) => {
    console.log('📝 setUser 被调用:', user?.email)
    set({ user, loading: false })
  },
  
  setSession: (session) => {
    console.log('📝 setSession 被调用:', session?.user?.email)
    set({ session, loading: false })
  },
  
  setLoading: (loading) => {
    console.log('📝 setLoading 被调用:', loading)
    set({ loading })
  },
  
  initialize: async () => {
    try {
      console.log('🚀 开始初始化 auth store')
      
      // 设置 loading 为 true
      set({ loading: true })

      // 先尝试从存储中获取 session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Error getting session:', sessionError)
        set({ user: null, session: null, loading: false })
        return
      }

      // 检查 session 是否存在
      if (session?.user) {
        // 从 profiles 表获取完整的用户信息
        const profile = await fetchUserProfile(session.user.id)
        
        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name || session.user.user_metadata?.name || session.user.user_metadata?.full_name,
          avatar: profile?.avatar || session.user.user_metadata?.avatar_url,
          role: profile?.role || ['user'],
          customPermissions: profile?.customPermissions || [],
          allowedModules: profile?.allowedModules || [],
          isActive: profile?.isActive,
          isVerified: profile?.isVerified,
          bio: profile?.bio,
        }
        
        console.log('👤 初始化 - 创建用户对象:', {
          email: user.email,
          role: user.role,
          allowedModules: user.allowedModules,
          hasProfile: !!profile,
        })
        
        // 更新最后登录时间
        if (profile) {
          void supabase.rpc('update_last_login', { user_id: session.user.id })
        }
        
        set({ user, session, loading: false })
      } else {
        set({ user: null, session: null, loading: false })
      }

      // 注册监听器（忽略 INITIAL_SESSION）
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email)
        
        if (event === 'INITIAL_SESSION') {
          console.log('⏭️  跳过 INITIAL_SESSION 事件')
          return
        }
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          
          const user: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.name || session.user.user_metadata?.name || session.user.user_metadata?.full_name,
            avatar: profile?.avatar || session.user.user_metadata?.avatar_url,
            role: profile?.role || ['user'],
            customPermissions: profile?.customPermissions || [],
            allowedModules: profile?.allowedModules || [],
            isActive: profile?.isActive,
            isVerified: profile?.isVerified,
            bio: profile?.bio,
          }
          
          console.log('👤 监听器 - 更新用户对象:', {
            event,
            email: user.email,
            role: user.role,
            allowedModules: user.allowedModules,
          })
          
          set({ user, session, loading: false })
        } else {
          console.log('👋 用户登出')
          set({ user: null, session: null, loading: false })
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
      set({ loading: false })
    }
  },
  
  signOut: async () => {
    try {
      set({ user: null, session: null })
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      console.error('Error signing out:', error)
      set({ user: null, session: null })
    }
  },
  
  reset: () => {
    set({ user: null, session: null })
  },
}))
