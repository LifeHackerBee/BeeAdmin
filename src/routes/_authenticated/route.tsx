import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'
import { hasPermission } from '@/lib/rbac'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { user, session, loading, initialize } = useAuthStore.getState()
    
    // 页面刷新时，store 状态会丢失，需要重新初始化
    // 如果 loading 为 true，说明正在初始化，等待完成
    // 如果 loading 为 false 但没有 user 和 session，说明可能是刷新后的状态丢失，需要重新初始化
    if (loading) {
      // 等待初始化完成
      await initialize()
    } else if (!user || !session) {
      // 状态丢失，重新初始化
      await initialize()
    }

    // 重新获取最新的状态（初始化后）
    const { user: updatedUser, session: updatedSession } = useAuthStore.getState()
    
    // 如果初始化后仍然没有用户或会话，才重定向
    if (!updatedUser || !updatedSession) {
        // 安全地获取重定向路径
      let redirectPath = '/'
      try {
          // 优先使用 href，如果不存在则使用 pathname
          if (location.href && typeof location.href === 'string') {
            // 移除协议和域名部分，只保留路径
            const url = new URL(location.href, 'http://localhost')
            redirectPath = url.pathname + url.search
          } else if (location.pathname) {
            const pathname = String(location.pathname)
            // 如果 search 是对象，需要转换为查询字符串
            let searchStr = ''
            if (location.search) {
              if (typeof location.search === 'string') {
                searchStr = location.search
              } else if (typeof location.search === 'object') {
                const params = new URLSearchParams()
                Object.entries(location.search).forEach(([key, value]) => {
                  if (value != null) {
                    params.append(key, String(value))
                  }
                })
                searchStr = params.toString() ? '?' + params.toString() : ''
              }
            }
            redirectPath = pathname + searchStr
          }
          
          // 验证路径有效性
        if (!redirectPath || redirectPath === 'undefinedundefined' || redirectPath.includes('[object')) {
          redirectPath = '/'
        }
      } catch (error) {
        // 如果转换失败，使用默认路径
        redirectPath = '/'
      }
      
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: redirectPath,
        },
      })
    }

    // 基于路径的权限检查
    // 此时 updatedUser 一定存在（否则前面已经重定向了）
    if (!updatedUser) {
      // 这不应该发生，但为了类型安全添加检查
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.pathname || '/',
        },
      })
    }
    
    const path = location.pathname
    const userRoles = updatedUser.role || []
    
    // 检查用户管理页面权限
    if (path.startsWith('/users') && !hasPermission(userRoles, 'users')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
        replace: true,
      })
    }
    
    // 可以在这里添加更多基于路径的权限检查
    // 例如：if (path.startsWith('/admin') && !isAdmin(userRoles)) { ... }
  },
  component: AuthenticatedLayout,
})
