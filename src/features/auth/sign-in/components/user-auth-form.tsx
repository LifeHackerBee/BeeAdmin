import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Loader2, LogIn } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/use-translation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const { loginWithRedirect, isLoading, isAuthenticated } = useAuth0()
  const { t } = useTranslation()

  // 已登录却停留在登录页（例如直接访问 /sign-in），直接回到目标页
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      window.location.replace(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/')
    }
  }, [isAuthenticated, redirectTo])

  const handleLogin = () => {
    void loginWithRedirect({
      appState: { returnTo: redirectTo && redirectTo.startsWith('/') ? redirectTo : '/' },
    })
  }

  return (
    <div className={cn('grid gap-3', className)} {...props}>
      <Button onClick={handleLogin} disabled={isLoading}>
        {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
        {t('common.signIn')}
      </Button>
    </div>
  )
}
