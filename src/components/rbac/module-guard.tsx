/**
 * 模块权限守卫组件
 * 用于保护需要特定模块权限才能访问的内容
 */

import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useRBAC } from '@/hooks/use-rbac'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { BeeAdminModule } from '@/lib/rbac'

interface ModuleGuardProps {
  /** 需要的模块权限 */
  module: BeeAdminModule | string
  /** 当没有权限时显示的内容（可选） */
  fallback?: React.ReactNode
  /** 子组件 */
  children: React.ReactNode
  /** 是否在无权限时重定向到首页（默认 false，显示错误提示） */
  redirectOnDenied?: boolean
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
export function ModuleGuard({ module, fallback, children, redirectOnDenied = false }: ModuleGuardProps) {
  const { hasModuleAccess, allowedModules, userRoles, isLoading } = useRBAC()
  const navigate = useNavigate()

  // 调试日志
  console.log('🛡️ ModuleGuard 检查:', {
    module,
    allowedModules,
    userRoles,
    isLoading,
  })

  // 等待权限数据加载完成
  if (isLoading) {
    console.log('⏳ 权限数据加载中...')
    // 显示加载指示器
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  const hasAccess = hasModuleAccess(module)
  console.log(`🔐 权限检查结果: ${module} -> ${hasAccess ? '✅ 有权限' : '❌ 无权限'}`)

  // 使用 useEffect 处理重定向，避免在渲染期间导航
  useEffect(() => {
    if (!hasAccess && redirectOnDenied) {
      console.log('🔄 无权限，重定向到首页')
      navigate({ to: '/' })
    }
  }, [hasAccess, redirectOnDenied, navigate])

  // 检查是否有权限访问该模块
  if (!hasAccess) {
    // 如果设置了重定向，在重定向前显示加载状态
    if (redirectOnDenied) {
      return (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>权限验证中...</p>
          </div>
        </div>
      )
    }

    // 如果提供了自定义 fallback，使用它
    if (fallback) {
      return <>{fallback}</>
    }

    // 默认的无权限提示
    return (
      <div className="flex items-center justify-center h-[50vh] p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>权限不足</AlertTitle>
          <AlertDescription>
            您没有权限访问 <code className="font-mono text-sm">{module}</code> 模块。
            <br />
            如需访问，请联系管理员。
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // 有权限，渲染子组件
  console.log('✅ 权限验证通过，渲染页面')
  return <>{children}</>
}
