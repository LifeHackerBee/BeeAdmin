import { useSearch, useNavigate } from '@tanstack/react-router'
import { CombinedMonitor } from '../monitor/combined'
import { Tracker } from '../tracker'
import { Events } from '../events'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function WhaleManagement() {
  const search = useSearch({ from: '/_authenticated/beetrader/whale-wallet-manage' } as any)
  const navigate = useNavigate({ from: '/beetrader/whale-wallet-manage' } as any)
  const activeTab = (search as any)?.tab || 'wallets'

  const handleTabChange = (value: string) => {
    navigate({
      search: (prev: any) => ({ ...prev, tab: value }),
    } as any)
  }

  return (
    <div className='flex flex-col space-y-4'>
      <div className='flex-shrink-0 border-b pb-4'>
        <h2 className='text-2xl font-semibold'>巨鲸监控中心</h2>
        <p className='text-sm text-muted-foreground mt-1'>
          管理巨鲸钱包地址、监控持仓和交易事件
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className='flex flex-col space-y-4'>
        <TabsList className='flex-shrink-0 w-fit'>
          <TabsTrigger value='wallets'>钱包管理</TabsTrigger>
          <TabsTrigger value='tracker'>Tracker管理</TabsTrigger>
          <TabsTrigger value='events'>仓位异动</TabsTrigger>
        </TabsList>
        
        <TabsContent value='wallets' className='mt-0'>
          <CombinedMonitor />
        </TabsContent>
        
        <TabsContent value='tracker' className='mt-0'>
          <Tracker />
        </TabsContent>
        
        <TabsContent value='events' className='mt-0'>
          <Events />
        </TabsContent>
      </Tabs>
    </div>
  )
}
