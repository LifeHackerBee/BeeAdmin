import { useQuery } from '@tanstack/react-query'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import { useAuthStore } from '@/stores/auth-store'
import { type Asset, assetSchema } from '../data/schema'

export function useAssets() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  return useQuery({
    queryKey: ['assets'],
    enabled: !loading && !!user, // 只有在已登录且不在加载状态时才执行查询
    queryFn: async () => {
      const data = await hyperliquidApiGet<Record<string, unknown>[]>('/api/finance/assets')

      const parseNumeric = (value: number | string | null | undefined): number => {
        if (value === null || value === undefined) return 0
        return typeof value === 'string' ? parseFloat(value) : value
      }

      const assets: Asset[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as number,
        user_id: row.user_id as string,
        name: row.name as string,
        type: row.type as Asset['type'],
        category: (row.category as string) || undefined,
        current_value: parseNumeric(row.current_value as number | string | null),
        purchase_value: row.purchase_value
          ? parseNumeric(row.purchase_value as number | string)
          : undefined,
        purchase_date: (row.purchase_date as string) || undefined,
        currency: (row.currency as string) || 'CNY',
        status: ((row.status as string) || 'active') as Asset['status'],
        description: (row.description as string) || undefined,
        location: (row.location as string) || undefined,
        institution: (row.institution as string) || undefined,
        account_number: (row.account_number as string) || undefined,
        note: (row.note as string) || undefined,
        created_at: (row.created_at as string) || undefined,
        updated_at: (row.updated_at as string) || undefined,
      }))

      return assets.map((asset) => {
        const result = assetSchema.safeParse(asset)
        if (result.success) return result.data
        console.warn('Asset validation failed:', result.error, asset)
        return asset
      })
    },
  })
}
