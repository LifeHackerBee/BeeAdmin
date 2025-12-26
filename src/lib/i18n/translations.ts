export type Language = 'zh' | 'en'

export const translations = {
  en: {
    // Common
    'common.signIn': 'Sign in',
    'common.signUp': 'Sign up',
    'common.signOut': 'Sign out',
    'common.email': 'Email',
    'common.password': 'Password',
    'common.confirmPassword': 'Confirm Password',
    'common.forgotPassword': 'Forgot password?',
    'common.createAccount': 'Create Account',
    'common.welcome': 'Welcome',
    'common.dashboard': 'Dashboard',
    'common.settings': 'Settings',
    'common.users': 'Users',
    'common.tasks': 'Tasks',
    'common.apps': 'Apps',
    'common.chats': 'Chats',
    'common.beeai': 'BeeAI',
    'common.helpCenter': 'Help Center',
    'common.goBack': 'Go Back',
    'common.backToHome': 'Back to Home',
    'common.learnMore': 'Learn more',
    
    // Auth
    'auth.signInTitle': 'Sign in',
    'auth.signInDescription': 'Enter your email and password below to log into your account',
    'auth.signUpTitle': 'Sign up',
    'auth.signUpDescription': 'Enter your information to create your account',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.emailPlaceholder': 'name@example.com',
    'auth.passwordPlaceholder': '********',
    'auth.welcomeBack': 'Welcome back',
    'auth.accountCreated': 'Account created successfully!',
    'auth.checkEmail': 'Please check your email to confirm your account.',
    'auth.termsOfService': 'Terms of Service',
    'auth.privacyPolicy': 'Privacy Policy',
    'auth.agreeTerms': 'By clicking sign in, you agree to our',
    'auth.and': 'and',
    'auth.orContinueWith': 'Or continue with',
    
    // Auth Errors
    'auth.error.supabaseNotConfigured': 'Supabase is not configured. Please check the console for configuration instructions.',
    'auth.error.invalidCredentials': 'Email or password is incorrect, please check and try again',
    'auth.error.emailNotConfirmed': 'Please verify your email first. Check your inbox (including spam)',
    'auth.error.userNotFound': 'User does not exist, please sign up first',
    'auth.error.loginFailed': 'Login failed, please try again later',
    'auth.error.signupFailed': 'Failed to create account. Please try again.',
    'auth.error.invalidCredentialsGeneric': 'Login failed, please check your credentials.',
    'auth.error.pleaseEnterEmail': 'Please enter your email',
    'auth.error.pleaseEnterPassword': 'Please enter your password',
    'auth.error.passwordMinLength': 'Password must be at least 7 characters long',
    'auth.error.pleaseConfirmPassword': 'Please confirm your password',
    'auth.error.passwordsDontMatch': "Passwords don't match.",
    
    // Error Pages
    'error.403.title': 'Access Forbidden',
    'error.403.description': "You don't have necessary permission to view this resource.",
    'error.404.title': "Oops! Page Not Found!",
    'error.404.description': "It seems like the page you're looking for does not exist or might have been removed.",
    'error.401.title': 'Unauthorized Access',
    'error.401.description': 'Please log in with the appropriate credentials to access this resource.',
    'error.500.title': "Oops! Something went wrong :')",
    'error.500.description': 'We apologize for the inconvenience. Please try again later.',
    'error.503.title': 'Website is under maintenance!',
    'error.503.description': "The site is not available at the moment. We'll be back online shortly.",
    
    // Theme
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
    
    // Language
    'language.chinese': '中文',
    'language.english': 'English',
  },
  zh: {
    // Common
    'common.signIn': '登录',
    'common.signUp': '注册',
    'common.signOut': '退出登录',
    'common.email': '邮箱',
    'common.password': '密码',
    'common.confirmPassword': '确认密码',
    'common.forgotPassword': '忘记密码？',
    'common.createAccount': '创建账号',
    'common.welcome': '欢迎',
    'common.dashboard': '仪表板',
    'common.settings': '设置',
    'common.users': '用户',
    'common.tasks': '任务',
    'common.apps': '应用',
    'common.chats': '聊天',
    'common.beeai': 'BeeAI',
    'common.helpCenter': '帮助中心',
    'common.goBack': '返回',
    'common.backToHome': '返回首页',
    'common.learnMore': '了解更多',
    
    // Auth
    'auth.signInTitle': '登录',
    'auth.signInDescription': '请输入您的邮箱和密码以登录您的账户',
    'auth.signUpTitle': '注册',
    'auth.signUpDescription': '请输入您的信息以创建账户',
    'auth.alreadyHaveAccount': '已有账号？',
    'auth.dontHaveAccount': '没有账号？',
    'auth.emailPlaceholder': 'name@example.com',
    'auth.passwordPlaceholder': '********',
    'auth.welcomeBack': '欢迎回来',
    'auth.accountCreated': '账号创建成功！',
    'auth.checkEmail': '请检查您的邮箱以确认账号。',
    'auth.termsOfService': '服务条款',
    'auth.privacyPolicy': '隐私政策',
    'auth.agreeTerms': '点击登录即表示您同意我们的',
    'auth.and': '和',
    'auth.orContinueWith': '或使用以下方式继续',
    
    // Auth Errors
    'auth.error.supabaseNotConfigured': 'Supabase 未配置。请检查控制台获取配置说明。',
    'auth.error.invalidCredentials': '邮箱或密码错误，请检查后重试',
    'auth.error.emailNotConfirmed': '请先验证邮箱。检查你的邮箱收件箱（包括垃圾邮件）',
    'auth.error.userNotFound': '用户不存在，请先注册',
    'auth.error.loginFailed': '登录失败，请稍后重试',
    'auth.error.signupFailed': '注册失败，请稍后重试。',
    'auth.error.invalidCredentialsGeneric': '登录失败，请检查你的凭据。',
    'auth.error.pleaseEnterEmail': '请输入邮箱地址',
    'auth.error.pleaseEnterPassword': '请输入密码',
    'auth.error.passwordMinLength': '密码长度至少为7个字符',
    'auth.error.pleaseConfirmPassword': '请确认密码',
    'auth.error.passwordsDontMatch': '两次输入的密码不匹配。',
    
    // Error Pages
    'error.403.title': '访问被禁止',
    'error.403.description': '您没有访问此资源的必要权限。',
    'error.404.title': '页面未找到！',
    'error.404.description': '您要查找的页面似乎不存在或已被删除。',
    'error.401.title': '未授权访问',
    'error.401.description': '请使用适当的凭据登录以访问此资源。',
    'error.500.title': "出错了 :')",
    'error.500.description': '我们为造成的不便深表歉意。请稍后再试。',
    'error.503.title': '网站正在维护中！',
    'error.503.description': '网站目前不可用。我们很快就会恢复在线。',
    
    // Theme
    'theme.light': '浅色',
    'theme.dark': '深色',
    'theme.system': '跟随系统',
    
    // Language
    'language.chinese': '中文',
    'language.english': 'English',
  },
} as const

export type TranslationKey = keyof typeof translations.en

