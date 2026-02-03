import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { type PositionEvent } from '../hooks/use-events'
import { formatDateTime } from '@/lib/timezone'
import { WalletAddressCell } from '../../components/wallet-address-cell'

interface EventsTableProps {
  data: PositionEvent[]
  /** 钱包地址 -> 备注，用于显示在事件表格中 */
  walletNotes?: Record<string, string>
  /** 当前市场价格 (coin -> price)，价格可能是字符串或数字 */
  currentPrices?: Record<string, number | string>
}

const EVENT_TYPE_MAP: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  OPEN: { label: '开仓', variant: 'default' },
  CLOSE: { label: '平仓', variant: 'destructive' },
  INCREASE: { label: '加仓', variant: 'secondary' },
  DECREASE: { label: '减仓', variant: 'outline' },
  FLIP: { label: '翻转', variant: 'destructive' },
}

function formatNumber(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) {
    return '-'
  }
  // 确保转换为数字
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) {
    return '-'
  }
  return num.toFixed(decimals)
}

export function EventsTable({ data, walletNotes = {}, currentPrices = {} }: EventsTableProps) {
  if (data.length === 0) {
    return (
      <div className='flex items-center justify-center h-64 text-muted-foreground'>
        暂无事件数据
      </div>
    )
  }

  return (
    <div className='rounded-md border overflow-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[180px]'>时间</TableHead>
            <TableHead className='w-[200px]'>钱包地址</TableHead>
            <TableHead className='w-[140px]'>备注</TableHead>
            <TableHead className='w-[100px]'>币种</TableHead>
            <TableHead className='w-[100px]'>事件类型</TableHead>
            <TableHead className='w-[100px]'>方向</TableHead>
            <TableHead className='w-[120px]'>持仓变化</TableHead>
            <TableHead className='w-[120px]'>持仓大小</TableHead>
            <TableHead className='w-[100px]'>杠杆</TableHead>
            <TableHead className='w-[120px]'>持仓价值</TableHead>
            <TableHead className='w-[120px]'>入场价格</TableHead>
            <TableHead className='w-[120px]' title='仓位异动发生时的市场价格'>买入/卖出价</TableHead>
            <TableHead className='w-[120px]' title='当前实时市场价格（每5秒刷新）'>当前价格</TableHead>
            <TableHead className='w-[100px]' title='当前价格相对买入/卖出价的涨跌幅'>涨跌幅</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((event) => {
            const eventTypeInfo = EVENT_TYPE_MAP[event.event_type] || {
              label: event.event_type,
              variant: 'outline' as const,
            }

            // 格式化时间（优先使用 event_time，否则使用 created_at）
            const timeDisplay = event.event_time 
              ? formatDateTime(event.event_time) 
              : formatDateTime(event.created_at)

            // 计算持仓变化显示
            const sziChange = event.szi_change
            const sziChangeDisplay =
              sziChange !== null && sziChange !== undefined
                ? `${sziChange > 0 ? '+' : ''}${formatNumber(sziChange, 4)}`
                : '-'

            // 计算方向：如果 API 没有返回方向字段，根据 szi 值计算
            const getSideFromSzi = (szi: number | null | undefined): string | null => {
              if (szi === null || szi === undefined) return null
              const sziVal = Number(szi)
              if (sziVal > 0) return 'LONG'
              if (sziVal < 0) return 'SHORT'
              return 'NONE'
            }

            // 优先使用 API 返回的方向，否则根据 szi 计算
            const prevSide = event.prev_side ?? getSideFromSzi(event.prev_szi)
            const nowSide = event.now_side ?? getSideFromSzi(event.now_szi)
            
            // 方向 Badge 样式
            const getSideBadgeVariant = (side: string | null | undefined) => {
              if (side === 'LONG') return 'default' as const
              if (side === 'SHORT') return 'destructive' as const
              return 'outline' as const
            }
            
            const getSideLabel = (side: string | null | undefined) => {
              if (side === 'LONG') return '做多'
              if (side === 'SHORT') return '做空'
              return '无'
            }

            return (
              <TableRow key={event.id}>
                <TableCell className='font-mono text-xs'>{timeDisplay}</TableCell>
                <TableCell className='font-mono text-xs min-w-0'>
                  {event.wallet_address ? (
                    <WalletAddressCell address={event.wallet_address} />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className='text-sm text-muted-foreground max-w-[140px] truncate' title={walletNotes[event.wallet_address] || ''}>
                  {walletNotes[event.wallet_address] || '无备注'}
                </TableCell>
                <TableCell className='font-semibold'>{event.coin}</TableCell>
                <TableCell>
                  <Badge variant={eventTypeInfo.variant}>{eventTypeInfo.label}</Badge>
                </TableCell>
                <TableCell>
                  {nowSide ? (
                    <Badge variant={getSideBadgeVariant(nowSide)}>
                      {getSideLabel(nowSide)}
                    </Badge>
                  ) : (
                    <span className='text-muted-foreground text-xs'>-</span>
                  )}
                  {prevSide && prevSide !== nowSide && (
                    <span className='text-xs text-muted-foreground ml-1'>
                      ({prevSide === 'LONG' ? '做多' : prevSide === 'SHORT' ? '做空' : '无'} → {getSideLabel(nowSide)})
                    </span>
                  )}
                </TableCell>
                <TableCell className='font-mono text-xs'>{sziChangeDisplay}</TableCell>
                <TableCell className='font-mono text-xs'>
                  {formatNumber(event.now_szi, 4)}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {event.now_leverage ? `${formatNumber(event.now_leverage, 2)}x` : '-'}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {event.now_position_value
                    ? `$${formatNumber(event.now_position_value, 2)}`
                    : '-'}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {event.now_entry_px ? `$${formatNumber(event.now_entry_px, 4)}` : '-'}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {event.mark_price ? `$${formatNumber(event.mark_price, 4)}` : '-'}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {(() => {
                    const currentPrice = currentPrices[event.coin]
                    return currentPrice ? `$${formatNumber(currentPrice, 4)}` : '-'
                  })()}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {(() => {
                    const currentPriceRaw = currentPrices[event.coin]
                    const markPriceRaw = event.mark_price
                    
                    if (!currentPriceRaw || !markPriceRaw) return '-'
                    
                    // 确保转换为数字
                    const currentPrice = typeof currentPriceRaw === 'string' ? parseFloat(currentPriceRaw) : currentPriceRaw
                    const markPrice = typeof markPriceRaw === 'string' ? parseFloat(markPriceRaw) : markPriceRaw
                    
                    if (isNaN(currentPrice) || isNaN(markPrice) || markPrice === 0) return '-'
                    
                    const change = currentPrice - markPrice
                    const changePct = (change / markPrice) * 100
                    const isPositive = change > 0
                    
                    return (
                      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                        {isPositive ? '+' : ''}{changePct.toFixed(2)}%
                      </span>
                    )
                  })()}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
