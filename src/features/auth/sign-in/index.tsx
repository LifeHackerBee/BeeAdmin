import { useSearch, Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/use-translation'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'
import { authConfig } from '@/config/auth'

export function SignIn() {
  const search = useSearch({ from: '/(auth)/sign-in' })
  const { t } = useTranslation()
  
  // 确保 redirect 是字符串，处理各种可能的类型
  const redirectTo = search?.redirect && typeof search.redirect === 'string' 
    ? search.redirect 
    : undefined

  // 检查错误消息
  const errorMessage = search?.error === 'signup_disabled'
    ? '注册功能已禁用，请联系管理员'
    : search?.error === 'forgot_password_disabled'
    ? '忘记密码功能已禁用，请联系管理员'
    : null

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>{t('auth.signInTitle')}</CardTitle>
          <CardDescription>
            {t('auth.signInDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {errorMessage && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <UserAuthForm redirectTo={redirectTo} />
        </CardContent>
        <CardFooter className='flex flex-col gap-2'>
          {authConfig.allowSignUp && (
            <p className='px-8 text-center text-sm text-muted-foreground'>
              {t('auth.dontHaveAccount')}{' '}
              <Link
                to='/sign-up'
                className='underline underline-offset-4 hover:text-primary'
              >
                {t('common.signUp')}
              </Link>
              .
            </p>
          )}
          <p className='px-8 text-center text-sm text-muted-foreground'>
            {t('auth.agreeTerms')}{' '}
            <a
              href='/terms'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('auth.termsOfService')}
            </a>{' '}
            {t('auth.and')}{' '}
            <a
              href='/privacy'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('auth.privacyPolicy')}
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
