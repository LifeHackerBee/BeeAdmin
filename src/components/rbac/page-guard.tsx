/**
 * 页面权限包装器
 * 根据路由自动推断需要的模块权限
 */

import { ModuleGuard } from '@/components/rbac/module-guard'
import { useLocation } from '@tanstack/react-router'

interface PageGuardProps {
  children: React.ReactNode
  module?: string
}

/**
 * 根据路径自动推断模块名
 */
function getModuleFromPath(pathname: string): string | null {
  if (!pathname || pathname === '/') return null
  
  // 移除开头的斜杠
  const path = pathname.startsWith('/') ? pathname.substring(1) : pathname
  
  // 提取模块路径
  const parts = path.split('/')
  if (parts.length === 0) return null
  
  // 返回完整的模块路径（如 beetrader.tracker）
  return parts.join('.')
}

/**
 * 页面守卫组件
 * 自动根据当前路径推断需要的模块权限
 */
export function PageGuard({ children, module }: PageGuardProps) {
  const location = useLocation()
  const inferredModule = module || getModuleFromPath(location.pathname)
  
  // 如果没有模块限制，直接渲染
  if (!inferredModule) {
    return <>{children}</>
  }
  
  // 使用 ModuleGuard 保护
  return (
    <ModuleGuard module={inferredModule}>
      {children}
    </ModuleGuard>
  )
}

/**
 * 创建受保护的组件
 */
export function withPageGuard<P extends object>(
  Component: React.ComponentType<P>,
  module?: string
) {
  return function ProtectedComponent(props: P) {
    return (
      <PageGuard module={module}>
        <Component {...props} />
      </PageGuard>
    )
  }
}
