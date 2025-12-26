import {
  Circle,
  CheckCircle,
  XCircle,
  Clock,
  PauseCircle,
  FileCode,
  Terminal,
  Globe,
  Database,
} from 'lucide-react'

export const taskTypes = [
  {
    value: 'python',
    label: 'Python',
    icon: FileCode,
  },
  {
    value: 'shell',
    label: 'Shell',
    icon: Terminal,
  },
  {
    value: 'api',
    label: 'API',
    icon: Globe,
  },
  {
    value: 'database',
    label: 'Database',
    icon: Database,
  },
]

export const statuses = [
  {
    label: '运行中',
    value: 'running' as const,
    icon: Clock,
  },
  {
    label: '成功',
    value: 'success' as const,
    icon: CheckCircle,
  },
  {
    label: '失败',
    value: 'failed' as const,
    icon: XCircle,
  },
  {
    label: '待执行',
    value: 'pending' as const,
    icon: Circle,
  },
  {
    label: '已停止',
    value: 'stopped' as const,
    icon: PauseCircle,
  },
]

export const priorities = [
  {
    label: '低',
    value: 'low' as const,
  },
  {
    label: '中',
    value: 'medium' as const,
  },
  {
    label: '高',
    value: 'high' as const,
  },
  {
    label: '紧急',
    value: 'critical' as const,
  },
]
