import { useMemo, useState } from 'react'
import { AlertCircle, Download, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModuleGuard } from '@/components/rbac/module-guard'
import { BeeAdminModules } from '@/lib/rbac'
import { toast } from 'sonner'
import { useKolMvpLog } from './hooks/use-kol-performance'
import { ImportDialog } from './components/import-dialog'
import { SummaryCards } from './components/summary-cards'
import { RankingsTable } from './components/rankings-table'
import { AssetExperts } from './components/asset-experts'
import { RawRecordsTable } from './components/raw-records-table'
import { analyzeRecords, exportCsv } from './utils'

export function KolPerformancePage() {
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [importOpen, setImportOpen] = useState(false)

  const { records, isLoading, error, refetch, importMany, removeOne, removeAll } = useKolMvpLog({
    from: from || undefined,
    to: to || undefined,
  })

  const analysis = useMemo(() => analyzeRecords(records), [records])

  const handleDelete = async (id: number) => {
    try {
      await removeOne(id)
      toast.success('已删除')
    } catch (err) {
      toast.error(`删除失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleClearAll = async () => {
    try {
      await removeAll()
      toast.success('已清空全部记录')
    } catch (err) {
      toast.error(`清空失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleExport = () => {
    if (!analysis.results.length) {
      toast.error('暂无数据可导出')
      return
    }
    const csv = exportCsv(analysis)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kol_report_${analysis.latestDate ?? 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ModuleGuard module={BeeAdminModules.BEETRADER_KOL_PERFORMANCE}>
      <div className='flex flex-col space-y-4'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div className='flex flex-wrap items-end gap-3'>
            <div>
              <Label className='text-xs text-muted-foreground'>起始日期</Label>
              <Input
                type='date'
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className='w-40'
              />
            </div>
            <div>
              <Label className='text-xs text-muted-foreground'>结束日期</Label>
              <Input
                type='date'
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className='w-40'
              />
            </div>
            {(from || to) && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setFrom('')
                  setTo('')
                }}
              >
                清除
              </Button>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={() => refetch()}>
              <RefreshCw className='mr-2 h-4 w-4' />
              刷新
            </Button>
            <Button variant='outline' onClick={handleExport} disabled={!analysis.results.length}>
              <Download className='mr-2 h-4 w-4' />
              导出 CSV
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant='outline' disabled={!records.length}>
                  <Trash2 className='mr-2 h-4 w-4' />
                  清空
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清空所有 KOL MVP 记录？</AlertDialogTitle>
                  <AlertDialogDescription>
                    将删除你账号下的全部 {records.length} 条记录，此操作不可恢复。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll}>确认清空</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={() => setImportOpen(true)}>
              <Upload className='mr-2 h-4 w-4' />
              导入日志
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-24 w-full' />
            <Skeleton className='h-64 w-full' />
          </div>
        ) : error ? (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : records.length === 0 ? (
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>暂无数据</AlertTitle>
            <AlertDescription>
              点击右上角「导入日志」按钮，粘贴或上传 KOL MVP 日志文本。
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <SummaryCards analysis={analysis} />
            <Tabs defaultValue='rankings' className='w-full'>
              <TabsList>
                <TabsTrigger value='rankings'>综合排行</TabsTrigger>
                <TabsTrigger value='assets'>品种专家</TabsTrigger>
                <TabsTrigger value='raw'>原始记录 ({records.length})</TabsTrigger>
              </TabsList>
              <TabsContent value='rankings' className='mt-4'>
                <RankingsTable analysis={analysis} />
              </TabsContent>
              <TabsContent value='assets' className='mt-4'>
                <AssetExperts analysis={analysis} />
              </TabsContent>
              <TabsContent value='raw' className='mt-4'>
                <RawRecordsTable records={records} onDelete={handleDelete} />
              </TabsContent>
            </Tabs>
          </>
        )}

        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImport={async (entries) => {
            return importMany(entries)
          }}
        />
      </div>
    </ModuleGuard>
  )
}
