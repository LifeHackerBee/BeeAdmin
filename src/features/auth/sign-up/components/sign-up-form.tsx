import { useAuth0 } from '@auth0/auth0-react'
import { Loader2, UserPlus } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/use-translation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// 注册已交给 Auth0 托管页面（screen_hint=signup）；不再走 Supabase。
export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { loginWithRedirect, isLoading } = useAuth0()
  const { t } = useTranslation()

  const handleSignUp = () => {
    void loginWithRedirect({
      appState: { returnTo: '/' },
      authorizationParams: { screen_hint: 'signup' },
    })
  }

  return (
    <div className={cn('grid gap-3', className)} {...props}>
      <Button onClick={handleSignUp} disabled={isLoading}>
        {isLoading ? <Loader2 className='animate-spin' /> : <UserPlus />}
        {t('common.createAccount')}
      </Button>
    </div>
  )
}
