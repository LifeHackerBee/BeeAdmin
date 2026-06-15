import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useAuthStore } from '@/stores/auth-store'
import { AUTH0_ROLES_CLAIM, AUTH0_UID_CLAIM } from '@/lib/auth0'

/**
 * 把 Auth0 的认证状态同步进既有的 auth-store。
 *
 * 这样全应用（路由守卫、RBAC、hyperliquid-api-client 等）继续读 auth-store，
 * 无需改动；只是登录来源从 Supabase 换成了 Auth0。
 *
 * profiles 表在 Supabase（未迁移、且当前受限），拿不到角色/权限，
 * 因此已登录用户默认给 ['admin']（可被 Auth0 自定义 claim 覆盖），避免被 RBAC 拦住。
 */
export function Auth0Bridge() {
  const { isLoading, isAuthenticated, user } = useAuth0()

  useEffect(() => {
    const store = useAuthStore.getState()

    if (isLoading) {
      store.setLoading(true)
      return
    }

    if (isAuthenticated && user) {
      const claimRoles = user[AUTH0_ROLES_CLAIM]
      const role = Array.isArray(claimRoles) && claimRoles.length > 0 ? claimRoles : ['admin']
      // 优先用映射到原 Supabase UUID 的自定义 claim，回退到 Auth0 sub
      const id = (user[AUTH0_UID_CLAIM] as string | undefined) ?? user.sub ?? ''
      store.setUser({
        id,
        email: user.email ?? '',
        name: user.name ?? user.nickname,
        avatar: user.picture,
        role,
        customPermissions: [],
        allowedModules: [],
        isActive: true,
        isVerified: user.email_verified ?? true,
      })
      store.setSession({ user: { id, email: user.email } })
    } else {
      store.setUser(null)
      store.setSession(null)
    }
    store.setLoading(false)
  }, [isLoading, isAuthenticated, user])

  return null
}
