import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useAssetsDialogs } from './assets-provider'

export function AssetsPrimaryButtons() {
  const { setMutateDrawerOpen, setCurrentRow } = useAssetsDialogs()

  return (
    <Button
      onClick={() => {
        setCurrentRow(undefined)
        setMutateDrawerOpen(true)
      }}
    >
      <Plus className='mr-2 h-4 w-4' />
      新增资产
    </Button>
  )
}
