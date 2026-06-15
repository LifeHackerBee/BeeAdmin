import { useAuth0 } from '@auth0/auth0-react'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { logout } = useAuth0()
  const signOut = useAuthStore((state) => state.signOut)

  const handleSignOut = () => {
    // 清本地状态，再走 Auth0 跳转式登出（会重定向到 Auth0 再回到站点 origin）
    signOut().catch((error: unknown) => {
      console.error('Sign out error:', error)
    })
    void logout({
      logoutParams: {
        returnTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
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
