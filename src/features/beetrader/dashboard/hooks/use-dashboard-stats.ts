import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

// 后端统一聚合接口的返回结构（替代原先前端直连 Supabase 的 5 组查询）
interface DashboardStatsResponse {
  success: boolean
  backtest: {
    totalCount: number
    runningCount: number
    completedCount: number
    summary: {
      totalTestAmount: number
      averageLeverage: number
      averageIntervalSeconds: number
      averageDurationSeconds: number | null
      totalTracks: number
    }
    recentTasks: Array<Record<string, unknown>>
  }
  trader_analysis: {
    totalCount: number
    typeDistribution: Record<string, number>
    signalDistribution: Record<string, number>
  }
  wallet_event: {
    totalCount: number
    todayCount: number
    eventTypeDistribution: Record<string, number>
    recentEvents: Array<Record<string, unknown>>
  }
  tracker_task: {
    totalCount: number
    runningCount: number
    statusDistribution: Record<string, number>
    summary: {
      totalChecks: number
      totalSuccess: number
      totalErrors: number
      totalEvents: number
    }
  }
  wallets: {
    totalCount: number
    typeDistribution: Record<string, number>
    totalVolume: number
    recentWallets: Array<Record<string, unknown>>
  }
}

// 主 Hook —— 一次请求后端聚合接口，拆成原有的 5 个字段供组件消费
export function useDashboardStats() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  const isEnabled = !loading && !!user

  const query = useQuery({
    queryKey: ['dashboard', 'beetrader-stats'],
    queryFn: () =>
      hyperliquidApiGet<DashboardStatsResponse>('/api/beetrader/dashboard/stats'),
    enabled: isEnabled,
    refetchInterval: isEnabled ? 15000 : false,
  })

  const d = query.data

  return {
    backtest: d?.backtest,
    traderAnalysis: d?.trader_analysis,
    walletEvent: d?.wallet_event,
    trackerTask: d?.tracker_task,
    wallets: d?.wallets,
    isLoading: query.isLoading,
  }
}
