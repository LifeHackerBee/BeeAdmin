import { useMutation, useQueryClient } from '@tanstack/react-query'
import { hyperliquidApiPost } from '@/lib/hyperliquid-api-client'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

// 初始化默认分类（如果需要手动触发，创建共享的分类）
export function useInitDefaultCategories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('未登录')
      return hyperliquidApiPost('/api/finance/expense-categories/init-defaults', {
        user_id: userId,
      })
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
