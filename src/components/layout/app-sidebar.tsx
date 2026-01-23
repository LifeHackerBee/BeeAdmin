import { type LinkProps } from '@tanstack/react-router'
import { useLayout } from '@/context/layout-provider'
import { useAuthStore } from '@/stores/auth-store'
import { hasPermission, hasModuleAccess } from '@/lib/rbac'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import type { SidebarData, NavItem } from './types'

/**
 * 根据 URL 推断模块名称
 */
function getModuleFromUrl(url: string): string | null {
  if (!url || url === '/') return null
  
  // 移除开头的斜杠
  const path = url.startsWith('/') ? url.substring(1) : url
  
  // 提取模块路径
  const parts = path.split('/')
  if (parts.length === 0) return null
  
  // 返回完整的模块路径（如 beetrader.tracker）
  return parts.join('.')
}

/**
 * 根据用户权限过滤侧边栏菜单项
 */
function filterSidebarByRole(
  sidebarData: SidebarData, 
  userRoles: string[], 
  allowedModules: string[]
): SidebarData {
  const filterItems = (items: SidebarData['navGroups'][0]['items']): SidebarData['navGroups'][0]['items'] => {
    return items
      .map((item): NavItem | null => {
        // 检查菜单项权限
        let hasAccess = true
        
        // 根据 URL 检查权限
        if ('url' in item && item.url) {
          const urlString = typeof item.url === 'string' ? item.url : ''
          const moduleName = getModuleFromUrl(urlString)
          
          console.log(`检查菜单项: ${item.title}, URL: ${urlString}, 模块: ${moduleName}`)
          
          // 检查角色权限
          if (urlString === '/users' && !hasPermission(userRoles, 'users')) {
            console.log(`  -> 角色权限检查失败: /users`)
            hasAccess = false
          }
          
          // 检查模块权限
          if (moduleName && !hasModuleAccess(userRoles, allowedModules, moduleName)) {
            console.log(`  -> 模块权限检查失败: ${moduleName}`)
            hasAccess = false
          } else if (moduleName) {
            console.log(`  -> 模块权限检查通过: ${moduleName}`)
          }
        }
        
        // 如果有子菜单，递归过滤
        if ('items' in item && item.items && item.items.length > 0) {
          console.log(`检查子菜单: ${item.title}`)
          // NavCollapsible 的 items 必须是 NavLink[]（有 url 的项）
          const filteredSubItems = filterItems(item.items).filter(
            (subItem): subItem is Extract<NavItem, { url: string | LinkProps['to'] }> =>
              'url' in subItem && subItem.url !== undefined
          )
          console.log(`  -> 子菜单过滤后: ${filteredSubItems.length} 项`)
          if (filteredSubItems.length === 0) {
            hasAccess = false
          } else {
            return { ...item, items: filteredSubItems } as NavItem
          }
        }
        
        return hasAccess ? item : null
      })
      .filter((item): item is NavItem => item !== null)
  }

  return {
    ...sidebarData,
    navGroups: sidebarData.navGroups
      .map((group) => ({
        ...group,
        items: filterItems(group.items),
      }))
      .filter((group) => group.items.length > 0),
  }
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  
  // 直接订阅顶层状态
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  
  // 每次渲染都打印
  console.log('🎨 AppSidebar 渲染', {
    timestamp: new Date().toISOString(),
    hasUser: !!user,
    email: user?.email,
    loading,
    allowedModulesLength: user?.allowedModules?.length,
    allowedModules: user?.allowedModules,
  })
  
  // Get user from auth store or fallback to sidebar data
  const sidebarUser = user
    ? {
        name: user.name || user.email.split('@')[0] || 'User',
        email: user.email,
        avatar: user.avatar || '',
      }
    : sidebarData.user

  // 根据用户角色和模块权限过滤侧边栏菜单
  const userRoles = user?.role || []
  const allowedModules = user?.allowedModules
  
  // 调试日志
  console.log('=== 侧边栏权限调试 ===')
  console.log('用户邮箱:', user?.email)
  console.log('用户角色:', userRoles)
  console.log('允许的模块:', allowedModules)
  console.log('Auth loading:', loading)
  console.log('allowedModules 类型:', typeof allowedModules, Array.isArray(allowedModules))
  
  // 关键判断：只有当用户已登录且 allowedModules 已明确加载（不是 undefined）时才显示菜单
  const isPermissionsReady = user && allowedModules !== undefined && !loading
  
  const filteredSidebarData = isPermissionsReady 
    ? filterSidebarByRole(sidebarData, userRoles, allowedModules)
    : { ...sidebarData, navGroups: [] } // 加载中或未登录显示空菜单
  
  console.log('权限数据是否就绪:', isPermissionsReady)
  console.log('过滤后的导航组数量:', filteredSidebarData.navGroups.length)
  filteredSidebarData.navGroups.forEach(group => {
    console.log(`  - ${group.title}: ${group.items.length} 项`)
  })
  console.log('=====================')

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {filteredSidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
