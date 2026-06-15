/**
 * 用户权限管理 Hook
 *
 * 注意：认证已迁移到 Auth0，用户/角色管理改由 Auth0 控制台负责。
 * 这里保留接口形状以兼容 /users 页面，但不再连 Supabase；列表为空、写操作禁用。
 */

import { useState, useCallback } from 'react'

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

const DISABLED_MSG = '用户管理已迁移到 Auth0 控制台，此处不再可用'

export function useUserProfiles() {
  const [loading] = useState(false)
  const [error] = useState<Error | null>(null)

  const fetchProfiles = useCallback(async (): Promise<UserProfile[]> => {
    // Auth0 模式下不再从 Supabase profiles 拉取用户列表
    return []
  }, [])

  const updateUserRoles = useCallback(async (_userId: string, _roles: string[]) => {
    throw new Error(DISABLED_MSG)
  }, [])

  const updateUserModules = useCallback(async (_userId: string, _modules: string[]) => {
    throw new Error(DISABLED_MSG)
  }, [])

  const toggleUserActive = useCallback(async (_userId: string, _isActive: boolean) => {
    throw new Error(DISABLED_MSG)
  }, [])

  const updateUserProfile = useCallback(
    async (
      _userId: string,
      _updates: Partial<Pick<UserProfile, 'full_name' | 'bio' | 'avatar_url'>>
    ) => {
      throw new Error(DISABLED_MSG)
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
