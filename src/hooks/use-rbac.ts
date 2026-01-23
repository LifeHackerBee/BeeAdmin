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
  hasModuleAccess,
  getAccessibleModules,
  type UserRole,
  type BeeAdminModule,
} from '@/lib/rbac'

export function useRBAC() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  const userRoles = user?.role || []
  const allowedModules = user?.allowedModules

  return {
    // 加载状态
    isLoading: loading,
    // 用户角色
    roles: userRoles,
    userRoles,
    // 用户允许的模块
    allowedModules,
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
    // 检查模块权限
    hasModuleAccess: (moduleName: BeeAdminModule | string) => 
      hasModuleAccess(userRoles, allowedModules || [], moduleName),
    // 获取可访问的模块列表
    getAccessibleModules: () => getAccessibleModules(userRoles, allowedModules || []),
  }
}

