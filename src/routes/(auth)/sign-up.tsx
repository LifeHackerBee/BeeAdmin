import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignUp } from '@/features/auth/sign-up'
import { authConfig } from '@/config/auth'

export const Route = createFileRoute('/(auth)/sign-up')({
  beforeLoad: () => {
    // 如果配置不允许注册，重定向到登录页面
    if (!authConfig.allowSignUp) {
      throw redirect({
        to: '/sign-in',
        search: {
          error: 'signup_disabled',
        },
      })
    }
  },
  component: SignUp,
})
