import { Wallet, TrendingUp, Users, Building2, Trophy, Sparkles } from 'lucide-react'
import { type WalletType } from './schema'

// 钱包类型配置
export const walletTypes: Array<{
  value: WalletType
  label: string
  icon: typeof Wallet
}> = [
  {
    value: 'whale',
    label: '巨鲸钱包',
    icon: TrendingUp,
  },
  {
    value: 'high_win_rate',
    label: '高胜率钱包',
    icon: Trophy,
  },
  {
    value: 'smart_money',
    label: 'Smart Money',
    icon: Sparkles,
  },
  {
    value: 'institution',
    label: '机构',
    icon: Building2,
  },
  {
    value: 'trader',
    label: '交易员',
    icon: Users,
  },
  {
    value: 'other',
    label: '其他',
    icon: Wallet,
  },
]

// 获取钱包类型标签
export function getWalletTypeLabel(type: WalletType | null | undefined): string {
  if (!type) return '未分类'
  return walletTypes.find((t) => t.value === type)?.label || '未知'
}
