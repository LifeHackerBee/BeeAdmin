/**
 * RBAC Hook
 * 提供便捷的角色和权限检查方法
 */

import { useAuthStore } from '@/stores/auth-store'
import {
  hasPermission,
  hasRole,
  hasAnyRole,
  hasAllPermissions,
  hasAnyPermission,
  isAdmin,
  isAdminOrManager,
  getAccessiblePages,
  type UserRole,
} from '@/lib/rbac'

export function useRBAC() {
  const { auth } = useAuthStore()
  const userRoles = auth.user?.role || []

  return {
    // 用户角色
    roles: userRoles,
    // 检查权限
    hasPermission: (permission: string) => hasPermission(userRoles, permission),
    hasAnyPermission: (permissions: string[]) => hasAnyPermission(userRoles, permissions),
    hasAllPermissions: (permissions: string[]) => hasAllPermissions(userRoles, permissions),
    // 检查角色
    hasRole: (role: UserRole) => hasRole(userRoles, role),
    hasAnyRole: (roles: UserRole[]) => hasAnyRole(userRoles, roles),
    // 便捷方法
    isAdmin: () => isAdmin(userRoles),
    isAdminOrManager: () => isAdminOrManager(userRoles),
    // 获取可访问的页面
    getAccessiblePages: () => getAccessiblePages(userRoles),
  }
}

