import { useState } from 'react'
import { Play, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

// Fake strategies for selection
const availableStrategies = [
  { id: '1', name: 'DCA 定投策略' },
  { id: '2', name: '网格交易策略' },
  { id: '3', name: '趋势跟踪策略' },
  { id: '4', name: '均值回归策略' },
  { id: '5', name: '动量突破策略' },
]

export function BacktestModule() {
  const [selectedStrategy, setSelectedStrategy] = useState('')
  const [startDate, setStartDate] = useState('2024-01-01')
  const [endDate, setEndDate] = useState('2024-12-24')
  const [initialCapital, setInitialCapital] = useState('10000')
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleRunBacktest = () => {
    if (!selectedStrategy) {
      alert('请选择策略')
      return
    }
    
    setIsRunning(true)
    
    // 模拟回测过程
    setTimeout(() => {
      setResults({
        totalReturn: 18.5,
        annualizedReturn: 22.3,
        sharpeRatio: 1.85,
        maxDrawdown: -12.4,
        winRate: 62.5,
        totalTrades: 156,
        profitTrades: 98,
        lossTrades: 58,
        totalProfit: 1850,
        totalLoss: -420,
        netProfit: 1430,
      })
      setIsRunning(false)
    }, 2000)
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-xl font-semibold'>策略回测</h2>
        <p className='text-sm text-muted-foreground'>
          No Code 快速回测策略在历史数据上的表现
        </p>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* 配置面板 */}
        <Card>
          <CardHeader>
            <CardTitle>回测配置</CardTitle>
            <CardDescription>设置回测参数并运行测试</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='strategy'>选择策略</Label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                <SelectTrigger id='strategy'>
                  <SelectValue placeholder='选择要回测的策略' />
                </SelectTrigger>
                <SelectContent>
                  {availableStrategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='startDate'>开始日期</Label>
                <Input
                  id='startDate'
                  type='date'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='endDate'>结束日期</Label>
                <Input
                  id='endDate'
                  type='date'
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='capital'>初始资金 (USDT)</Label>
              <Input
                id='capital'
                type='number'
                value={initialCapital}
                onChange={(e) => setInitialCapital(e.target.value)}
                placeholder='10000'
              />
            </div>

            <Button
              className='w-full'
              onClick={handleRunBacktest}
              disabled={isRunning || !selectedStrategy}
            >
              {isRunning ? (
                <>
                  <BarChart3 className='mr-2 h-4 w-4 animate-spin' />
                  回测中...
                </>
              ) : (
                <>
                  <Play className='mr-2 h-4 w-4' />
                  开始回测
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 结果面板 */}
        <Card>
          <CardHeader>
            <CardTitle>回测结果</CardTitle>
            <CardDescription>
              {results ? '回测完成，查看详细数据' : '运行回测后显示结果'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results ? (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <div className='text-sm text-muted-foreground'>总收益率</div>
                    <div className='text-2xl font-bold text-green-600'>
                      +{results.totalReturn}%
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-sm text-muted-foreground'>年化收益率</div>
                    <div className='text-2xl font-bold text-green-600'>
                      +{results.annualizedReturn}%
                    </div>
                  </div>
                </div>

                <Separator />

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <div className='text-sm text-muted-foreground'>夏普比率</div>
                    <div className='text-xl font-semibold'>{results.sharpeRatio}</div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-sm text-muted-foreground'>最大回撤</div>
                    <div className='text-xl font-semibold text-red-600'>
                      {results.maxDrawdown}%
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-sm text-muted-foreground'>胜率</div>
                    <div className='text-xl font-semibold'>{results.winRate}%</div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-sm text-muted-foreground'>总交易次数</div>
                    <div className='text-xl font-semibold'>{results.totalTrades}</div>
                  </div>
                </div>

                <Separator />

                <div className='space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>盈利交易</span>
                    <span className='font-semibold text-green-600'>
                      {results.profitTrades} 笔 (+{results.totalProfit} USDT)
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>亏损交易</span>
                    <span className='font-semibold text-red-600'>
                      {results.lossTrades} 笔 ({results.totalLoss} USDT)
                    </span>
                  </div>
                  <Separator />
                  <div className='flex justify-between text-base font-bold'>
                    <span>净利润</span>
                    <span className='text-green-600'>
                      +{results.netProfit} USDT
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <BarChart3 className='h-12 w-12 text-muted-foreground mb-4' />
                <p className='text-muted-foreground'>
                  配置参数后点击"开始回测"查看结果
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

