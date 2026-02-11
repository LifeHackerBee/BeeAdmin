import { useState } from 'react'
import { useHistory, type TraderAnalysisRecord } from '../hooks/use-history'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, Clock, RefreshCw, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { AnalysisResult } from './analysis-result'
import { type AnalyzeResponse } from '../hooks/use-analyzer'

function HistoryTable() {
  const { records, loading, error, refetch, convertToAnalyzeResponse } = useHistory()
  const [selectedRecord, setSelectedRecord] = useState<AnalyzeResponse | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleSelectRecord = (record: TraderAnalysisRecord) => {
    const response = convertToAnalyzeResponse(record)
    setSelectedRecord(response)
    setIsDialogOpen(true)
  }

  const getSignalStrengthColor = (strength: string | null | undefined) => {
    if (!strength) return 'bg-gray-500'
    switch (strength.toUpperCase()) {
      case 'HIGH':
        return 'bg-green-500'
      case 'MEDIUM':
        return 'bg-yellow-500'
      case 'LOW':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getRiskLevelColor = (level: string | null | undefined) => {
    if (!level) return 'bg-gray-500'
    switch (level.toUpperCase()) {
      case 'LOW':
        return 'bg-green-500'
      case 'MEDIUM':
        return 'bg-yellow-500'
      case 'HIGH':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'N/A'
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <>
      <div className='flex h-full flex-col space-y-4'>
        <div className='flex items-center justify-between flex-shrink-0'>
          <div>
            <h3 className='text-lg font-semibold'>历史分析记录</h3>
            <p className='text-sm text-muted-foreground'>
              共 {records.length} 条记录
            </p>
          </div>
          <Button variant='outline' size='sm' onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
        </div>

        <div className='flex-1 overflow-auto border rounded-md'>
          {loading ? (
            <div className='p-4 space-y-4'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </div>
          ) : error ? (
            <Alert variant='destructive' className='m-4'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>加载失败</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : records.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 px-4'>
              <Clock className='h-12 w-12 text-muted-foreground mb-4' />
              <p className='text-muted-foreground'>暂无历史记录</p>
              <p className='text-sm text-muted-foreground mt-2'>
                在"新分析"标签页中分析交易者地址后，记录会显示在这里
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[200px]'>钱包地址</TableHead>
                  <TableHead className='w-[120px]'>类型</TableHead>
                  <TableHead className='w-[100px]'>信号强度</TableHead>
                  <TableHead className='w-[100px]'>风险等级</TableHead>
                  <TableHead className='w-[150px]'>账户价值</TableHead>
                  <TableHead className='w-[100px]'>分析天数</TableHead>
                  <TableHead className='w-[180px]'>分析时间</TableHead>
                  <TableHead className='w-[100px] text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} className='cursor-pointer hover:bg-muted/50'>
                    <TableCell className='font-mono text-sm'>
                      <button
                        onClick={() => handleSelectRecord(record)}
                        className='text-primary hover:underline flex items-center gap-1'
                      >
                        {formatAddress(record.wallet_address)}
                        <ExternalLink className='h-3 w-3' />
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline'>{record.trader_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {record.signal_strength ? (
                        <Badge className={getSignalStrengthColor(record.signal_strength)} variant='outline'>
                          {record.signal_strength}
                        </Badge>
                      ) : (
                        <span className='text-muted-foreground text-sm'>-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.risk_level ? (
                        <Badge className={getRiskLevelColor(record.risk_level)} variant='outline'>
                          {record.risk_level}
                        </Badge>
                      ) : (
                        <span className='text-muted-foreground text-sm'>-</span>
                      )}
                    </TableCell>
                    <TableCell className='font-medium'>
                      {formatCurrency(record.account_value)}
                    </TableCell>
                    <TableCell>{record.analysis_days} 天</TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleSelectRecord(record)}
                      >
                        查看详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* 详情 Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='max-w-5xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>分析详情</DialogTitle>
            <DialogDescription className='font-mono break-all'>
              {selectedRecord?.address}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className='mt-4 pr-2'>
              <AnalysisResult data={selectedRecord} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function HistoryList() {
  return <HistoryTable />
}
