import { z } from 'zod'

// 钱包类型枚举
export const walletTypes = ['whale', 'high_win_rate', 'smart_money', 'institution', 'trader', 'other'] as const
export type WalletType = (typeof walletTypes)[number]

// 巨鲸钱包数据模型
export const walletSchema = z.object({
  id: z.string(),
  address: z.string().min(1, '钱包地址不能为空'),
  note: z.string().optional().default(''),
  type: z.enum(walletTypes).optional().nullable(),
  volume: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
})

export type Wallet = z.infer<typeof walletSchema>
