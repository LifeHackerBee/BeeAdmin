import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VolumeFlowChart } from './volume-flow-chart'
import { COINS, coinLabel } from '../coins'

export function MarketDepth() {
  const [selectedCoin, setSelectedCoin] = useState(COINS[0].value)

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>5分钟量级变化</span>
        <Select value={selectedCoin} onValueChange={setSelectedCoin}>
          <SelectTrigger className='w-[100px] h-7 text-xs'>
            <SelectValue>{coinLabel(selectedCoin)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COINS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <VolumeFlowChart coin={selectedCoin} />
    </div>
  )
}
