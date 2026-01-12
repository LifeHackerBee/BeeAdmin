import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useLiabilitiesDialogs } from './liabilities-provider'

export function LiabilitiesPrimaryButtons() {
  const { setMutateDrawerOpen, setCurrentRow } = useLiabilitiesDialogs()

  return (
    <Button
      onClick={() => {
        setCurrentRow(undefined)
        setMutateDrawerOpen(true)
      }}
    >
      <Plus className='mr-2 h-4 w-4' />
      新增负债
    </Button>
  )
}
