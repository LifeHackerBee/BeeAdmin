/**
 * 认证功能配置
 * 控制注册和忘记密码功能的可用性
 */
export const authConfig = {
  /**
   * 是否允许用户注册
   * 默认: false (不允许)
   */
  allowSignUp: import.meta.env.VITE_ALLOW_SIGNUP === 'true' || false,

  /**
   * 是否允许忘记密码功能
   * 默认: false (不允许)
   */
  allowForgotPassword: import.meta.env.VITE_ALLOW_FORGOT_PASSWORD === 'true' || false,
} as const

