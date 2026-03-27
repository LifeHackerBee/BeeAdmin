import { useState, useCallback, useEffect, useRef } from 'react'
import { hyperliquidApiGet, hyperliquidApiPost } from '@/lib/hyperliquid-api-client'

export interface SimAccount {
  id: number
  account_id: string
  balance: number
  initial_balance: number
  equity?: number
  unrealized_pnl?: number
  total_pnl: number
  total_trades: number
  win_count: number
  loss_count: number
  taker_fee_rate: number
  maker_fee_rate: number
}

export interface SimPosition {
  id: number
  coin: string
  direction: 'long' | 'short'
  entry_price: number
  size_usd: number
  size_coin: number
  leverage: number
  take_profit: number | null
  stop_loss: number | null
  current_price?: number
  unrealized_pnl?: number
  unrealized_pnl_pct?: number
  status: string
  created_at: string
}

export interface SimOrder {
  id: number
  coin: string
  side: string
  price: number
  size_usd: number
  leverage: number
  status: string
  order_type: string
  created_at: string
}

export interface SimFill {
  id: number
  coin: string
  side: string
  price: number
  size_usd: number
  fee: number
  pnl?: number
  order_type: string
  created_at: string
}

export function useSimExchange(accountId: string = 'default') {
  const [account, setAccount] = useState<SimAccount | null>(null)
  const [positions, setPositions] = useState<SimPosition[]>([])
  const [orders, setOrders] = useState<SimOrder[]>([])
  const [fills, setFills] = useState<SimFill[]>([])
  const [loading, setLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAccount = useCallback(async () => {
    try {
      const res = await hyperliquidApiGet<{ success: boolean; account: SimAccount; positions: SimPosition[] }>(
        `/api/sim_exchange/account?account_id=${accountId}`
      )
      if (res.success) {
        setAccount(res.account)
        setPositions(res.positions)
      }
    } catch { /* */ }
  }, [accountId])

  const fetchOrders = useCallback(async () => {
    try {
      const res = await hyperliquidApiGet<{ success: boolean; orders: SimOrder[] }>(
        `/api/sim_exchange/orders?account_id=${accountId}`
      )
      if (res.success) setOrders(res.orders)
    } catch { /* */ }
  }, [accountId])

  const fetchFills = useCallback(async () => {
    try {
      const res = await hyperliquidApiGet<{ success: boolean; fills: SimFill[] }>(
        `/api/sim_exchange/fills?account_id=${accountId}&limit=20`
      )
      if (res.success) setFills(res.fills)
    } catch { /* */ }
  }, [accountId])

  const refetch = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchAccount(), fetchOrders(), fetchFills()])
    setLoading(false)
  }, [fetchAccount, fetchOrders, fetchFills])

  // 初始加载 + 5s 轮询
  useEffect(() => {
    refetch()
    pollRef.current = setInterval(fetchAccount, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [refetch, fetchAccount])

  // 操作方法
  const marketOrder = useCallback(async (data: {
    coin: string; direction: string; size_usd: number;
    leverage?: number; take_profit?: number; stop_loss?: number;
  }) => {
    const res = await hyperliquidApiPost<{ success: boolean; balance: number }>(
      '/api/sim_exchange/market_order',
      { ...data, account_id: accountId },
    )
    await refetch()
    return res
  }, [accountId, refetch])

  const closePosition = useCallback(async (coin: string, ratio: number = 1) => {
    const res = await hyperliquidApiPost<{ success: boolean; balance: number }>(
      '/api/sim_exchange/close_position',
      { coin, ratio, account_id: accountId },
    )
    await refetch()
    return res
  }, [accountId, refetch])

  const limitOrder = useCallback(async (data: {
    coin: string; side: string; price: number; size_usd: number;
    leverage?: number; take_profit?: number; stop_loss?: number;
  }) => {
    const res = await hyperliquidApiPost<{ success: boolean }>('/api/sim_exchange/limit_order', { ...data, account_id: accountId })
    await refetch()
    return res
  }, [accountId, refetch])

  const cancelOrder = useCallback(async (orderId: number) => {
    const res = await hyperliquidApiPost<{ success: boolean }>('/api/sim_exchange/cancel_order', { order_id: orderId, account_id: accountId })
    await refetch()
    return res
  }, [accountId, refetch])

  const setBalance = useCallback(async (balance: number) => {
    await hyperliquidApiPost('/api/sim_exchange/set_balance', { balance, account_id: accountId })
    await refetch()
  }, [accountId, refetch])

  const updateTpSl = useCallback(async (positionId: number, tp: number | null, sl: number | null) => {
    await hyperliquidApiPost('/api/sim_exchange/update_tp_sl', {
      position_id: positionId,
      take_profit: tp ?? 0,
      stop_loss: sl ?? 0,
      account_id: accountId,
    })
    await refetch()
  }, [accountId, refetch])

  const resetAccount = useCallback(async () => {
    await hyperliquidApiPost(`/api/sim_exchange/reset?account_id=${accountId}`, {})
    await refetch()
  }, [accountId, refetch])

  return {
    account, positions, orders, fills, loading,
    refetch, marketOrder, closePosition, limitOrder, cancelOrder, setBalance, updateTpSl, resetAccount,
  }
}
