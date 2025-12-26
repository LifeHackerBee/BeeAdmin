import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { supabase, checkSupabaseConfig } from '@/lib/supabase'
import { useTranslation } from '@/lib/i18n/use-translation'
import type { TranslationKey } from '@/lib/i18n/translations'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { authConfig } from '@/config/auth'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

// 动态创建 schema，因为翻译是动态的
const createFormSchema = (t: (key: TranslationKey) => string) => {
  return z.object({
    email: z.email({
      error: (iss) => (iss.input === '' ? t('auth.error.pleaseEnterEmail') : undefined),
    }),
    password: z
      .string()
      .min(1, t('auth.error.pleaseEnterPassword'))
      .min(7, t('auth.error.passwordMinLength')),
  })
}

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const config = checkSupabaseConfig()
  const { t } = useTranslation()

  const formSchema = createFormSchema(t)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!config.isValid) {
      toast.error(t('auth.error.supabaseNotConfigured'))
      return
    }

    setIsLoading(true)

    try {
      const email = data.email.trim().toLowerCase()
      const password = data.password

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error(t('auth.error.invalidCredentials'))
        } else if (error.message.includes('Email not confirmed')) {
          toast.error(t('auth.error.emailNotConfirmed'))
        } else if (error.message.includes('User not found')) {
          toast.error(t('auth.error.userNotFound'))
        } else {
          toast.error(error.message || t('auth.error.loginFailed'))
        }
        return
      }

      if (authData.session && authData.user) {
        const user = {
          id: authData.user.id,
          email: authData.user.email || '',
          name: authData.user.user_metadata?.name || authData.user.user_metadata?.full_name,
          avatar: authData.user.user_metadata?.avatar_url,
          role: authData.user.user_metadata?.role || ['user'],
        }

        auth.setUser(user)
        auth.setSession(authData.session)

        // 处理重定向路径：确保是字符串且格式正确
        let targetPath: string = '/'
        if (redirectTo && typeof redirectTo === 'string') {
          try {
            // 如果是完整 URL，提取路径部分
            if (redirectTo.startsWith('http://') || redirectTo.startsWith('https://')) {
              const url = new URL(redirectTo)
              targetPath = url.pathname + url.search
            } else {
              // 如果是路径，直接使用
              targetPath = redirectTo
            }
            // 确保路径以 / 开头
            if (!targetPath.startsWith('/')) {
              targetPath = '/' + targetPath
            }
          } catch {
            // 如果解析失败，使用默认路径
            targetPath = '/'
          }
        }

        // 确保 targetPath 是字符串（双重检查）
        const finalPath = typeof targetPath === 'string' ? targetPath : '/'
        
        // 确保 finalPath 是有效的字符串路径
        if (typeof finalPath !== 'string' || finalPath.length === 0) {
          console.error('Invalid redirect path:', finalPath, 'type:', typeof finalPath)
          navigate({ to: '/', replace: true })
        } else {
          navigate({ to: finalPath, replace: true })
        }
        
        toast.success(`${t('auth.welcomeBack')}, ${data.email}!`)
      }
    } catch (error: any) {
      toast.error(error.message || t('auth.error.invalidCredentialsGeneric'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.email')}</FormLabel>
              <FormControl>
                <Input placeholder={t('auth.emailPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>{t('common.password')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder={t('auth.passwordPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
              {authConfig.allowForgotPassword && (
                <Link
                  to='/forgot-password'
                  className='absolute end-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75'
                >
                  {t('common.forgotPassword')}
                </Link>
              )}
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          {t('common.signIn')}
        </Button>
      </form>
    </Form>
  )
}
