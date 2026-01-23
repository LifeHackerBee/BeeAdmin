import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// 获取 backtest_tracker_tasks 统计
async function getBacktestTrackerStats() {
  const [
    totalCountResult,
    runningCountResult,
    completedCountResult,
    recentTasksResult,
    summaryResult,
  ] = await Promise.all([
    supabase
      .from('backtest_tracker_tasks')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('backtest_tracker_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running'),
    supabase
      .from('backtest_tracker_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase
      .from('backtest_tracker_tasks')
      .select('id, task_name, wallet_address, coin, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('backtest_tracker_tasks')
      .select(
        'test_amount, test_leverage, track_interval_seconds, track_duration_seconds, total_tracks'
      ),
  ])

  const summaryRows = summaryResult.data || []
  const summaryTotals = summaryRows.reduce(
    (acc, task) => {
      const testAmount = Number(task.test_amount ?? 0)
      if (!Number.isNaN(testAmount)) {
        acc.totalTestAmount += testAmount
        acc.testAmountCount += 1
      }

      const leverage = Number(task.test_leverage ?? 0)
      if (!Number.isNaN(leverage) && leverage > 0) {
        acc.totalLeverage += leverage
        acc.leverageCount += 1
      }

      const interval = Number(task.track_interval_seconds ?? 0)
      if (!Number.isNaN(interval) && interval > 0) {
        acc.totalInterval += interval
        acc.intervalCount += 1
      }

      const duration = Number(task.track_duration_seconds ?? 0)
      if (!Number.isNaN(duration) && duration > 0) {
        acc.totalDuration += duration
        acc.durationCount += 1
      }

      const tracks = Number(task.total_tracks ?? 0)
      if (!Number.isNaN(tracks)) {
        acc.totalTracks += tracks
      }

      return acc
    },
    {
      totalTestAmount: 0,
      testAmountCount: 0,
      totalLeverage: 0,
      leverageCount: 0,
      totalInterval: 0,
      intervalCount: 0,
      totalDuration: 0,
      durationCount: 0,
      totalTracks: 0,
    }
  )

  const summary = {
    totalTestAmount: summaryTotals.totalTestAmount,
    averageLeverage: summaryTotals.leverageCount
      ? summaryTotals.totalLeverage / summaryTotals.leverageCount
      : 0,
    averageIntervalSeconds: summaryTotals.intervalCount
      ? summaryTotals.totalInterval / summaryTotals.intervalCount
      : 0,
    averageDurationSeconds: summaryTotals.durationCount
      ? summaryTotals.totalDuration / summaryTotals.durationCount
      : null,
    totalTracks: summaryTotals.totalTracks,
  }

  return {
    totalCount: totalCountResult.count || 0,
    runningCount: runningCountResult.count || 0,
    completedCount: completedCountResult.count || 0,
    summary,
    recentTasks: recentTasksResult.data || [],
  }
}

// 获取 trader_analysis 统计
async function getTraderAnalysisStats() {
  // 总分析数
  const { count: totalCount } = await supabase
    .from('trader_analysis')
    .select('*', { count: 'exact', head: true })

  // 按交易者类型统计
  const { data: typeDistribution } = await supabase
    .from('trader_analysis')
    .select('trader_type')
    .order('trader_type')

  const typeCount: Record<string, number> = {}
  typeDistribution?.forEach((item) => {
    typeCount[item.trader_type] = (typeCount[item.trader_type] || 0) + 1
  })

  // 按信号强度统计 (只统计 TRADER 和 WHALE)
  const { data: signalData } = await supabase
    .from('trader_analysis')
    .select('signal_strength')
    .in('trader_type', ['TRADER', 'WHALE'])
    .not('signal_strength', 'is', null)

  const signalCount: Record<string, number> = {}
  signalData?.forEach((item) => {
    if (item.signal_strength) {
      signalCount[item.signal_strength] =
        (signalCount[item.signal_strength] || 0) + 1
    }
  })

  return {
    totalCount: totalCount || 0,
    typeDistribution: typeCount,
    signalDistribution: signalCount,
  }
}

// 获取 wallet_state_event 统计
async function getWalletStateEventStats() {
  // 总事件数
  const { count: totalCount } = await supabase
    .from('wallet_state_event')
    .select('*', { count: 'exact', head: true })

  // 按事件类型统计
  const { data: eventTypes } = await supabase
    .from('wallet_state_event')
    .select('event_type')

  const eventTypeCount: Record<string, number> = {}
  eventTypes?.forEach((item) => {
    eventTypeCount[item.event_type] =
      (eventTypeCount[item.event_type] || 0) + 1
  })

  // 今日事件数
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count: todayCount } = await supabase
    .from('wallet_state_event')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  // 最近的事件
  const { data: recentEvents } = await supabase
    .from('wallet_state_event')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    totalCount: totalCount || 0,
    todayCount: todayCount || 0,
    eventTypeDistribution: eventTypeCount,
    recentEvents: recentEvents || [],
  }
}

// 获取 wallet_tracker_task 统计
async function getWalletTrackerTaskStats() {
  // 总任务数
  const { count: totalCount } = await supabase
    .from('wallet_tracker_task')
    .select('*', { count: 'exact', head: true })

  // 运行中的任务数
  const { count: runningCount } = await supabase
    .from('wallet_tracker_task')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'running')

  // 按状态统计
  const { data: statusData } = await supabase
    .from('wallet_tracker_task')
    .select('status')

  const statusCount: Record<string, number> = {}
  statusData?.forEach((item) => {
    statusCount[item.status] = (statusCount[item.status] || 0) + 1
  })

  // 获取统计汇总
  const { data: tasks } = await supabase
    .from('wallet_tracker_task')
    .select('check_count, success_count, error_count, total_events_count')

  const summary = tasks?.reduce(
    (acc, task) => ({
      totalChecks: acc.totalChecks + (task.check_count || 0),
      totalSuccess: acc.totalSuccess + (task.success_count || 0),
      totalErrors: acc.totalErrors + (task.error_count || 0),
      totalEvents: acc.totalEvents + (task.total_events_count || 0),
    }),
    { totalChecks: 0, totalSuccess: 0, totalErrors: 0, totalEvents: 0 }
  )

  return {
    totalCount: totalCount || 0,
    runningCount: runningCount || 0,
    statusDistribution: statusCount,
    summary: summary || {
      totalChecks: 0,
      totalSuccess: 0,
      totalErrors: 0,
      totalEvents: 0,
    },
  }
}

// 获取 wallets 统计
async function getWalletsStats() {
  // 总钱包数
  const { count: totalCount } = await supabase
    .from('wallets')
    .select('*', { count: 'exact', head: true })

  // 按类型统计
  const { data: typeData } = await supabase
    .from('wallets')
    .select('type')
    .not('type', 'is', null)

  const typeCount: Record<string, number> = {}
  typeData?.forEach((item) => {
    if (item.type) {
      typeCount[item.type] = (typeCount[item.type] || 0) + 1
    }
  })

  // 总体量统计
  const { data: volumeData } = await supabase
    .from('wallets')
    .select('volume')
    .not('volume', 'is', null)

  const totalVolume =
    volumeData?.reduce(
      (sum, item) => sum + (Number(item.volume) || 0),
      0
    ) || 0

  // 最近添加的钱包
  const { data: recentWallets } = await supabase
    .from('wallets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    totalCount: totalCount || 0,
    typeDistribution: typeCount,
    totalVolume,
    recentWallets: recentWallets || [],
  }
}

// 主 Hook
export function useDashboardStats() {
  const backtestQuery = useQuery({
    queryKey: ['dashboard', 'backtest_tracker_tasks'],
    queryFn: getBacktestTrackerStats,
    refetchInterval: 30000, // 30秒刷新一次
  })

  const traderAnalysisQuery = useQuery({
    queryKey: ['dashboard', 'trader_analysis'],
    queryFn: getTraderAnalysisStats,
    refetchInterval: 60000, // 60秒刷新一次
  })

  const walletEventQuery = useQuery({
    queryKey: ['dashboard', 'wallet_state_event'],
    queryFn: getWalletStateEventStats,
    refetchInterval: 10000, // 10秒刷新一次
  })

  const trackerTaskQuery = useQuery({
    queryKey: ['dashboard', 'wallet_tracker_task'],
    queryFn: getWalletTrackerTaskStats,
    refetchInterval: 30000, // 30秒刷新一次
  })

  const walletsQuery = useQuery({
    queryKey: ['dashboard', 'wallets'],
    queryFn: getWalletsStats,
    refetchInterval: 60000, // 60秒刷新一次
  })

  return {
    backtest: backtestQuery.data,
    traderAnalysis: traderAnalysisQuery.data,
    walletEvent: walletEventQuery.data,
    trackerTask: trackerTaskQuery.data,
    wallets: walletsQuery.data,
    isLoading:
      backtestQuery.isLoading ||
      traderAnalysisQuery.isLoading ||
      walletEventQuery.isLoading ||
      trackerTaskQuery.isLoading ||
      walletsQuery.isLoading,
  }
}
