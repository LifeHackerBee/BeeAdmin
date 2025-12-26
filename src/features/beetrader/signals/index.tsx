import { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Fake data
const signals = [
  {
    id: '1',
    symbol: 'ETH/USDT',
    signalType: '买入',
    strength: '强',
    strengthValue: 85,
    timestamp: '2024-12-24 14:30:25',
    price: '$2,345.67',
    reason: '技术指标突破 + 巨鲸增持',
    status: 'active',
  },
  {
    id: '2',
    symbol: 'BTC/USDT',
    signalType: '买入',
    strength: '中',
    strengthValue: 65,
    timestamp: '2024-12-24 13:15:10',
    price: '$42,123.45',
    reason: 'RSI 超卖反弹',
    status: 'active',
  },
  {
    id: '3',
    symbol: 'SOL/USDT',
    signalType: '买入',
    strength: '强',
    strengthValue: 90,
    timestamp: '2024-12-24 12:45:33',
    price: '$98.76',
    reason: '成交量放大 + 突破阻力位',
    status: 'expired',
  },
  {
    id: '4',
    symbol: 'BNB/USDT',
    signalType: '买入',
    strength: '弱',
    strengthValue: 45,
    timestamp: '2024-12-24 11:20:15',
    price: '$312.34',
    reason: '轻微反弹信号',
    status: 'active',
  },
  {
    id: '5',
    symbol: 'MATIC/USDT',
    signalType: '买入',
    strength: '中',
    strengthValue: 70,
    timestamp: '2024-12-24 10:05:42',
    price: '$0.89',
    reason: 'MACD 金叉',
    status: 'active',
  },
]

export function TradingSignals() {
  const [searchTerm, setSearchTerm] = useState('')
  const [strengthFilter, setStrengthFilter] = useState<string>('all')

  const filteredSignals = signals.filter((signal) => {
    const matchesSearch =
      signal.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      signal.reason.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStrength =
      strengthFilter === 'all' ||
      (strengthFilter === 'strong' && signal.strengthValue >= 75) ||
      (strengthFilter === 'medium' && signal.strengthValue >= 50 && signal.strengthValue < 75) ||
      (strengthFilter === 'weak' && signal.strengthValue < 50)

    return matchesSearch && matchesStrength
  })

  const getStrengthBadgeVariant = (strength: string) => {
    switch (strength) {
      case '强':
        return 'default'
      case '中':
        return 'secondary'
      case '弱':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-xl font-semibold'>交易信号</h2>
        <p className='text-sm text-muted-foreground'>
          实时监控市场买入信号，及时把握交易机会
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>信号列表</CardTitle>
          <CardDescription>
            共 {signals.length} 个信号，{signals.filter(s => s.status === 'active').length} 个活跃中
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='mb-4 flex flex-col gap-4 sm:flex-row'>
            <div className='relative flex-1'>
              <SearchIcon className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='搜索交易对或原因...'
                className='pl-8'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={strengthFilter} onValueChange={setStrengthFilter}>
              <SelectTrigger className='w-full sm:w-40'>
                <SelectValue placeholder='信号强度' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部强度</SelectItem>
                <SelectItem value='strong'>强 (≥75)</SelectItem>
                <SelectItem value='medium'>中 (50-74)</SelectItem>
                <SelectItem value='weak'>弱 (&lt;50)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>交易对</TableHead>
                <TableHead>信号类型</TableHead>
                <TableHead>信号强度</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>出现时间</TableHead>
                <TableHead>信号原因</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSignals.map((signal) => (
                <TableRow key={signal.id}>
                  <TableCell className='font-medium'>{signal.symbol}</TableCell>
                  <TableCell>
                    <Badge variant='default' className='bg-green-500'>
                      {signal.signalType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <Badge variant={getStrengthBadgeVariant(signal.strength)}>
                        {signal.strength}
                      </Badge>
                      <span className='text-xs text-muted-foreground'>
                        ({signal.strengthValue})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className='font-semibold'>{signal.price}</TableCell>
                  <TableCell className='text-sm'>{signal.timestamp}</TableCell>
                  <TableCell className='max-w-xs truncate' title={signal.reason}>
                    {signal.reason}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={signal.status === 'active' ? 'default' : 'secondary'}
                    >
                      {signal.status === 'active' ? '活跃' : '已过期'}
                    </Badge>
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

