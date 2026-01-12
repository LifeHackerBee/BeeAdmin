import { IBKRAccount } from '../hooks/use-ibkr-accounts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface AccountsTableProps {
  accounts: IBKRAccount[]
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className='py-8'>
          <p className='text-center text-muted-foreground'>暂无账户信息</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {accounts.map((account) => (
        <Card key={account.id}>
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div>
                <CardTitle className='text-lg'>{account.displayName}</CardTitle>
                <CardDescription className='mt-1'>
                  {account.accountId}
                </CardDescription>
              </div>
              <Badge variant={account.brokerageAccess ? 'default' : 'secondary'}>
                {account.brokerageAccess ? '活跃' : '非活跃'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='grid grid-cols-2 gap-2 text-sm'>
              <div>
                <span className='text-muted-foreground'>账户类型:</span>
                <p className='font-medium'>{account.type}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>交易类型:</span>
                <p className='font-medium'>{account.tradingType}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>币种:</span>
                <p className='font-medium'>{account.currency}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>业务类型:</span>
                <p className='font-medium'>{account.businessType}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>IB实体:</span>
                <p className='font-medium'>{account.ibEntity}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>清算状态:</span>
                <p className='font-medium'>{account.clearingStatus}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>客户类型:</span>
                <p className='font-medium'>{account.acctCustType}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>账户状态:</span>
                <p className='font-medium'>
                  {account.accountStatus
                    ? format(new Date(account.accountStatus), 'yyyy-MM-dd')
                    : '未知'}
                </p>
              </div>
            </div>

            {account.accountAlias && (
              <div className='pt-2 border-t'>
                <span className='text-sm text-muted-foreground'>账户别名: </span>
                <span className='text-sm font-medium'>{account.accountAlias}</span>
              </div>
            )}

            <div className='flex flex-wrap gap-2 pt-2 border-t'>
              {account['PrepaidCrypto-Z'] && (
                <Badge variant='outline' className='text-xs'>
                  预付加密-Z
                </Badge>
              )}
              {account['PrepaidCrypto-P'] && (
                <Badge variant='outline' className='text-xs'>
                  预付加密-P
                </Badge>
              )}
              {account.faclient && (
                <Badge variant='outline' className='text-xs'>
                  FA客户
                </Badge>
              )}
              {account.covestor && (
                <Badge variant='outline' className='text-xs'>
                  Covestor
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
