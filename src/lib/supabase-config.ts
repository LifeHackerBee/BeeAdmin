/**
 * Supabase 配置检查工具
 */

export function checkSupabaseConfig(): {
  isValid: boolean
  missingVars: string[]
  message: string
} {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const missingVars: string[] = []
  
  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url') {
    missingVars.push('VITE_SUPABASE_URL')
  }
  if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
    missingVars.push('VITE_SUPABASE_ANON_KEY')
  }

  const isValid = missingVars.length === 0 && 
                  supabaseUrl?.startsWith('http') && 
                  supabaseAnonKey && 
                  supabaseAnonKey.length > 20

  const message = isValid
    ? ''
    : `
缺少或未正确配置 Supabase 环境变量: ${missingVars.join(', ')}

配置步骤：
1. 在项目根目录创建 .env 文件
2. 添加以下内容：
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here

3. 从 Supabase Dashboard 获取这些值：
   https://app.supabase.com/ > Settings > API

4. 重启开发服务器（pnpm run dev）
    `.trim()

  return { isValid, missingVars, message }
}

