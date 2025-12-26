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
    try {
      await auth.signOut()
    // Preserve current location for redirect after sign-in
      // 确保 currentPath 是字符串
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
      
    navigate({
      to: '/sign-in',
      search: { redirect: currentPath },
      replace: true,
    })
    } catch (error) {
      console.error('Sign out error:', error)
      // Still navigate to sign-in even if signOut fails
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
