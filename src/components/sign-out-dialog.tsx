import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { setToken } from '@/components/auth-bridge'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()

  const handleSignOut = () => {
    // 清 token 与本地状态，回登录页（本地账号无第三方跳转登出）
    setToken(null)
    signOut().catch((error: unknown) => {
      console.error('Sign out error:', error)
    })
    void navigate({ to: '/sign-in' })
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
