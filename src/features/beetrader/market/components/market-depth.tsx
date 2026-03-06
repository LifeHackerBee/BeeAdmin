import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VolumeProfileChart } from './volume-profile-chart'
import { LargeTradesPanel } from './large-trades-panel'
import { VolumeFlowChart } from './volume-flow-chart'

// ─── Constants ────────────────────────────────────────────────────────────────

const COINS = ['BTC', 'ETH', 'SOL'] as const
type Coin = (typeof COINS)[number]

// ─── Component ────────────────────────────────────────────────────────────────

export function MarketDepth() {
  const [selectedCoin, setSelectedCoin] = useState<Coin>('BTC')

  return (
    <div className='flex flex-col gap-4'>
      {/* Section header + coin selector */}
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-xl font-semibold'>市场深度分析</h3>
          <p className='text-sm text-muted-foreground mt-0.5'>筹码分布 · 多空流向 · 量级变化</p>
        </div>
        <Select
          value={selectedCoin}
          onValueChange={(v) => setSelectedCoin(v as Coin)}
        >
          <SelectTrigger className='w-[100px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COINS.map((coin) => (
              <SelectItem key={coin} value={coin}>
                {coin}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Two-column layout: chip distribution + 1-min flow */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6' style={{ minHeight: '420px' }}>
        <VolumeProfileChart coin={selectedCoin} />
        <LargeTradesPanel coin={selectedCoin} />
      </div>

      {/* Full-width: 5-minute volume magnitude change */}
      <VolumeFlowChart coin={selectedCoin} />
    </div>
  )
}
