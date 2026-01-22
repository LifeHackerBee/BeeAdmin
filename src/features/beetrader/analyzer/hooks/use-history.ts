import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { type AnalyzeResponse } from './use-analyzer'

export interface TraderAnalysisRecord {
  id: number
  wallet_address: string
  analysis_days: number
  trader_type: string
  signal_strength: string | null
  risk_level: string | null
  account_value: number
  reason: string
  key_metrics: {
    account_value: number | null
    max_drawdown: number | null
    total_pnl: number | null
    maker_ratio: number | null
    leverage: number | null
  }
  data_quality: {
    has_portfolio: boolean
    has_user_state: boolean
    has_user_fees: boolean
    has_ledger: boolean
    has_funding: boolean
    errors: string[]
  }
  created_at: string
  updated_at: string
}

export function useHistory() {
  const [records, setRecords] = useState<TraderAnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('trader_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (fetchError) {
        throw fetchError
      }

      // 转换数据格式
      const formattedRecords: TraderAnalysisRecord[] = (data || []).map((record) => ({
        id: record.id,
        wallet_address: record.wallet_address,
        analysis_days: record.analysis_days,
        trader_type: record.trader_type,
        signal_strength: record.signal_strength,
        risk_level: record.risk_level,
        account_value: Number(record.account_value) || 0,
        reason: record.reason || '',
        key_metrics: record.key_metrics || {
          account_value: null,
          max_drawdown: null,
          total_pnl: null,
          maker_ratio: null,
          leverage: null,
        },
        data_quality: record.data_quality || {
          has_portfolio: false,
          has_user_state: false,
          has_user_fees: false,
          has_ledger: false,
          has_funding: false,
          errors: [],
        },
        created_at: record.created_at,
        updated_at: record.updated_at,
      }))

      setRecords(formattedRecords)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取历史记录失败')
      setError(error)
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const convertToAnalyzeResponse = (record: TraderAnalysisRecord): AnalyzeResponse => {
    return {
      success: true,
      address: record.wallet_address,
      analysis: {
        type: record.trader_type,
        signal_strength: record.signal_strength,
        risk_level: record.risk_level,
        account_value: record.account_value,
        reason: record.reason,
        key_metrics: record.key_metrics,
        data_quality: record.data_quality,
      },
    }
  }

  return {
    records,
    loading,
    error,
    refetch: fetchHistory,
    convertToAnalyzeResponse,
  }
}
