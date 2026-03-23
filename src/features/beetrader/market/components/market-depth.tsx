import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VolumeFlowChart } from './volume-flow-chart'
import { COINS, coinLabel } from '../coins'

export function MarketDepth() {
  const [selectedCoin, setSelectedCoin] = useState(COINS[0].value)

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm'>成交量</CardTitle>
          <Select
            value={selectedCoin}
            onValueChange={setSelectedCoin}
          >
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
      </CardHeader>
      <CardContent>
        <VolumeFlowChart coin={selectedCoin} />
      </CardContent>
    </Card>
  )
}
