import { useState } from 'react'
import { Search as SearchIcon, Eye, Copy } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Fake data
const strategies = [
  {
    id: '1',
    name: 'DCA 定投策略',
    category: '定投',
    description: '定期定额投资，降低市场波动影响',
    totalReturn: 15.6,
    sharpeRatio: 1.8,
    maxDrawdown: -8.2,
    winRate: 65.5,
    trades: 120,
    status: 'active',
    author: '系统',
  },
  {
    id: '2',
    name: '网格交易策略',
    category: '量化',
    description: '在价格区间内设置买卖网格，自动交易',
    totalReturn: 22.3,
    sharpeRatio: 2.1,
    maxDrawdown: -12.5,
    winRate: 58.3,
    trades: 450,
    status: 'active',
    author: '社区',
  },
  {
    id: '3',
    name: '趋势跟踪策略',
    category: '趋势',
    description: '跟随市场趋势，顺势而为',
    totalReturn: 18.9,
    sharpeRatio: 1.6,
    maxDrawdown: -15.3,
    winRate: 55.2,
    trades: 89,
    status: 'active',
    author: '系统',
  },
  {
    id: '4',
    name: '均值回归策略',
    category: '套利',
    description: '利用价格偏离均值的回归特性',
    totalReturn: 12.4,
    sharpeRatio: 1.4,
    maxDrawdown: -6.8,
    winRate: 62.1,
    trades: 234,
    status: 'active',
    author: '社区',
  },
  {
    id: '5',
    name: '动量突破策略',
    category: '趋势',
    description: '捕捉价格突破关键阻力位的动量',
    totalReturn: 28.7,
    sharpeRatio: 2.3,
    maxDrawdown: -18.9,
    winRate: 52.8,
    trades: 67,
    status: 'active',
    author: '系统',
  },
  {
    id: '6',
    name: '套利策略',
    category: '套利',
    description: '利用不同交易所价差进行套利',
    totalReturn: 8.5,
    sharpeRatio: 1.2,
    maxDrawdown: -3.2,
    winRate: 78.5,
    trades: 890,
    status: 'active',
    author: '社区',
  },
]

export function TradingStrategies() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filteredStrategies = strategies.filter((strategy) => {
    const matchesSearch =
      strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      strategy.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || strategy.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(strategies.map(s => s.category)))

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-xl font-semibold'>交易策略库</h2>
        <p className='text-sm text-muted-foreground'>
          浏览和选择适合的交易策略，查看历史表现和回测数据
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>策略列表</CardTitle>
          <CardDescription>
            共 {strategies.length} 个策略可供选择
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='mb-4 flex flex-col gap-4 sm:flex-row'>
            <div className='relative flex-1'>
              <SearchIcon className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='搜索策略名称或描述...'
                className='pl-8'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className='w-full sm:w-40'>
                <SelectValue placeholder='策略分类' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部分类</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>策略名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>总收益率</TableHead>
                <TableHead>夏普比率</TableHead>
                <TableHead>最大回撤</TableHead>
                <TableHead>胜率</TableHead>
                <TableHead>交易次数</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStrategies.map((strategy) => (
                <TableRow key={strategy.id}>
                  <TableCell>
                    <div>
                      <div className='font-medium'>{strategy.name}</div>
                      <div className='text-xs text-muted-foreground'>
                        {strategy.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant='secondary'>{strategy.category}</Badge>
                  </TableCell>
                  <TableCell className='font-semibold text-green-600'>
                    +{strategy.totalReturn}%
                  </TableCell>
                  <TableCell>{strategy.sharpeRatio}</TableCell>
                  <TableCell className='text-red-600'>
                    {strategy.maxDrawdown}%
                  </TableCell>
                  <TableCell>{strategy.winRate}%</TableCell>
                  <TableCell>{strategy.trades}</TableCell>
                  <TableCell>{strategy.author}</TableCell>
                  <TableCell>
                    <div className='flex gap-2'>
                      <Button variant='ghost' size='sm'>
                        <Eye className='h-4 w-4' />
                      </Button>
                      <Button variant='ghost' size='sm'>
                        <Copy className='h-4 w-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

