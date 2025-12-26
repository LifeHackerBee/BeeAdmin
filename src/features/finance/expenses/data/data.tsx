import {
  ShoppingCart,
  UtensilsCrossed,
  Car,
  Home,
  Heart,
  Gamepad2,
  Dumbbell,
} from 'lucide-react'

// 支出分类（匹配 Supabase 数据库中的分类）
export const categories = [
  {
    label: '餐饮',
    value: 'Food' as const,
    icon: UtensilsCrossed,
  },
  {
    label: '交通',
    value: 'Transport' as const,
    icon: Car,
  },
  {
    label: '购物',
    value: 'Shopping' as const,
    icon: ShoppingCart,
  },
  {
    label: '住房',
    value: 'Housing' as const,
    icon: Home,
  },
  {
    label: '健身',
    value: 'Workout' as const,
    icon: Dumbbell,
  },
  {
    label: '娱乐',
    value: 'Entertainment' as const,
    icon: Gamepad2,
  },
  {
    label: '其他',
    value: 'Others' as const,
    icon: Heart,
  },
]

// 币种选项
export const currencies = [
  { label: '人民币', value: 'CNY' },
  { label: '港币', value: 'HKD' },
  { label: '美元', value: 'USD' },
]

