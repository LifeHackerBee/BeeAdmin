import { createClient } from '@supabase/supabase-js'
import { checkSupabaseConfig } from './supabase-config'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 检查配置
const config = checkSupabaseConfig()

if (!config.isValid) {
  if (!import.meta.env.DEV) {
    throw new Error('Supabase 环境变量未配置。请检查 .env 文件。')
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase 环境变量未配置。请检查 .env 文件。')
}

if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  throw new Error(`VITE_SUPABASE_URL 格式错误: ${supabaseUrl}。应以 https:// 开头`)
}

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// 导出配置检查函数供组件使用
export { checkSupabaseConfig }

