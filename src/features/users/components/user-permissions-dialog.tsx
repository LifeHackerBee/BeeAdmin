/**
 * 用户权限管理对话框
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { BeeAdminModules } from '@/lib/rbac'
import type { UserProfile } from '../hooks/use-user-profiles'

interface UserPermissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserProfile | null
  onSave: (userId: string, roles: string[], modules: string[]) => Promise<void>
}

const AVAILABLE_ROLES = [
  { value: 'admin', label: '管理员', description: '拥有所有权限' },
  { value: 'manager', label: '经理', description: '拥有大部分权限' },
  { value: 'user', label: '普通用户', description: '拥有基本权限' },
  { value: 'guest', label: '访客', description: '只读权限' },
]

const AVAILABLE_MODULES = [
  { value: BeeAdminModules.BEETRADER, label: 'BeeTrader', description: '交易平台（包含所有子模块）' },
  { value: BeeAdminModules.BEETRADER_TRACKER, label: '┗ Tracker', description: '钱包追踪' },
  { value: BeeAdminModules.BEETRADER_BACKTEST, label: '┗ Backtest', description: '回测系统' },
  { value: BeeAdminModules.BEETRADER_ANALYZER, label: '┗ Analyzer', description: '分析器' },
  { value: BeeAdminModules.BEETRADER_EVENTS, label: '┗ Events', description: '事件管理' },
  { value: BeeAdminModules.BEEAI, label: 'BeeAI', description: '智能助手' },
  { value: BeeAdminModules.FINANCE, label: 'Finance', description: '财务管理（包含所有子模块）' },
  { value: BeeAdminModules.FINANCE_EXPENSES, label: '┗ Expenses', description: '支出管理' },
  { value: BeeAdminModules.FINANCE_ASSETS, label: '┗ Assets', description: '资产管理' },
  { value: BeeAdminModules.FINANCE_LIABILITIES, label: '┗ Liabilities', description: '负债管理' },
  { value: BeeAdminModules.FIRE, label: 'FIRE', description: 'FIRE 计划' },
  { value: BeeAdminModules.MONITORING, label: 'Monitoring', description: '监控模块' },
  { value: BeeAdminModules.TASKS, label: 'Tasks', description: '任务管理' },
  { value: BeeAdminModules.APPS, label: 'Apps', description: '应用中心' },
  { value: BeeAdminModules.CRAWLER, label: 'Crawler', description: '爬虫模块' },
  { value: BeeAdminModules.USERS, label: 'Users', description: '用户管理' },
]

export function UserPermissionsDialog({ open, onOpenChange, user, onSave }: UserPermissionsDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user?.roles || [])
  const [selectedModules, setSelectedModules] = useState<string[]>(user?.allowed_modules || [])
  const [saving, setSaving] = useState(false)

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const handleModuleToggle = (module: string) => {
    setSelectedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    )
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)
      await onSave(user.id, selectedRoles, selectedModules)
      onOpenChange(false)
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setSaving(false)
    }
  }

  const isAdmin = selectedRoles.includes('admin')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>编辑用户权限</DialogTitle>
          <DialogDescription>
            {user?.email} - {user?.full_name || '未设置名称'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {/* 角色选择 */}
            <div>
              <Label className="text-base font-semibold">角色</Label>
              <p className="text-sm text-muted-foreground mb-3">
                选择用户的角色（可多选）
              </p>
              <div className="space-y-3">
                {AVAILABLE_ROLES.map((role) => (
                  <div key={role.value} className="flex items-start space-x-3">
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={() => handleRoleToggle(role.value)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={`role-${role.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {role.label}
                      </label>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* 模块权限选择 */}
            <div>
              <Label className="text-base font-semibold">模块权限</Label>
              <p className="text-sm text-muted-foreground mb-3">
                {isAdmin
                  ? '管理员拥有所有模块权限，无需单独设置'
                  : '选择用户可以访问的模块（空表示允许所有）'}
              </p>
              {isAdmin ? (
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    当前用户拥有管理员角色，可以访问所有模块。
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {AVAILABLE_MODULES.map((module) => (
                    <div key={module.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={`module-${module.value}`}
                        checked={selectedModules.includes(module.value)}
                        onCheckedChange={() => handleModuleToggle(module.value)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={`module-${module.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {module.label}
                        </label>
                        <p className="text-xs text-muted-foreground">{module.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedRoles.length === 0}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
