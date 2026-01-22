/**
 * BeeAdmin 权限系统类型定义
 */

/**
 * 用户角色
 */
export type UserRole = 'admin' | 'manager' | 'user' | 'guest'

/**
 * BeeAdmin 模块
 */
export type BeeAdminModule = 
  | 'beetrader'
  | 'beetrader.tracker'
  | 'beetrader.backtest'
  | 'beetrader.analyzer'
  | 'beetrader.events'
  | 'beetrader.market'
  | 'beetrader.candles'
  | 'beetrader.signals'
  | 'beetrader.strategies'
  | 'beetrader.macroscopic'
  | 'beetrader.whale-wallet-manage'
  | 'beetrader.monitor-observation'
  | 'beeai'
  | 'finance'
  | 'finance.expenses'
  | 'finance.assets'
  | 'finance.liabilities'
  | 'finance.categories'
  | 'finance.investment'
  | 'finance.statistics'
  | 'finance.exchange-rate'
  | 'fire'
  | 'monitoring'
  | 'monitoring.tasks'
  | 'tasks'
  | 'apps'
  | 'users'
  | 'settings'
  | 'help-center'

/**
 * 用户 Profile（来自 Supabase profiles 表）
 */
export interface UserProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  roles: UserRole[]
  custom_permissions: string[]
  allowed_modules: BeeAdminModule[]
  is_active: boolean
  is_verified: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  last_login_at: string | null
}

/**
 * 用户 Profile 更新参数
 */
export interface UpdateUserProfileParams {
  full_name?: string
  avatar_url?: string
  bio?: string
}

/**
 * 权限检查结果
 */
export interface PermissionCheck {
  hasPermission: boolean
  reason?: string
}

/**
 * RBAC Hook 返回值
 */
export interface UseRBACReturn {
  roles: string[]
  allowedModules: string[]
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  isAdmin: () => boolean
  isAdminOrManager: () => boolean
  getAccessiblePages: () => string[]
  hasModuleAccess: (moduleName: BeeAdminModule | string) => boolean
  getAccessibleModules: () => string[]
}
