/**
 * 基于角色的访问控制 (RBAC) 工具函数
 */

export type UserRole = 'admin' | 'manager' | 'user' | 'guest'

export interface RolePermissions {
  [key: string]: {
    roles: UserRole[]
    description?: string
  }
}

/**
 * 默认权限配置
 * 可以根据需要扩展
 */
export const defaultPermissions: RolePermissions = {
  // 页面访问权限
  'dashboard': { roles: ['admin', 'manager', 'user'], description: '访问仪表板' },
  'users': { roles: ['admin', 'manager'], description: '管理用户' },
  'settings': { roles: ['admin', 'manager', 'user'], description: '访问设置' },
  'tasks': { roles: ['admin', 'manager', 'user'], description: '访问任务' },
  'monitoring': { roles: ['admin', 'manager', 'user'], description: '访问监控模块' },
  'monitoring.tasks': { roles: ['admin', 'manager', 'user'], description: '访问后台任务管理' },
  'apps': { roles: ['admin', 'manager', 'user'], description: '访问应用' },
  'chats': { roles: ['admin', 'manager', 'user'], description: '访问聊天' },
  'beeai': { roles: ['admin', 'manager', 'user'], description: '访问 BeeAI 智能助手' },
  'beetrader': { roles: ['admin', 'manager', 'user'], description: '访问 BeeTrader 交易平台' },
  
  // 功能权限
  'users.create': { roles: ['admin'], description: '创建用户' },
  'users.edit': { roles: ['admin', 'manager'], description: '编辑用户' },
  'users.delete': { roles: ['admin'], description: '删除用户' },
  'settings.admin': { roles: ['admin'], description: '访问管理员设置' },
}

/**
 * 检查用户是否有指定权限
 */
export function hasPermission(
  userRoles: string[] | undefined | null,
  permission: string
): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false
  }

  const permissionConfig = defaultPermissions[permission]
  if (!permissionConfig) {
    // 如果权限未定义，默认允许所有已登录用户
    return true
  }

  return permissionConfig.roles.some((role) => userRoles.includes(role))
}

/**
 * 检查用户是否有任一指定权限
 */
export function hasAnyPermission(
  userRoles: string[] | undefined | null,
  permissions: string[]
): boolean {
  return permissions.some((permission) => hasPermission(userRoles, permission))
}

/**
 * 检查用户是否有所有指定权限
 */
export function hasAllPermissions(
  userRoles: string[] | undefined | null,
  permissions: string[]
): boolean {
  return permissions.every((permission) => hasPermission(userRoles, permission))
}

/**
 * 检查用户是否有指定角色
 */
export function hasRole(
  userRoles: string[] | undefined | null,
  role: UserRole
): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false
  }
  return userRoles.includes(role)
}

/**
 * 检查用户是否有任一指定角色
 */
export function hasAnyRole(
  userRoles: string[] | undefined | null,
  roles: UserRole[]
): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false
  }
  return roles.some((role) => userRoles.includes(role))
}

/**
 * 检查用户是否是管理员
 */
export function isAdmin(userRoles: string[] | undefined | null): boolean {
  return hasRole(userRoles, 'admin')
}

/**
 * 检查用户是否是管理员或经理
 */
export function isAdminOrManager(userRoles: string[] | undefined | null): boolean {
  return hasAnyRole(userRoles, ['admin', 'manager'])
}

/**
 * 获取用户可访问的页面列表
 */
export function getAccessiblePages(userRoles: string[] | undefined | null): string[] {
  if (!userRoles || userRoles.length === 0) {
    return []
  }

  return Object.keys(defaultPermissions).filter((permission) =>
    hasPermission(userRoles, permission)
  )
}

