import { Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWallets } from './tasks-provider'

export function WalletsPrimaryButtons() {
  const { setOpen } = useWallets()
  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('import')}
      >
        <span>导入</span> <Download size={18} />
      </Button>
      <Button className='space-x-1' onClick={() => setOpen('create')}>
        <span>添加巨鲸钱包</span> <Plus size={18} />
      </Button>
    </div>
  )
}
