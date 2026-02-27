import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Radar, RefreshCw } from 'lucide-react'
import { useOrderRadar } from './hooks/use-order-radar'
import { SignalResult } from './components/signal-result'

const POPULAR_COINS = ['BTC', 'ETH', 'SOL', 'HYPE', 'SUI', 'DOGE']

export function TradingSignals() {
  const [coin, setCoin] = useState('BTC')
  const { analyze, loading, error, data, reset } = useOrderRadar()

  const handleAnalyze = () => {
    if (!coin.trim()) return
    reset()
    analyze(coin.trim())
  }

  return (
    <div className='flex flex-col space-y-6'>
      {/* 头部 */}
      <div className='flex-shrink-0 space-y-4'>
        <div className='flex items-center gap-2'>
          <Radar className='h-6 w-6' />
          <h1 className='text-2xl font-bold'>Order Radar</h1>
          <span className='text-sm text-muted-foreground'>多层共振分析</span>
        </div>

        {/* 输入区 */}
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            value={coin}
            onChange={(e) => setCoin(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder='输入币种，如 BTC'
            className='w-32'
          />
          <Button onClick={handleAnalyze} disabled={loading || !coin.trim()}>
            {loading ? (
              <>
                <RefreshCw className='h-4 w-4 mr-1 animate-spin' />
                分析中...
              </>
            ) : (
              '分析'
            )}
          </Button>
          <div className='flex items-center gap-1'>
            {POPULAR_COINS.map((c) => (
              <Button
                key={c}
                variant={coin === c ? 'default' : 'outline'}
                size='sm'
                className='text-xs h-7 px-2'
                onClick={() => {
                  setCoin(c)
                  reset()
                  analyze(c)
                }}
                disabled={loading}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className='flex-1 min-h-0 overflow-y-auto'>
        {error && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>分析失败</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {loading && !data && (
          <div className='space-y-4'>
            <Skeleton className='h-20 w-full' />
            <Skeleton className='h-40 w-full' />
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Skeleton className='h-48' />
              <Skeleton className='h-48' />
              <Skeleton className='h-48' />
              <Skeleton className='h-48' />
            </div>
          </div>
        )}

        {data && <SignalResult data={data} />}

        {!loading && !data && !error && (
          <div className='flex flex-col items-center justify-center py-20 text-muted-foreground'>
            <Radar className='h-16 w-16 mb-4 opacity-30' />
            <p>选择币种并点击分析</p>
          </div>
        )}
      </div>
    </div>
  )
}
