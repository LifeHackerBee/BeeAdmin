import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModuleGuard } from '@/components/rbac/module-guard'
import { BeeAdminModules } from '@/lib/rbac'
import { toast } from 'sonner'
import { useKolPerformance } from './hooks/use-kol-performance'
import { EntryDialog } from './components/entry-dialog'
import { PerformanceChart } from './components/performance-chart'
import { RecordsTable } from './components/records-table'
import { StatsCards } from './components/stats-cards'

export function KolPerformancePage() {
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { records, isLoading, error, refetch, createMany, removeOne } = useKolPerformance({
    from: from || undefined,
    to: to || undefined,
  })

  const handleDelete = async (id: number) => {
    try {
      await removeOne(id)
      toast.success('已删除')
    } catch (err) {
      toast.error(`删除失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <ModuleGuard module={BeeAdminModules.BEETRADER_KOL_PERFORMANCE}>
      <div className='flex flex-col space-y-4'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div className='flex flex-wrap items-end gap-3'>
            <div>
              <Label className='text-xs text-muted-foreground'>起始日期</Label>
              <Input type='date' value={from} onChange={(e) => setFrom(e.target.value)} className='w-40' />
            </div>
            <div>
              <Label className='text-xs text-muted-foreground'>结束日期</Label>
              <Input type='date' value={to} onChange={(e) => setTo(e.target.value)} className='w-40' />
            </div>
            {(from || to) && (
              <Button variant='ghost' size='sm' onClick={() => { setFrom(''); setTo('') }}>
                清除
              </Button>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={() => refetch()}>
              <RefreshCw className='mr-2 h-4 w-4' />
              刷新
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              录入战绩
            </Button>
          </div>
        </div>

        <StatsCards records={records} />

        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-32 w-full' />
            <Skeleton className='h-64 w-full' />
          </div>
        ) : error ? (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue='chart' className='w-full'>
            <TabsList>
              <TabsTrigger value='chart'>战绩图</TabsTrigger>
              <TabsTrigger value='records'>明细 ({records.length})</TabsTrigger>
            </TabsList>
            <TabsContent value='chart' className='mt-4'>
              <PerformanceChart records={records} />
            </TabsContent>
            <TabsContent value='records' className='mt-4'>
              <RecordsTable records={records} onDelete={handleDelete} />
            </TabsContent>
          </Tabs>
        )}

        <EntryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={async (entries) => {
            await createMany(entries)
          }}
        />
      </div>
    </ModuleGuard>
  )
}
