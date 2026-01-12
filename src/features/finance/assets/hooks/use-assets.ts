import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { type Asset, assetSchema } from '../data/schema'

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // 转换数据格式，确保类型正确
      const assets: Asset[] = (data || []).map((row) => {
        // 处理 numeric 字段：可能是 string 或 number
        const parseNumeric = (value: number | string | null | undefined): number => {
          if (value === null || value === undefined) return 0
          return typeof value === 'string' ? parseFloat(value) : value
        }

        return {
          id: row.id,
          user_id: row.user_id,
          name: row.name,
          type: row.type as Asset['type'],
          category: row.category || undefined,
          current_value: parseNumeric(row.current_value),
          purchase_value: row.purchase_value ? parseNumeric(row.purchase_value) : undefined,
          purchase_date: row.purchase_date || undefined,
          currency: row.currency || 'CNY',
          status: (row.status || 'active') as Asset['status'],
          description: row.description || undefined,
          location: row.location || undefined,
          institution: row.institution || undefined,
          account_number: row.account_number || undefined,
          note: row.note || undefined,
          created_at: row.created_at || undefined,
          updated_at: row.updated_at || undefined,
        }
      })

      // 验证数据
      return assets.map((asset) => {
        const result = assetSchema.safeParse(asset)
        if (result.success) {
          return result.data
        } else {
          console.warn('Asset validation failed:', result.error, asset)
          return asset
        }
      })
    },
  })
}
