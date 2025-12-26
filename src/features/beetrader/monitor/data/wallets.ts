import { faker } from '@faker-js/faker'
import { type Wallet } from './schema'

// Set a fixed seed for consistent data generation
faker.seed(12345)

// 生成随机的以太坊地址格式
function generateWalletAddress(): string {
  const chars = '0123456789abcdef'
  let address = '0x'
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)]
  }
  return address
}

// 示例备注列表
const sampleNotes = [
  '监控此钱包的交易活动，疑似巨鲸账户',
  '机构投资者钱包，关注其持仓变化',
  '知名交易员钱包，跟踪其交易策略',
  'DeFi协议相关钱包，监控资金流动',
  'NFT交易大户，关注其NFT交易动向',
  '链上数据分析显示异常活跃',
  '疑似项目方钱包，需要重点关注',
  '高价值资产持有者，监控资产变化',
]

export const wallets: Wallet[] = Array.from({ length: 20 }, (_, index) => {
  const createdAt = faker.date.past({ years: 1 })
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() })

  return {
    id: `WALLET-${String(index + 1).padStart(4, '0')}`,
    address: generateWalletAddress(),
    note: faker.helpers.arrayElement(sampleNotes),
    createdAt,
    updatedAt,
  }
})

