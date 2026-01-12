import { useState, useEffect, useMemo } from 'react'
import { useIBKRAllPeriods } from '../hooks/use-ibkr-performance'
import { useIBKRPerformance } from '../hooks/use-ibkr-performance'
import { useIBKRSummary, useIBKRPositions, useIBKRAllocation } from '../hooks/use-ibkr-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { format } from 'date-fns'

interface PerformanceDashboardProps {
  accountId: string
}

const PERIOD_LABELS: Record<string, string> = {
  '1D': '1天',
  '7D': '7天',
  'MTD': '本月至今',
  '1M': '1个月',
  'YTD': '年初至今',
  '1Y': '1年',
}

// 性能数据接口
interface PerformanceData {
  cps?: {
    freq: string
    dates: string[]
    data: Array<{
      id: string
      idType: string
      start: string
      end: string
      returns: number[]
      baseCurrency: string
    }>
  }
  tpps?: {
    freq: string
    dates: string[]
    data: Array<{
      id: string
      idType: string
      start: string
      end: string
      returns: number[]
      baseCurrency: string
    }>
  }
  [key: string]: unknown
}

export function PerformanceDashboard({ accountId }: PerformanceDashboardProps) {
  // 获取所有时间段
  const {
    data: allPeriodsData,
    isLoading: isLoadingPeriods,
    error: periodsError,
    refetch: refetchPeriods,
  } = useIBKRAllPeriods(accountId)

  // 获取可用时间段 - 从账户ID对应的对象中提取
  const availablePeriods = useMemo(() => {
    if (!allPeriodsData || !accountId) return []
    
    // 从响应中获取账户ID对应的数据对象
    const accountData = (allPeriodsData as Record<string, unknown>)[accountId]
    if (accountData && typeof accountData === 'object') {
      // 从账户数据对象中提取时间段keys
      const periods = Object.keys(accountData).filter(
        (key) => ['1D', '7D', 'MTD', '1M', 'YTD', '1Y'].includes(key)
      )
      return periods
    }
    return []
  }, [allPeriodsData, accountId])

  const [selectedPeriod, setSelectedPeriod] = useState<string>('')

  // 当数据加载后，默认选择第一个时间段
  useEffect(() => {
    if (availablePeriods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(availablePeriods[0])
    }
  }, [availablePeriods, selectedPeriod])

  // 获取性能数据
  const {
    data: performanceData,
    isLoading: isLoadingPerformance,
    error: performanceError,
    refetch: refetchPerformance,
  } = useIBKRPerformance(accountId, selectedPeriod)

  // 获取账户摘要
  const { data: summaryData, isLoading: isLoadingSummary } = useIBKRSummary(accountId)

  // 获取持仓
  const { data: positionsData, isLoading: isLoadingPositions } = useIBKRPositions(accountId)

  // 获取分配信息
  const { data: allocationData, isLoading: isLoadingAllocation } = useIBKRAllocation(accountId)

  // 解析性能数据
  const performance = performanceData as PerformanceData | undefined

  // 提取收益率数据用于图表
  const chartData = useMemo(() => {
    if (!performance?.cps?.data || !performance?.cps?.dates) return []

    const cpsData = performance.cps.data[0]
    if (!cpsData?.returns || !performance.cps.dates) return []

    return performance.cps.dates.map((date, index) => {
      // 格式化日期 YYYYMMDD -> YYYY-MM-DD
      const formattedDate = date.length === 8 
        ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
        : date

      return {
        date: formattedDate,
        收益率: cpsData.returns[index] ? (cpsData.returns[index] * 100).toFixed(4) : 0,
      }
    })
  }, [performance])

  // 计算总收益率
  const totalReturn = useMemo(() => {
    if (!performance?.cps?.data || !performance.cps.data[0]?.returns) return null
    const returns = performance.cps.data[0].returns
    if (returns.length === 0) return null
    
    // 计算累计收益率
    const cumulative = returns.reduce((sum, r) => sum + r, 0)
    return cumulative * 100
  }, [performance])

  // 提取基准货币
  const baseCurrency = performance?.cps?.data?.[0]?.baseCurrency || 'HKD'

  // 解析摘要数据中的关键指标
  const summaryMetrics = useMemo(() => {
    if (!summaryData || typeof summaryData !== 'object') return null

    const metrics: Record<string, { label: string; value: number | string; currency?: string }> = {}

    // 辅助函数：从摘要对象中提取值
    const getSummaryValue = (key: string): { value: number | string; currency: string } | null => {
      const field = (summaryData as Record<string, unknown>)[key]
      if (!field || typeof field !== 'object') return null
      
      const fieldObj = field as {
        amount?: number
        currency?: string | null
        value?: string | number | null
        isNull?: boolean
      }
      
      // 优先使用amount，如果没有则使用value
      const value = fieldObj.amount ?? (fieldObj.value !== null && fieldObj.value !== undefined ? fieldObj.value : null)
      const currency = fieldObj.currency || baseCurrency
      
      if (value === null || value === undefined) return null
      
      return {
        value: typeof value === 'number' ? value : parseFloat(String(value)) || 0,
        currency,
      }
    }

    // 提取常见的摘要字段（注意API返回的字段名是小写）
    const netLiquidation = getSummaryValue('netliquidation')
    if (netLiquidation) {
      metrics.netLiquidation = {
        label: '净清算价值',
        value: netLiquidation.value,
        currency: netLiquidation.currency,
      }
    }

    const totalCash = getSummaryValue('totalcashvalue')
    if (totalCash) {
      metrics.totalCash = {
        label: '现金总额',
        value: totalCash.value,
        currency: totalCash.currency,
      }
    }

    const grossPosition = getSummaryValue('grosspositionvalue')
    if (grossPosition) {
      metrics.grossPosition = {
        label: '持仓总值',
        value: grossPosition.value,
        currency: grossPosition.currency,
      }
    }

    const availableFunds = getSummaryValue('availablefunds')
    if (availableFunds) {
      metrics.availableFunds = {
        label: '可用资金',
        value: availableFunds.value,
        currency: availableFunds.currency,
      }
    }

    const buyingPower = getSummaryValue('buyingpower')
    if (buyingPower) {
      metrics.buyingPower = {
        label: '购买力',
        value: buyingPower.value,
        currency: buyingPower.currency,
      }
    }

    const equityWithLoan = getSummaryValue('equitywithloanvalue')
    if (equityWithLoan) {
      metrics.equityWithLoan = {
        label: '含贷款权益',
        value: equityWithLoan.value,
        currency: equityWithLoan.currency,
      }
    }

    const excessLiquidity = getSummaryValue('excessliquidity')
    if (excessLiquidity) {
      metrics.excessLiquidity = {
        label: '超额流动性',
        value: excessLiquidity.value,
        currency: excessLiquidity.currency,
      }
    }

    return metrics
  }, [summaryData, baseCurrency])

  return (
    <div className='space-y-4'>
      {/* 性能看板 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between flex-wrap gap-4'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <BarChart3 className='h-5 w-5' />
                账户性能看板
              </CardTitle>
              <CardDescription className='mt-1'>
                账户ID: {accountId} | 基准货币: {baseCurrency}
              </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Select
                value={selectedPeriod}
                onValueChange={setSelectedPeriod}
                disabled={isLoadingPeriods || availablePeriods.length === 0}
              >
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder='选择时间段' />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map((period) => (
                    <SelectItem key={period} value={period}>
                      {PERIOD_LABELS[period] || period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(periodsError || performanceError) && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    refetchPeriods()
                    if (selectedPeriod) refetchPerformance()
                  }}
                  className='gap-2'
                  disabled={isLoadingPeriods || isLoadingPerformance}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingPeriods || isLoadingPerformance ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPeriods ? (
            <div className='flex items-center justify-center py-12'>
              <RefreshCw className='h-6 w-6 animate-spin text-muted-foreground' />
              <span className='ml-2 text-muted-foreground'>加载时间段列表...</span>
            </div>
          ) : periodsError ? (
            <div className='flex flex-col items-center justify-center py-12 gap-2'>
              <p className='text-destructive font-medium'>
                {periodsError instanceof Error ? periodsError.message : '加载时间段失败'}
              </p>
              <Button variant='outline' size='sm' onClick={() => refetchPeriods()} className='gap-2'>
                <RefreshCw className='h-4 w-4' />
                重试
              </Button>
            </div>
          ) : availablePeriods.length === 0 ? (
            <div className='flex items-center justify-center py-12'>
              <p className='text-muted-foreground'>暂无可用时间段</p>
            </div>
          ) : !selectedPeriod ? (
            <div className='flex items-center justify-center py-12'>
              <p className='text-muted-foreground'>请选择时间段</p>
            </div>
          ) : isLoadingPerformance ? (
            <div className='flex items-center justify-center py-12'>
              <RefreshCw className='h-6 w-6 animate-spin text-muted-foreground' />
              <span className='ml-2 text-muted-foreground'>加载性能数据...</span>
            </div>
          ) : performanceError ? (
            <div className='flex flex-col items-center justify-center py-12 gap-2'>
              <p className='text-destructive font-medium'>
                {performanceError instanceof Error ? performanceError.message : '加载性能数据失败'}
              </p>
              <Button variant='outline' size='sm' onClick={() => refetchPerformance()} className='gap-2'>
                <RefreshCw className='h-4 w-4' />
                重试
              </Button>
            </div>
          ) : performance ? (
            <div className='space-y-6'>
              {/* 关键指标卡片 */}
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                {totalReturn !== null && (
                  <Card>
                    <CardContent className='pt-6'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='text-sm text-muted-foreground'>总收益率</p>
                          <p
                            className={`text-2xl font-bold mt-1 ${
                              totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {totalReturn.toFixed(4)}%
                          </p>
                        </div>
                        {totalReturn >= 0 ? (
                          <TrendingUp className='h-8 w-8 text-green-500' />
                        ) : (
                          <TrendingDown className='h-8 w-8 text-red-500' />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {performance.cps?.data?.[0] && (
                  <>
                    <Card>
                      <CardContent className='pt-6'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm text-muted-foreground'>开始日期</p>
                            <p className='text-2xl font-bold mt-1'>
                              {performance.cps.data[0].start
                                ? format(
                                    new Date(
                                      `${performance.cps.data[0].start.slice(0, 4)}-${performance.cps.data[0].start.slice(4, 6)}-${performance.cps.data[0].start.slice(6, 8)}`
                                    ),
                                    'yyyy-MM-dd'
                                  )
                                : '-'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className='pt-6'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm text-muted-foreground'>结束日期</p>
                            <p className='text-2xl font-bold mt-1'>
                              {performance.cps.data[0].end
                                ? format(
                                    new Date(
                                      `${performance.cps.data[0].end.slice(0, 4)}-${performance.cps.data[0].end.slice(4, 6)}-${performance.cps.data[0].end.slice(6, 8)}`
                                    ),
                                    'yyyy-MM-dd'
                                  )
                                : '-'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className='pt-6'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm text-muted-foreground'>数据点数</p>
                            <p className='text-2xl font-bold mt-1'>
                              {performance.cps.data[0].returns?.length || 0}
                            </p>
                          </div>
                          <BarChart3 className='h-8 w-8 text-muted-foreground' />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* 收益率趋势图 */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>收益率趋势</CardTitle>
                    <CardDescription>时间段: {PERIOD_LABELS[selectedPeriod] || selectedPeriod}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width='100%' height={400}>
                      <LineChart data={chartData}>
                        <XAxis
                          dataKey='date'
                          stroke='#888888'
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => {
                            try {
                              return format(new Date(value), 'MM/dd')
                            } catch {
                              return value
                            }
                          }}
                        />
                        <YAxis
                          stroke='#888888'
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          formatter={(value: string | number | undefined, name: string | undefined) => {
                            if (value === undefined || value === null) return ['', name || '收益率']
                            return [`${value}%`, name || '收益率']
                          }}
                          labelFormatter={(label) => `日期: ${label}`}
                        />
                        <Legend />
                        <Line
                          type='monotone'
                          dataKey='收益率'
                          stroke='#3b82f6'
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* 调试信息 */}
              {import.meta.env.DEV && (
                <Card>
                  <CardHeader>
                    <CardTitle className='text-sm'>调试信息（开发环境）</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className='text-xs overflow-auto max-h-60 bg-muted p-4 rounded-lg'>
                      {JSON.stringify(performance, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className='flex items-center justify-center py-12'>
              <p className='text-muted-foreground'>暂无数据</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 账户摘要和持仓信息 */}
      <Tabs defaultValue='summary' className='w-full'>
        <TabsList>
          <TabsTrigger value='summary'>账户摘要</TabsTrigger>
          <TabsTrigger value='positions'>持仓信息</TabsTrigger>
          <TabsTrigger value='allocation'>分配信息</TabsTrigger>
        </TabsList>

        <TabsContent value='summary' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>账户摘要</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <div className='flex items-center justify-center py-12'>
                  <RefreshCw className='h-6 w-6 animate-spin text-muted-foreground' />
                  <span className='ml-2 text-muted-foreground'>加载摘要数据...</span>
                </div>
              ) : summaryMetrics ? (
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                  {Object.entries(summaryMetrics).map(([key, metric]) => (
                    <Card key={key}>
                      <CardContent className='pt-6'>
                        <p className='text-sm text-muted-foreground'>{metric.label}</p>
                        <p className='text-2xl font-bold mt-1'>
                          {typeof metric.value === 'number'
                            ? metric.value.toLocaleString('zh-CN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : metric.value}
                          {metric.currency && <span className='text-sm text-muted-foreground ml-2'>{metric.currency}</span>}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className='flex items-center justify-center py-12'>
                  <p className='text-muted-foreground'>暂无摘要数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='positions' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>持仓信息</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPositions ? (
                <div className='flex items-center justify-center py-12'>
                  <RefreshCw className='h-6 w-6 animate-spin text-muted-foreground' />
                  <span className='ml-2 text-muted-foreground'>加载持仓数据...</span>
                </div>
              ) : positionsData && positionsData.length > 0 ? (
                <div className='space-y-4'>
                  <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {positionsData.slice(0, 12).map((position, index) => (
                      <Card key={index}>
                        <CardContent className='pt-6'>
                          <div className='space-y-2'>
                            <div className='flex items-center justify-between'>
                              <p className='font-semibold'>{position.description}</p>
                              <span className='text-xs text-muted-foreground'>{position.secType}</span>
                            </div>
                            <div className='grid grid-cols-2 gap-2 text-sm'>
                              <div>
                                <span className='text-muted-foreground'>持仓数量:</span>
                                <p className='font-medium'>{position.position}</p>
                              </div>
                              <div>
                                <span className='text-muted-foreground'>市值:</span>
                                <p className='font-medium'>
                                  {position.marketValue?.toLocaleString('zh-CN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }) || '-'}{' '}
                                  {position.currency}
                                </p>
                              </div>
                              <div>
                                <span className='text-muted-foreground'>成本:</span>
                                <p className='font-medium'>
                                  {position.avgCost?.toLocaleString('zh-CN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }) || '-'}{' '}
                                  {position.currency}
                                </p>
                              </div>
                              <div>
                                <span className='text-muted-foreground'>盈亏:</span>
                                <p
                                  className={`font-medium ${
                                    (position.unrealizedPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
                                  {(position.unrealizedPnl || 0).toLocaleString('zh-CN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{' '}
                                  {position.currency}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {positionsData.length > 12 && (
                    <p className='text-sm text-muted-foreground text-center'>
                      显示前12个持仓，共 {positionsData.length} 个
                    </p>
                  )}
                </div>
              ) : (
                <div className='flex items-center justify-center py-12'>
                  <p className='text-muted-foreground'>暂无持仓数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='allocation' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>分配信息</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAllocation ? (
                <div className='flex items-center justify-center py-12'>
                  <RefreshCw className='h-6 w-6 animate-spin text-muted-foreground' />
                  <span className='ml-2 text-muted-foreground'>加载分配数据...</span>
                </div>
              ) : allocationData ? (
                <div className='space-y-4'>
                  <pre className='text-xs overflow-auto max-h-96 bg-muted p-4 rounded-lg'>
                    {JSON.stringify(allocationData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className='flex items-center justify-center py-12'>
                  <p className='text-muted-foreground'>暂无分配数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
