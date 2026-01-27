import { ScanLine } from 'lucide-react'

export type AppCategory = 'tool' | 'all'

export interface App {
  name: string
  logo: React.ReactNode
  connected: boolean
  desc: string
  category: AppCategory
  rating?: number
  users?: string
  route?: string // 跳转路由
}

export const apps: App[] = [
  {
    name: 'Crawl4AI 爬虫',
    logo: <ScanLine className="h-6 w-6" />,
    connected: true,
    desc: '基于 Crawl4AI API 的智能爬取工具，支持 Markdown 清洗与 LLM 内容抽取',
    category: 'tool',
    rating: 4.9,
    users: '1万+',
    route: '/apps/crawler',
  },
]
