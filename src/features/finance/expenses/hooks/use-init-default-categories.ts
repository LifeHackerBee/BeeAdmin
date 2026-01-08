import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// 初始化默认分类（如果需要手动触发，创建共享的分类）
export function useInitDefaultCategories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // 获取当前用户 ID（用于记录创建者）
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        throw new Error('未登录')
      }

      // 调用 Supabase 函数来初始化默认分类（共享给所有用户）
      const { data, error } = await supabase.rpc('init_default_expense_categories', {
        target_user_id: sessionData.session.user.id,
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] })
      toast.success('默认分类已初始化')
    },
    onError: (error: Error) => {
      toast.error(`初始化失败: ${error.message}`)
    },
  })
}

