import { useNavigate, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth } = useAuthStore()

  const handleSignOut = async () => {
    // 先保存当前路径，用于登出后重定向
    let currentPath = '/'
    try {
      const pathname = String(location.pathname || '')
      const search = String(location.search || '')
      currentPath = pathname + search
      // 如果结果不是有效的字符串，使用默认值
      if (!currentPath || currentPath === 'undefinedundefined' || currentPath.includes('[object')) {
        currentPath = '/'
      }
    } catch (error) {
      // 如果转换失败，使用默认路径
      currentPath = '/'
    }

    try {
      // 调用 signOut，但不等待它完成（避免导航时请求被中止）
      // signOut 内部已经处理了错误，会清除本地状态
      auth.signOut().catch((error) => {
        console.error('Sign out error:', error)
      })
      
      // 立即导航，不等待 signOut 完成
      // 这样可以避免 NS_BINDING_ABORTED 错误
      navigate({
        to: '/sign-in',
        search: { redirect: currentPath },
        replace: true,
      })
    } catch (error) {
      console.error('Sign out error:', error)
      // 即使出错也导航到登录页
      navigate({
        to: '/sign-in',
        replace: true,
      })
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Sign out'
      desc='Are you sure you want to sign out? You will need to sign in again to access your account.'
      confirmText='Sign out'
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
