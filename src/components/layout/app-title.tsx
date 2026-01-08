import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '../ui/button'
import { useTheme } from '@/context/theme-provider'

export function AppTitle() {
  const { setOpenMobile } = useSidebar()
  const { resolvedTheme } = useTheme()
  const faviconPath = resolvedTheme === 'dark' ? '/images/favicon_light.svg' : '/images/favicon.svg'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='gap-2 py-2 hover:bg-transparent active:bg-transparent'
          asChild
        >
          <div className='flex items-center gap-2'>
            <Link
              to='/'
              onClick={() => setOpenMobile(false)}
              className='flex items-center gap-2 flex-1 text-start'
            >
              <img
                src={faviconPath}
                alt='BeeAdmin Logo'
                className='size-6 flex-shrink-0'
              />
              <div className='grid flex-1 text-sm leading-tight'>
                <span className='truncate font-bold'>BeeAdmin</span>
                <span className='truncate text-xs'>人生黑客蜂的管理后台</span>
              </div>
            </Link>
            <ToggleSidebar />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function ToggleSidebar({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar='trigger'
      data-slot='sidebar-trigger'
      variant='ghost'
      size='icon'
      className={cn('aspect-square size-8 max-md:scale-125', className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <X className='md:hidden' />
      <Menu className='max-md:hidden' />
      <span className='sr-only'>Toggle Sidebar</span>
    </Button>
  )
}
