import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AxiosError } from 'axios'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n/use-translation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getHyperliquidApiBaseUrl } from '@/lib/hyperliquid-api-client'
import { setToken } from '@/components/auth-bridge'
import { useAuthStore } from '@/stores/auth-store'

interface UserAuthFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: {
    id: string
    email: string
    full_name?: string
    roles?: string[]
    allowed_modules?: string[]
  }
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  // 已登录却停留在登录页（例如直接访问 /sign-in），直接回到目标页
  useEffect(() => {
    const { user } = useAuthStore.getState()
    if (user && typeof window !== 'undefined') {
      window.location.replace(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/')
    }
  }, [redirectTo])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      toast.error('请输入邮箱和密码')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${getHyperliquidApiBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.detail ?? `登录失败（${res.status}）`)
        return
      }
      const login = data as LoginResponse
      setToken(login.access_token)
      // 立即填充 auth-store，让路由守卫放行
      const store = useAuthStore.getState()
      store.setUser({
        id: login.user.id,
        email: login.user.email ?? '',
        name: login.user.full_name || login.user.email,
        role: login.user.roles ?? ['user'],
        customPermissions: [],
        allowedModules: login.user.allowed_modules ?? [],
        isActive: true,
        isVerified: true,
      })
      store.setSession({ user: { id: login.user.id, email: login.user.email } })
      navigate({ to: redirectTo && redirectTo.startsWith('/') ? redirectTo : '/' })
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.detail ?? '登录失败，请稍后重试')
      } else {
        toast.error('登录失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      className={cn('grid gap-3', className)}
      onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        void handleLogin(e)
      }}
      {...props}
    >
      <div className='grid gap-2'>
        <Label htmlFor='email'>邮箱</Label>
        <Input
          id='email'
          type='email'
          placeholder='you@example.com'
          autoComplete='username'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      <div className='grid gap-2'>
        <Label htmlFor='password'>密码</Label>
        <Input
          id='password'
          type='password'
          placeholder='••••••••'
          autoComplete='current-password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      <Button type='submit' disabled={loading} className='mt-1'>
        {loading ? <Loader2 className='animate-spin' /> : <LogIn />}
        {t('common.signIn')}
      </Button>
    </form>
  )
}
