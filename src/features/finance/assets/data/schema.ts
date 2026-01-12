import { z } from 'zod'

// 资产类型枚举
export const assetTypeSchema = z.enum([
  'cash_equivalent', // 现金/等价物
  'fixed_income', // 固收
  'equity', // 权益
  'alternative', // 另类投资
  'property_owner_occupied', // 房产（自住）
  'property_investment', // 房产（投资）
  'business', // 经营性资产
  'receivables', // 应收与预付
  'retirement_insurance', // 养老/公积金/保险现金价值
  'other', // 其他（消费品/收藏，折价）
])

// 资产状态枚举
export const assetStatusSchema = z.enum([
  'active', // 活跃
  'sold', // 已出售
  'liquidated', // 已清算
  'other', // 其他
])

// 资产数据模型（匹配 Supabase assets 表）
export const assetSchema = z.object({
  id: z.number(),
  user_id: z.string().uuid().optional(),
  name: z.string().min(1, '资产名称不能为空'),
  type: assetTypeSchema,
  category: z.string().nullable().optional(), // 子分类，如"股票"、"债券"等
  current_value: z.number().min(0, '当前价值不能为负'),
  purchase_value: z.number().min(0, '购买价值不能为负').optional(), // 购买价值（可选）
  purchase_date: z.string().nullable().optional(), // 购买日期
  currency: z.string().default('CNY'),
  status: assetStatusSchema.default('active'),
  description: z.string().nullable().optional(), // 描述
  location: z.string().nullable().optional(), // 位置（适用于房产等）
  institution: z.string().nullable().optional(), // 机构（适用于银行账户、保险等）
  account_number: z.string().nullable().optional(), // 账户号码
  note: z.string().nullable().optional(), // 备注
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export type Asset = z.infer<typeof assetSchema>
export type AssetType = z.infer<typeof assetTypeSchema>
export type AssetStatus = z.infer<typeof assetStatusSchema>

// 数据库返回的类型（Supabase 返回的格式）
export type AssetRow = {
  id: number
  user_id?: string
  name: string
  type: string
  category?: string | null
  current_value: number | string
  purchase_value?: number | string | null
  purchase_date?: string | null
  currency: string
  status: string
  description?: string | null
  location?: string | null
  institution?: string | null
  account_number?: string | null
  note?: string | null
  created_at?: string
  updated_at?: string
}

// 资产类型显示名称映射
export const assetTypeLabels: Record<AssetType, string> = {
  cash_equivalent: '现金/等价物',
  fixed_income: '固收',
  equity: '权益',
  alternative: '另类投资',
  property_owner_occupied: '房产（自住）',
  property_investment: '房产（投资）',
  business: '经营性资产',
  receivables: '应收与预付',
  retirement_insurance: '养老/公积金/保险现金价值',
  other: '其他',
}

// 资产状态显示名称映射
export const assetStatusLabels: Record<AssetStatus, string> = {
  active: '活跃',
  sold: '已出售',
  liquidated: '已清算',
  other: '其他',
}

// 资产类型分组
export const assetTypeGroups = {
  '现金类': ['cash_equivalent'],
  '投资资产': ['fixed_income', 'equity', 'alternative'],
  '房产': ['property_owner_occupied', 'property_investment'],
  '其他资产': ['business', 'receivables', 'retirement_insurance', 'other'],
} as const

// 子分类选项（根据资产类型）
export const assetCategoryOptions: Partial<Record<AssetType, string[]>> = {
  cash_equivalent: ['现金', '活期存款', '定期存款', '货币基金', '其他'],
  fixed_income: ['国债', '企业债', '可转债', '债券基金', '其他'],
  equity: ['股票', '股票基金', 'ETF', '其他'],
  alternative: ['私募股权', '对冲基金', '商品', '其他'],
  property_owner_occupied: ['住宅', '公寓', '其他'],
  property_investment: ['住宅', '商业地产', '其他'],
  business: ['公司股权', '设备', '其他'],
  receivables: ['应收账款', '预付款', '其他'],
  retirement_insurance: ['养老保险', '公积金', '商业保险', '其他'],
  other: ['消费品', '收藏品', '其他'],
}
