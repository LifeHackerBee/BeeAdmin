import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { hyperliquidApiGet, hyperliquidApiPut, hyperliquidApiPost } from '@/lib/hyperliquid-api-client'
import { ContentSection } from '../components/content-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Send, Save } from 'lucide-react'

interface NotificationConfig {
  enabled: boolean
  smtp_host: string
  smtp_port: number
  smtp_ssl: boolean
  smtp_user: string
  smtp_password: string
  smtp_from: string
  notify_to_email: string
  notify_on_open: boolean
  notify_on_close: boolean
  notify_on_add: boolean
  notify_on_reduce: boolean
}

const defaultConfig: NotificationConfig = {
  enabled: false,
  smtp_host: '',
  smtp_port: 465,
  smtp_ssl: true,
  smtp_user: '',
  smtp_password: '',
  smtp_from: '',
  notify_to_email: '',
  notify_on_open: true,
  notify_on_close: true,
  notify_on_add: true,
  notify_on_reduce: true,
}

export function EmailNotification() {
  const [config, setConfig] = useState<NotificationConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      setLoading(true)
      const data = await hyperliquidApiGet<NotificationConfig>('/api/notification/config')
      setConfig({ ...defaultConfig, ...data })
    } catch (e) {
      console.error('加载通知配置失败:', e)
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      await hyperliquidApiPut('/api/notification/config', config)
      toast.success('配置已保存')
    } catch (e) {
      console.error('保存失败:', e)
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    try {
      setTesting(true)
      const res = await hyperliquidApiPost<{ message: string }>('/api/notification/test')
      toast.success(res.message || '测试邮件已发送')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '发送失败'
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  function update(field: keyof NotificationConfig, value: string | number | boolean) {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <ContentSection title="邮件通知" desc="配置 SMTP 邮箱，接收交易信号通知">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ContentSection>
    )
  }

  return (
    <ContentSection title="邮件通知" desc="配置 SMTP 邮箱，接收开仓/平仓/加仓/减仓通知">
      <div className="space-y-6">
        {/* 总开关 */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">启用邮件通知</Label>
            <p className="text-sm text-muted-foreground">
              开启后，交易事件将通过邮件发送通知
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(v) => update('enabled', v)}
          />
        </div>

        <Separator />

        {/* SMTP 配置 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">SMTP 服务器</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">SMTP 主机</Label>
              <Input
                id="smtp_host"
                placeholder="smtp.qq.com"
                value={config.smtp_host || ''}
                onChange={(e) => update('smtp_host', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port">端口</Label>
              <Input
                id="smtp_port"
                type="number"
                placeholder="465"
                value={config.smtp_port}
                onChange={(e) => update('smtp_port', parseInt(e.target.value) || 465)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="smtp_ssl"
              checked={config.smtp_ssl}
              onCheckedChange={(v) => update('smtp_ssl', v)}
            />
            <Label htmlFor="smtp_ssl">使用 SSL</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_user">SMTP 用户名</Label>
            <Input
              id="smtp_user"
              placeholder="your@qq.com"
              value={config.smtp_user || ''}
              onChange={(e) => update('smtp_user', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_password">SMTP 密码 / 授权码</Label>
            <Input
              id="smtp_password"
              type="password"
              placeholder="授权码"
              value={config.smtp_password || ''}
              onChange={(e) => update('smtp_password', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_from">发件人地址 (可选)</Label>
            <Input
              id="smtp_from"
              placeholder="默认同 SMTP 用户名"
              value={config.smtp_from || ''}
              onChange={(e) => update('smtp_from', e.target.value)}
            />
          </div>
        </div>

        <Separator />

        {/* 收件人 */}
        <div className="space-y-2">
          <Label htmlFor="notify_to_email">收件人邮箱</Label>
          <Input
            id="notify_to_email"
            placeholder="your@email.com"
            value={config.notify_to_email || ''}
            onChange={(e) => update('notify_to_email', e.target.value)}
          />
        </div>

        <Separator />

        {/* 事件开关 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">通知事件</h4>
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>开仓通知</Label>
                  <p className="text-xs text-muted-foreground">AI 发出做多/做空信号时通知</p>
                </div>
                <Switch
                  checked={config.notify_on_open}
                  onCheckedChange={(v) => update('notify_on_open', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>平仓通知</Label>
                  <p className="text-xs text-muted-foreground">AI 发出平仓信号，附带盈亏</p>
                </div>
                <Switch
                  checked={config.notify_on_close}
                  onCheckedChange={(v) => update('notify_on_close', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>加仓通知</Label>
                  <p className="text-xs text-muted-foreground">AI 发出加仓信号时通知</p>
                </div>
                <Switch
                  checked={config.notify_on_add}
                  onCheckedChange={(v) => update('notify_on_add', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>减仓通知</Label>
                  <p className="text-xs text-muted-foreground">AI 发出减仓信号时通知</p>
                </div>
                <Switch
                  checked={config.notify_on_reduce}
                  onCheckedChange={(v) => update('notify_on_reduce', v)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            保存配置
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            发送测试邮件
          </Button>
        </div>
      </div>
    </ContentSection>
  )
}
