import { Macroscopic } from '../macroscopic'
import { Candles } from '../candles'

export function Market() {
  return (
    <div className='flex h-full flex-col overflow-hidden bg-background'>
      <div className='flex-shrink-0 px-8 pt-8 pb-6'>
        <div>
          <h2 className='text-2xl font-semibold mb-2'>市场观察</h2>
          <p className='text-sm text-muted-foreground'>
            实时监控加密货币价格和K线图，数据来自 Hyperliquid
          </p>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto overflow-x-hidden px-8 pb-8'>
        <div className='flex flex-col gap-8'>
          {/* 宏观市场模块 - 内容可滚动 */}
          <div className='flex flex-col bg-card rounded-lg border p-6 shadow-sm'>
            <div className='mb-4'>
              <h3 className='text-xl font-semibold'>宏观市场</h3>
            </div>
            <div>
              <Macroscopic />
            </div>
          </div>

          {/* K线观察模块 - 固定高度显示 */}
          <div className='flex flex-col bg-card rounded-lg border p-6 shadow-sm' style={{ height: '600px', minHeight: '500px' }}>
            <div className='mb-4'>
              <h3 className='text-xl font-semibold'>K线观察</h3>
            </div>
            <div className='flex-1 min-h-0 overflow-hidden'>
              <Candles />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
