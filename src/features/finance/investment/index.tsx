import { useState, useEffect } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { useIBKRAccounts } from './hooks/use-ibkr-accounts'
import { PerformanceDashboard } from './components/performance-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export function Investment() {
  const { data: accounts = [], isLoading, error, refetch } = useIBKRAccounts()
  
  // 从环境变量获取账户ID，如果没有则使用默认值或第一个账户ID
  const defaultAccountId = import.meta.env.VITE_IBKR_ACCOUNT_ID || 'U18065506'
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccountId)

  // 当账户列表加载完成后，更新选中的账户ID
  useEffect(() => {
    if (accounts.length > 0) {
      // 如果当前选中的账户不在列表中，或者还没有选中账户，则选择第一个账户
      if (!accounts.find((acc) => acc.id === selectedAccountId)) {
        setSelectedAccountId(accounts[0].id)
      }
    }
  }, [accounts, selectedAccountId])

  // 调试日志
  if (import.meta.env.DEV) {
    console.log('[Investment 页面] 选中账户ID:', selectedAccountId, '账户列表:', accounts)
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex items-center justify-between flex-wrap gap-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>投资账户</h2>
            <p className='text-muted-foreground'>
              查看您的 IBKR 账户信息和性能数据
            </p>
          </div>
          {error && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              className='gap-2'
            >
              <RefreshCw className='h-4 w-4' />
              重试
            </Button>
          )}
        </div>

        {/* 账户选择器 - 紧凑显示 */}
        {!isLoading && !error && accounts.length > 0 && (
          <div className='flex items-center gap-4 flex-wrap p-4 rounded-lg border bg-muted/30'>
            <label className='text-sm font-medium text-muted-foreground whitespace-nowrap'>选择账户:</label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className='w-[300px]'>
                <SelectValue placeholder='选择账户' />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className='flex items-center gap-2'>
                      <span>{account.displayName || account.accountId}</span>
                      <Badge variant={account.brokerageAccess ? 'default' : 'secondary'} className='text-xs'>
                        {account.brokerageAccess ? '活跃' : '非活跃'}
                      </Badge>
                      <span className='text-xs text-muted-foreground'>({account.accountId})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accounts.find((acc) => acc.id === selectedAccountId) && (
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <span>账户类型:</span>
                <span className='font-medium'>
                  {accounts.find((acc) => acc.id === selectedAccountId)?.type}
                </span>
                <span className='mx-2'>|</span>
                <span>币种:</span>
                <span className='font-medium'>
                  {accounts.find((acc) => acc.id === selectedAccountId)?.currency}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <Card>
            <CardContent className='py-12'>
              <div className='flex flex-col items-center justify-center gap-2'>
                <RefreshCw className='h-6 w-6 animate-spin text-muted-foreground' />
                <p className='text-muted-foreground'>加载账户信息中...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 错误状态 */}
        {error && (
          <Card>
            <CardContent className='py-12'>
              <div className='flex flex-col items-center justify-center gap-2'>
                <AlertCircle className='h-6 w-6 text-destructive' />
                <p className='text-destructive font-medium'>
                  {error instanceof Error ? error.message : '加载失败'}
                </p>
                <p className='text-sm text-muted-foreground'>
                  请检查网络连接和 API 配置
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 性能看板 - 显示选中账户的数据 */}
        {!isLoading && !error && selectedAccountId && (
          <PerformanceDashboard accountId={selectedAccountId} />
        )}
      </Main>
    </>
  )
}
