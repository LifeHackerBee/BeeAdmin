import { WalletsProvider, useWallets as useWalletsContext } from './components/tasks-provider'
import { WalletsTable } from './components/tasks-table'
import { WalletsPrimaryButtons } from './components/tasks-primary-buttons'
import { WalletsDialogs } from './components/tasks-dialogs'
import { useWallets } from './hooks/use-wallets'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useEffect } from 'react'

function MonitorContent() {
  const { wallets, loading, error, refetch } = useWallets()
  const { refreshTrigger } = useWalletsContext()

  // 当 refreshTrigger 变化时，重新获取数据
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch()
    }
  }, [refreshTrigger, refetch])

  return (
    <WalletsProvider>
      <div className='flex h-full flex-col space-y-6 overflow-hidden'>
        <div className='flex items-center justify-between flex-shrink-0'>
          <div>
            <h2 className='text-xl font-semibold'>巨鲸钱包管理</h2>
            <p className='text-sm text-muted-foreground'>
              管理巨鲸钱包地址，记录备注和体量信息
            </p>
          </div>
          <WalletsPrimaryButtons />
        </div>
        <div className='flex-1 min-h-0 overflow-hidden flex flex-col'>
          {loading ? (
            <div className='space-y-4 overflow-auto'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-64 w-full' />
            </div>
          ) : error ? (
            <Alert variant='destructive' className='flex-shrink-0'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>加载失败</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : (
            <WalletsTable data={wallets} />
          )}
        </div>
        <WalletsDialogs />
      </div>
    </WalletsProvider>
  )
}

export function Monitor() {
  return (
    <WalletsProvider>
      <MonitorContent />
    </WalletsProvider>
  )
}

