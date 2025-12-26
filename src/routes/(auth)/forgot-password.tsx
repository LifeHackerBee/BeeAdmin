import { createFileRoute, redirect } from '@tanstack/react-router'
import { ForgotPassword } from '@/features/auth/forgot-password'
import { authConfig } from '@/config/auth'

export const Route = createFileRoute('/(auth)/forgot-password')({
  beforeLoad: () => {
    // 如果配置不允许忘记密码功能，重定向到登录页面
    if (!authConfig.allowForgotPassword) {
      throw redirect({
        to: '/sign-in',
        search: {
          error: 'forgot_password_disabled',
        },
      })
    }
  },
  component: ForgotPassword,
})
