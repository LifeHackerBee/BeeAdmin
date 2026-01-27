import { createFileRoute } from '@tanstack/react-router'
import { Crawler } from '@/features/crawler'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

const ProtectedCrawler = withPageGuard(Crawler, BeeAdminModules.CRAWLER)

export const Route = createFileRoute('/_authenticated/apps/crawler/' as any)({
  component: ProtectedCrawler,
})
