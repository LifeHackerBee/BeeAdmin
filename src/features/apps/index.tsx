import { type ChangeEvent, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { SlidersHorizontal, ArrowUpAZ, ArrowDownAZ, Star, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { apps, type AppCategory } from './data/apps'

const route = getRouteApi('/_authenticated/apps/')

type AppType = 'all' | 'connected' | 'notConnected'

const appTypeText = new Map<AppType, string>([
  ['all', '全部应用'],
  ['connected', '已连接'],
  ['notConnected', '未连接'],
])

const categoryText = new Map<AppCategory, string>([
  ['all', '全部分类'],
  ['tool', '工具'],
])

export function Apps() {
  const {
    filter = '',
    type = 'all',
    category = 'all',
    sort: initSort = 'asc',
  } = route.useSearch()
  const routeNavigate = route.useNavigate()
  const globalNavigate = useNavigate()

  const [sort, setSort] = useState(initSort)
  const [appType, setAppType] = useState(type)
  const [appCategory, setAppCategory] = useState<AppCategory>(category as AppCategory || 'all')
  const [searchTerm, setSearchTerm] = useState(filter)

  const filteredApps = apps
    .sort((a, b) =>
      sort === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    )
    .filter((app) =>
      appType === 'connected'
        ? app.connected
        : appType === 'notConnected'
          ? !app.connected
          : true
    )
    .filter((app) =>
      appCategory === 'all' ? true : app.category === appCategory
    )
    .filter((app) => app.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    routeNavigate({
      search: (prev) => ({
        ...prev,
        filter: e.target.value || undefined,
      }),
    })
  }

  const handleTypeChange = (value: AppType) => {
    setAppType(value)
    routeNavigate({
      search: (prev) => ({
        ...prev,
        type: value === 'all' ? undefined : value,
      }),
    })
  }

  const handleCategoryChange = (value: AppCategory) => {
    setAppCategory(value)
    routeNavigate({
      search: (prev) => ({
        ...prev,
        category: value === 'all' ? undefined : value,
      }),
    })
  }

  const handleSortChange = (sortValue: 'asc' | 'desc') => {
    setSort(sortValue)
    routeNavigate({ search: (prev) => ({ ...prev, sort: sortValue }) })
  }

  const handleAppClick = (appRoute?: string) => {
    if (appRoute) {
      globalNavigate({ to: appRoute })
    }
  }

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <div className='ms-auto flex items-center gap-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
        </div>
      </Header>

      {/* ===== Content ===== */}
      <Main fixed>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>应用市场</h1>
          <p className='text-muted-foreground'>
            发现各种实用工具，提升您的工作效率
          </p>
        </div>
        <div className='my-4 flex flex-col gap-4 sm:my-0 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-col gap-4 sm:flex-row'>
            <Input
              placeholder='搜索应用...'
              className='h-9 w-full sm:w-40 lg:w-[250px]'
              value={searchTerm}
              onChange={handleSearch}
            />
            <Select value={appCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className='w-full sm:w-36'>
                <SelectValue>{categoryText.get(appCategory)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部分类</SelectItem>
                <SelectItem value='tool'>工具</SelectItem>
              </SelectContent>
            </Select>
            <Select value={appType} onValueChange={handleTypeChange}>
              <SelectTrigger className='w-full sm:w-36'>
                <SelectValue>{appTypeText.get(appType)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部应用</SelectItem>
                <SelectItem value='connected'>已连接</SelectItem>
                <SelectItem value='notConnected'>未连接</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className='w-full sm:w-16'>
              <SelectValue>
                <SlidersHorizontal size={18} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent align='end'>
              <SelectItem value='asc'>
                <div className='flex items-center gap-4'>
                  <ArrowUpAZ size={16} />
                  <span>升序</span>
                </div>
              </SelectItem>
              <SelectItem value='desc'>
                <div className='flex items-center gap-4'>
                  <ArrowDownAZ size={16} />
                  <span>降序</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator className='shadow-sm' />
        <ul className='faded-bottom no-scrollbar grid gap-4 overflow-auto pt-4 pb-16 md:grid-cols-2 lg:grid-cols-3'>
          {filteredApps.map((app) => (
            <li
              key={app.name}
              className='group rounded-lg border p-4 transition-shadow hover:shadow-md cursor-pointer'
              onClick={() => handleAppClick(app.route)}
            >
              <div className='mb-4 flex items-start justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='flex size-12 items-center justify-center rounded-lg bg-muted text-2xl p-2'>
                    {app.logo}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h2 className='font-semibold truncate'>{app.name}</h2>
                    <div className='flex items-center gap-2 mt-1'>
                      {app.rating && (
                        <div className='flex items-center gap-1'>
                          <Star size={12} className='fill-yellow-400 text-yellow-400' />
                          <span className='text-xs text-muted-foreground'>
                            {app.rating}
                          </span>
                        </div>
                      )}
                      {app.users && (
                        <span className='text-xs text-muted-foreground'>
                          {app.users}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className={`shrink-0 ${app.connected ? 'border border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAppClick(app.route)
                  }}
                >
                  {app.route ? (
                    <span className='flex items-center gap-1'>
                      打开 <ExternalLink size={12} />
                    </span>
                  ) : app.connected ? '已连接' : '连接'}
                </Button>
              </div>
              <div className='space-y-2'>
                <p className='line-clamp-2 text-sm text-muted-foreground'>
                  {app.desc}
                </p>
                <Badge variant='secondary' className='text-xs'>
                  {categoryText.get(app.category)}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
        {filteredApps.length === 0 && (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <p className='text-muted-foreground'>未找到匹配的应用</p>
            <p className='text-sm text-muted-foreground mt-2'>
              尝试调整筛选条件
            </p>
          </div>
        )}
      </Main>
    </>
  )
}
