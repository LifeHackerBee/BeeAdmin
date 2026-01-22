/**
 * 模块权限守卫组件
 * 用于保护需要特定模块权限才能访问的内容
 */

import { useRBAC } from '@/hooks/use-rbac'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { BeeAdminModule } from '@/lib/rbac'

interface ModuleGuardProps {
  /** 需要的模块权限 */
  module: BeeAdminModule | string
  /** 当没有权限时显示的内容（可选） */
  fallback?: React.ReactNode
  /** 子组件 */
  children: React.ReactNode
}

/**
 * 模块权限守卫
 * 
 * 使用示例：
 * ```tsx
 * <ModuleGuard module={BeeAdminModules.BEETRADER_TRACKER}>
 *   <TrackerContent />
 * </ModuleGuard>
 * ```
 */
export function ModuleGuard({ module, fallback, children }: ModuleGuardProps) {
  const { hasModuleAccess } = useRBAC()

  // 检查是否有权限访问该模块
  if (!hasModuleAccess(module)) {
    // 如果提供了自定义 fallback，使用它
    if (fallback) {
      return <>{fallback}</>
    }

    // 默认的无权限提示
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>权限不足</AlertTitle>
        <AlertDescription>
          您没有权限访问此模块。如需访问，请联系管理员。
        </AlertDescription>
      </Alert>
    )
  }

  // 有权限，渲染子组件
  return <>{children}</>
}
