import { ConfirmDialog } from '@/components/confirm-dialog'
import { ExpensesImportDialog } from './expenses-import-dialog'
import { ExpensesMutateDrawer } from './expenses-mutate-drawer'
import { RecurringRuleDrawer } from './recurring-rule-drawer'
import { useExpenses } from './expenses-provider'
import { useDeleteExpense } from '../hooks/use-expense-mutations'

export function ExpensesDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useExpenses()
  const deleteMutation = useDeleteExpense()

  const handleDelete = async () => {
    if (!currentRow) return

    try {
      await deleteMutation.mutateAsync(currentRow.id)
      setOpen(null)
      setTimeout(() => {
        setCurrentRow(null)
      }, 500)
    } catch (error) {
      // 错误已经在 mutation 中处理了
      console.error('Failed to delete expense:', error)
    }
  }

  return (
    <>
      <ExpensesMutateDrawer
        key='expense-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      <ExpensesImportDialog
        key='expenses-import'
        open={open === 'import'}
        onOpenChange={() => setOpen('import')}
      />

      <RecurringRuleDrawer
        key='recurring-rule-create'
        open={open === 'recurring'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
          } else {
            setOpen('recurring')
          }
        }}
      />

      {currentRow && (
        <>
          <ExpensesMutateDrawer
            key={`expense-update-${currentRow.id}`}
            open={open === 'update'}
            onOpenChange={() => {
              setOpen('update')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <ConfirmDialog
            key='expense-delete'
            destructive
            open={open === 'delete'}
            onOpenChange={(open) => {
              if (!open) {
                setOpen(null)
                setTimeout(() => {
                  setCurrentRow(null)
                }, 500)
              } else {
                setOpen('delete')
              }
            }}
            handleConfirm={handleDelete}
            disabled={deleteMutation.isPending}
            className='max-w-md'
            title={`删除这条记录：${currentRow.id}？`}
            desc={
              <>
                您即将删除 ID 为{' '}
                <strong>{currentRow.id}</strong> 的记录。 <br />
                此操作无法撤销。
              </>
            }
            confirmText={deleteMutation.isPending ? '删除中...' : '删除'}
          />
        </>
      )}
    </>
  )
}

