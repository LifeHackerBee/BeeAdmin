'use client'

import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Wallet } from '../data/schema'
import { useWallets } from '../hooks/use-wallets'

type WalletsMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

const CONFIRM_WORD = '删除'

export function WalletsMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: WalletsMultiDeleteDialogProps<TData>) {
  const [value, setValue] = useState('')
  const { deleteWallets, refetch } = useWallets()

  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleDelete = async () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(`请输入"${CONFIRM_WORD}"以确认。`)
      return
    }

    try {
      const walletIds = selectedRows.map((row) => (row.original as Wallet).id)
      
      await deleteWallets(walletIds)
      await refetch()
      
      setValue('')
      table.resetRowSelection()
      onOpenChange(false)
      toast.success(`已删除 ${selectedRows.length} 个巨鲸钱包`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除失败'
      toast.error(errorMessage)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== CONFIRM_WORD}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          删除 {selectedRows.length} 个巨鲸钱包
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            您确定要删除选中的巨鲸钱包吗？ <br />
            此操作无法撤销。
          </p>

          <Label className='my-4 flex flex-col items-start gap-1.5'>
            <span className=''>请输入"{CONFIRM_WORD}"以确认：</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`请输入"${CONFIRM_WORD}"以确认。`}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>警告！</AlertTitle>
            <AlertDescription>
              请谨慎操作，此操作无法撤销。
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText='删除'
      destructive
    />
  )
}
