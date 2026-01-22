import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { type Wallet } from '../data/schema'

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchWallets = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      // 转换数据格式以匹配前端 schema
      const formattedWallets: Wallet[] = (data || []).map((wallet) => ({
        id: wallet.id,
        address: wallet.address,
        note: wallet.note || '',
        type: wallet.type || null,
        volume: wallet.volume != null ? Number(wallet.volume) : null,
        createdAt: new Date(wallet.created_at),
        updatedAt: wallet.updated_at ? new Date(wallet.updated_at) : undefined,
      }))

      setWallets(formattedWallets)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('获取钱包列表失败'))
      console.error('Error fetching wallets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWallets()
  }, [])

  const createWallet = async (wallet: { address: string; note?: string; type?: Wallet['type']; volume?: number | null }) => {
    try {
      // 先检查地址是否已存在
      const { data: existingWallet, error: checkError } = await supabase
        .from('wallets')
        .select('id, address')
        .eq('address', wallet.address)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingWallet) {
        throw new Error(`钱包地址 ${wallet.address} 已存在，无法重复添加`)
      }

      const { data, error: createError } = await supabase
        .from('wallets')
        .insert({
          address: wallet.address,
          note: wallet.note || null,
          type: wallet.type || null,
          volume: wallet.volume ?? null,
        })
        .select()
        .single()

      if (createError) {
        // 处理唯一约束冲突
        if (createError.code === '23505') {
          throw new Error(`钱包地址 ${wallet.address} 已存在，无法重复添加`)
        }
        throw createError
      }

      // 刷新列表
      await fetchWallets()
      return data
    } catch (err) {
      const error = err instanceof Error ? err : new Error('创建钱包失败')
      console.error('Error creating wallet:', err)
      throw error
    }
  }

  const updateWallet = async (id: string, updates: Partial<Pick<Wallet, 'note' | 'type' | 'volume'>>) => {
    try {
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          note: updates.note || null,
          type: updates.type || null,
          volume: updates.volume ?? null,
        })
        .eq('id', id)

      if (updateError) {
        throw updateError
      }

      // 刷新列表
      await fetchWallets()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('更新钱包失败')
      console.error('Error updating wallet:', err)
      throw error
    }
  }

  const deleteWallet = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('wallets')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      // 刷新列表
      await fetchWallets()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('删除钱包失败')
      console.error('Error deleting wallet:', err)
      throw error
    }
  }

  const deleteWallets = async (ids: string[]) => {
    try {
      const { error: deleteError } = await supabase
        .from('wallets')
        .delete()
        .in('id', ids)

      if (deleteError) {
        throw deleteError
      }

      // 刷新列表
      await fetchWallets()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('批量删除钱包失败')
      console.error('Error deleting wallets:', err)
      throw error
    }
  }

  return {
    wallets,
    loading,
    error,
    refetch: fetchWallets,
    createWallet,
    updateWallet,
    deleteWallet,
    deleteWallets,
  }
}

