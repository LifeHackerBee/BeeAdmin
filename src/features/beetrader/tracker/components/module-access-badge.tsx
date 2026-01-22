/**
 * 模块访问徽章组件
 * 显示当前用户对模块的访问权限状态
 */

import { useRBAC } from '@/hooks/use-rbac'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldCheck } from 'lucide-react'
import type { BeeAdminModule } from '@/lib/rbac'

interface ModuleAccessBadgeProps {
  module: BeeAdminModule | string
  className?: string
}

export function ModuleAccessBadge({ module, className }: ModuleAccessBadgeProps) {
  const { hasModuleAccess, isAdmin } = useRBAC()

  if (isAdmin()) {
    return (
      <Badge variant="default" className={className}>
        <ShieldCheck className="mr-1 h-3 w-3" />
        管理员权限
      </Badge>
    )
  }

  if (hasModuleAccess(module)) {
    return (
      <Badge variant="secondary" className={className}>
        <Shield className="mr-1 h-3 w-3" />
        已授权
      </Badge>
    )
  }

  return (
    <Badge variant="destructive" className={className}>
      <Shield className="mr-1 h-3 w-3" />
      无权限
    </Badge>
  )
}
