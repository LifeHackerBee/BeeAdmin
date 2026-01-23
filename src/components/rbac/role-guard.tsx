/**
 * 角色守卫组件
 * 根据用户角色控制内容的显示
 */

import { useAuthStore } from '@/stores/auth-store'
import { hasPermission, hasRole, hasAnyRole, type UserRole } from '@/lib/rbac'
import { Navigate } from '@tanstack/react-router'

interface RoleGuardProps {
  children: React.ReactNode
  /**
   * 需要的权限（权限名称）
   */
  permission?: string
  /**
   * 需要的角色（单个角色）
   */
  role?: UserRole
  /**
   * 需要的角色（多个角色，满足任一即可）
   */
  roles?: UserRole[]
  /**
   * 无权限时是否重定向到 403 页面
   */
  redirectTo403?: boolean
  /**
   * 无权限时显示的替代内容
   */
  fallback?: React.ReactNode
}

/**
 * 角色守卫组件
 * 
 * 使用示例：
 * ```tsx
 * // 基于权限
 * <RoleGuard permission="users.edit">
 *   <EditUserButton />
 * </RoleGuard>
 * 
 * // 基于角色
 * <RoleGuard role="admin">
 *   <AdminPanel />
 * </RoleGuard>
 * 
 * // 基于多个角色（满足任一即可）
 * <RoleGuard roles={['admin', 'manager']}>
 *   <ManagementPanel />
 * </RoleGuard>
 * 
 * // 自定义无权限时的显示
 * <RoleGuard permission="users.delete" fallback={<div>无权限</div>}>
 *   <DeleteButton />
 * </RoleGuard>
 * ```
 */
export function RoleGuard({
  children,
  permission,
  role,
  roles,
  redirectTo403 = false,
  fallback = null,
}: RoleGuardProps) {
  const user = useAuthStore((state) => state.user)
  const userRoles = user?.role || []

  let hasAccess = false

  // 检查权限
  if (permission) {
    hasAccess = hasPermission(userRoles, permission)
  }
  // 检查单个角色
  else if (role) {
    hasAccess = hasRole(userRoles, role)
  }
  // 检查多个角色
  else if (roles && roles.length > 0) {
    hasAccess = hasAnyRole(userRoles, roles)
  }
  // 如果没有指定任何条件，默认允许访问
  else {
    hasAccess = true
  }

  // 如果无权限且需要重定向
  if (!hasAccess && redirectTo403) {
    return <Navigate to="/errors/$error" params={{ error: 'forbidden' }} replace />
  }

  // 如果无权限，显示替代内容或 null
  if (!hasAccess) {
    return <>{fallback}</>
  }

  // 有权限，显示子内容
  return <>{children}</>
}

