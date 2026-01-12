import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type Row } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Liability } from '../data/schema'
import { useLiabilitiesDialogs } from './liabilities-provider'

type DataTableRowActionsProps = {
  row: Row<Liability>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const liability = row.original
  const { setDeleteDialogOpen, setMutateDrawerOpen, setCurrentRow } =
    useLiabilitiesDialogs()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <DotsHorizontalIcon className='h-4 w-4' />
          <span className='sr-only'>打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(liability)
            setMutateDrawerOpen(true)
          }}
        >
          编辑
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(liability)
            setDeleteDialogOpen(true)
          }}
          className='text-destructive'
        >
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
