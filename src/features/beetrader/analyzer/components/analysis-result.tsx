import { type AnalyzeResponse } from '../hooks/use-analyzer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, TrendingUp, TrendingDown, Shield, DollarSign } from 'lucide-react'

export function AnalysisResult({ data }: { data: AnalyzeResponse }) {
  const { analysis } = data
  const { key_metrics, data_quality } = analysis

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

  const formatPercent = (value: number | null | undefined) => {
    if (value == null) return 'N/A'
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const dataQualityScore = [
    data_quality.has_portfolio,
    data_quality.has_user_state,
    data_quality.has_user_fees,
    data_quality.has_ledger,
    data_quality.has_funding,
  ].filter(Boolean).length

  return (
    <div className='space-y-6'>
      {/* 分析概览 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-xl'>分析结果</CardTitle>
              <CardDescription>地址: {data.address}</CardDescription>
            </div>
            <div className='flex gap-2'>
              <Badge className={getSignalStrengthColor(analysis.signal_strength)}>
                {analysis.signal_strength || '未知'}
              </Badge>
              <Badge variant='outline' className={getRiskLevelColor(analysis.risk_level)}>
                风险: {analysis.risk_level || '未知'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <div className='text-sm text-muted-foreground mb-1'>账户类型</div>
            <div className='text-lg font-semibold'>{analysis.type || '未知'}</div>
          </div>
          <div>
            <div className='text-sm text-muted-foreground mb-1'>分析理由</div>
            <div className='text-sm whitespace-pre-wrap break-words'>{analysis.reason || '无'}</div>
          </div>
        </CardContent>
      </Card>

      {/* 关键指标 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg flex items-center gap-2'>
            <TrendingUp className='h-5 w-5' />
            关键指标
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            <div className='space-y-1 min-w-0'>
              <div className='text-sm text-muted-foreground flex items-center gap-1'>
                <DollarSign className='h-4 w-4 flex-shrink-0' />
                账户价值
              </div>
              <div className='text-xl sm:text-2xl font-bold break-words'>
                {formatCurrency(key_metrics.account_value)}
              </div>
            </div>
            <div className='space-y-1 min-w-0'>
              <div className='text-sm text-muted-foreground flex items-center gap-1'>
                <TrendingDown className='h-4 w-4 flex-shrink-0' />
                最大回撤
              </div>
              <div className='text-xl sm:text-2xl font-bold text-red-500 break-words'>
                {formatPercent(key_metrics.max_drawdown)}
              </div>
            </div>
            <div className='space-y-1 min-w-0'>
              <div className='text-sm text-muted-foreground flex items-center gap-1'>
                <TrendingUp className='h-4 w-4 flex-shrink-0' />
                总盈亏
              </div>
              <div
                className={`text-xl sm:text-2xl font-bold break-words ${key_metrics.total_pnl != null && key_metrics.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {formatCurrency(key_metrics.total_pnl)}
              </div>
            </div>
            <div className='space-y-1 min-w-0'>
              <div className='text-sm text-muted-foreground'>Maker 比例</div>
              <div className='text-xl sm:text-2xl font-bold break-words'>
                {key_metrics.maker_ratio != null ? formatPercent(key_metrics.maker_ratio * 100) : 'N/A'}
              </div>
            </div>
            <div className='space-y-1 min-w-0'>
              <div className='text-sm text-muted-foreground'>杠杆倍数</div>
              <div className='text-xl sm:text-2xl font-bold break-words'>
                {key_metrics.leverage != null ? `${key_metrics.leverage.toFixed(2)}x` : 'N/A'}
              </div>
            </div>
            {/* 最近 N 笔胜率 - 高亮便于在 /beetrader/analyzer 页面快速找到 */}
            <div
              id='analyzer-recent-win-rate'
              className='space-y-1 min-w-0 rounded-lg border-2 border-amber-400 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-500 px-3 py-2'
            >
              <div className='text-sm text-muted-foreground font-medium'>
                最近 {key_metrics.recent_trades ?? '—'} 笔胜率
              </div>
              <div className='flex flex-wrap items-baseline gap-2'>
                {key_metrics.recent_trades != null && key_metrics.recent_trades > 0 ? (
                  <>
                    <span
                      className={`text-xl sm:text-2xl font-bold ${
                        (key_metrics.recent_win_rate ?? 0) >= 50 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {key_metrics.recent_win_rate != null ? `${key_metrics.recent_win_rate}%` : 'N/A'}
                    </span>
                    <span className='text-sm text-muted-foreground'>
                      （胜 {key_metrics.recent_win_count ?? 0} / 负 {key_metrics.recent_loss_count ?? 0}）
                    </span>
                  </>
                ) : (
                  <span className='text-muted-foreground'>暂无平仓数据</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据质量 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg flex items-center gap-2'>
            <Shield className='h-5 w-5' />
            数据质量
          </CardTitle>
          <CardDescription>数据完整性: {dataQualityScore}/5</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
            <div className='flex items-center gap-2'>
              <div
                className={`w-3 h-3 rounded-full ${data_quality.has_portfolio ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <span className='text-sm'>Portfolio</span>
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`w-3 h-3 rounded-full ${data_quality.has_user_state ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <span className='text-sm'>User State</span>
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`w-3 h-3 rounded-full ${data_quality.has_user_fees ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <span className='text-sm'>User Fees</span>
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`w-3 h-3 rounded-full ${data_quality.has_ledger ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <span className='text-sm'>Ledger</span>
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`w-3 h-3 rounded-full ${data_quality.has_funding ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <span className='text-sm'>Funding</span>
            </div>
          </div>
          {data_quality.errors.length > 0 && (
            <Alert variant='destructive' className='mt-4'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>数据错误</AlertTitle>
              <AlertDescription>
                <ul className='list-disc list-inside mt-2'>
                  {data_quality.errors.map((error, index) => (
                    <li key={index} className='text-sm'>
                      {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
