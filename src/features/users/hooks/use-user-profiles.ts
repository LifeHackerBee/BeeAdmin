/**
 * 用户权限管理 Hook
 * 提供用户权限的 CRUD 操作
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  roles: string[]
  custom_permissions: string[]
  allowed_modules: string[]
  is_active: boolean
  is_verified: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export function useUserProfiles() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * 获取所有用户的 profiles
   */
  const fetchProfiles = useCallback(async (): Promise<UserProfile[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // 获取对应的 email
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
      
      if (usersError) throw usersError

      // 合并 email 信息
      const profilesWithEmail = profiles.map((profile) => {
        const user = users.users.find((u) => u.id === profile.id)
        return {
          ...profile,
          email: user?.email || '',
        }
      })

      return profilesWithEmail as UserProfile[]
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取用户列表失败')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 更新用户角色（管理员操作）
   */
  const updateUserRoles = useCallback(async (userId: string, roles: string[]) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.rpc('admin_update_user_roles', {
        target_user_id: userId,
        new_roles: roles,
      })

      if (error) throw error
    } catch (err) {
      const error = err instanceof Error ? err : new Error('更新用户角色失败')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 更新用户模块权限（管理员操作）
   */
  const updateUserModules = useCallback(async (userId: string, modules: string[]) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.rpc('admin_update_user_modules', {
        target_user_id: userId,
        new_modules: modules,
      })

      if (error) throw error
    } catch (err) {
      const error = err instanceof Error ? err : new Error('更新用户模块权限失败')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 激活/禁用用户
   */
  const toggleUserActive = useCallback(async (userId: string, isActive: boolean) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId)

      if (error) throw error
    } catch (err) {
      const error = err instanceof Error ? err : new Error('更新用户状态失败')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 更新用户基本信息
   */
  const updateUserProfile = useCallback(
    async (userId: string, updates: Partial<Pick<UserProfile, 'full_name' | 'bio' | 'avatar_url'>>) => {
      try {
        setLoading(true)
        setError(null)

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)

        if (error) throw error
      } catch (err) {
        const error = err instanceof Error ? err : new Error('更新用户信息失败')
        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    fetchProfiles,
    updateUserRoles,
    updateUserModules,
    toggleUserActive,
    updateUserProfile,
  }
}
