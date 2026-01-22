import { useState } from 'react'
import { useAnalyzer } from './hooks/use-analyzer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Search, RefreshCw, History } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AnalysisResult } from './components/analysis-result'
import { HistoryList } from './components/history-list'

function NewAnalysis() {
  const [address, setAddress] = useState('')
  const [days, setDays] = useState(30)
  const { analyze, loading, error, data, reset } = useAnalyzer()

  const handleAnalyze = async () => {
    if (!address.trim()) {
      return
    }
    try {
      await analyze(address.trim(), days)
    } catch (err) {
      // 错误已在 hook 中处理
    }
  }

  const handleReset = () => {
    setAddress('')
    setDays(30)
    reset()
  }

  return (
    <div className='flex flex-col space-y-6'>
      <div className='flex-shrink-0'>
        <Card>
          <CardHeader>
            <CardTitle>输入分析地址</CardTitle>
            <CardDescription>输入要分析的 Hyperliquid 交易者钱包地址</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='address'>钱包地址</Label>
              <div className='flex gap-2'>
                <Input
                  id='address'
                  placeholder='0x...'
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleAnalyze()
                    }
                  }}
                  disabled={loading}
                  className='flex-1'
                />
                <Select value={days.toString()} onValueChange={(value) => setDays(Number(value))} disabled={loading}>
                  <SelectTrigger className='w-32'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='7'>7 天</SelectItem>
                    <SelectItem value='30'>30 天</SelectItem>
                    <SelectItem value='60'>60 天</SelectItem>
                    <SelectItem value='90'>90 天</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='flex gap-2'>
              <Button onClick={handleAnalyze} disabled={loading || !address.trim()}>
                {loading ? (
                  <>
                    <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                    分析中...
                  </>
                ) : (
                  <>
                    <Search className='h-4 w-4 mr-2' />
                    开始分析
                  </>
                )}
              </Button>
              {data && (
                <Button variant='outline' onClick={handleReset} disabled={loading}>
                  重置
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='w-full'>
        {loading && (
          <div className='space-y-6'>
            <Skeleton className='h-48 w-full' />
            <Skeleton className='h-64 w-full' />
            <Skeleton className='h-32 w-full' />
          </div>
        )}

        {error && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>分析失败</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {data && !loading && <AnalysisResult data={data} />}
      </div>
    </div>
  )
}

export function TraderAnalyzer() {
  return (
    <div className='flex h-full flex-col space-y-6 min-h-0'>
      <div className='flex items-center justify-between flex-shrink-0'>
        <div>
          <h2 className='text-xl font-semibold'>Trader 分析</h2>
          <p className='text-sm text-muted-foreground'>
            分析 Hyperliquid 交易者的地址，评估交易策略和风险水平
          </p>
        </div>
      </div>

      <Tabs defaultValue='new' className='flex-1 flex flex-col min-h-0'>
        <TabsList className='flex-shrink-0'>
          <TabsTrigger value='new'>
            <Search className='h-4 w-4 mr-2' />
            新分析
          </TabsTrigger>
          <TabsTrigger value='history'>
            <History className='h-4 w-4 mr-2' />
            历史记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value='new' className='flex-1 overflow-y-auto mt-4'>
          <NewAnalysis />
        </TabsContent>

        <TabsContent value='history' className='flex-1 overflow-y-auto mt-4'>
          <HistoryList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
