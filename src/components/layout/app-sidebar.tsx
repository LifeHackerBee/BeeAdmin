import { type LinkProps } from '@tanstack/react-router'
import { useLayout } from '@/context/layout-provider'
import { useAuthStore } from '@/stores/auth-store'
import { hasPermission } from '@/lib/rbac'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'
import type { SidebarData, NavItem } from './types'

/**
 * 根据用户权限过滤侧边栏菜单项
 */
function filterSidebarByRole(sidebarData: SidebarData, userRoles: string[]): SidebarData {
  const filterItems = (items: SidebarData['navGroups'][0]['items']): SidebarData['navGroups'][0]['items'] => {
    return items
      .map((item): NavItem | null => {
        // 检查菜单项权限
        let hasAccess = true
        
        // 根据 URL 检查权限
        if ('url' in item && item.url) {
          if (item.url === '/users' && !hasPermission(userRoles, 'users')) {
            hasAccess = false
          }
          // 可以添加更多基于 URL 的权限检查
        }
        
        // 如果有子菜单，递归过滤
        if ('items' in item && item.items && item.items.length > 0) {
          // NavCollapsible 的 items 必须是 NavLink[]（有 url 的项）
          const filteredSubItems = filterItems(item.items).filter(
            (subItem): subItem is Extract<NavItem, { url: string | LinkProps['to'] }> =>
              'url' in subItem && subItem.url !== undefined
          )
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
  const { auth } = useAuthStore()

  // Get user from auth store or fallback to sidebar data
  const user = auth.user
    ? {
        name: auth.user.name || auth.user.email.split('@')[0] || 'User',
        email: auth.user.email,
        avatar: auth.user.avatar || '',
      }
    : sidebarData.user

  // 根据用户角色过滤侧边栏菜单
  const userRoles = auth.user?.role || []
  const filteredSidebarData = filterSidebarByRole(sidebarData, userRoles)

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={filteredSidebarData.teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {filteredSidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
