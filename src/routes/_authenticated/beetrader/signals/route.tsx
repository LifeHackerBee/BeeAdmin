import { createFileRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Radar, BarChart3, Clock, Timer } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

declare const __APP_VERSION__: string

function SignalsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()

  const getActiveTab = () => {
    if (pathname.endsWith('/history')) return 'history'
    if (pathname.endsWith('/scheduled')) return 'scheduled'
    return 'realtime'
  }

  return (
    <div className='flex flex-col space-y-3'>
      <div className='flex-shrink-0 space-y-2'>
        <div className='flex items-center gap-2'>
          <Radar className='h-5 w-5' />
          <h1 className='text-xl font-bold'>交易分析中心</h1>
          <span className='text-xs text-muted-foreground/50 tabular-nums'>v{__APP_VERSION__}</span>
          <span className='text-sm text-muted-foreground'>市场观察与交易指标分析</span>
        </div>
      </div>

      <Tabs value={getActiveTab()} onValueChange={(v) => navigate({ to: `/beetrader/signals/${v}` as any })}>
        <TabsList>
          <TabsTrigger value='realtime' className='gap-1.5'>
            <BarChart3 className='h-3.5 w-3.5' />
            实时分析
          </TabsTrigger>
          <TabsTrigger value='history' className='gap-1.5'>
            <Clock className='h-3.5 w-3.5' />
            历史分析
          </TabsTrigger>
          <TabsTrigger value='scheduled' className='gap-1.5'>
            <Timer className='h-3.5 w-3.5' />
            定时分析
          </TabsTrigger>
        </TabsList>

        <div className='mt-3'>
          <Outlet />
        </div>
      </Tabs>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/beetrader/signals' as any)({
  component: SignalsLayout,
})
