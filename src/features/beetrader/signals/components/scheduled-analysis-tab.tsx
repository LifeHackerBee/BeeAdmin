import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Timer, Play, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

interface ScheduledConfig {
  id: number
  enabled: boolean
  interval_minutes: number
  trigger_minutes: number[] | null
  coins: string[] | null
  last_run_at: string | null
  updated_at: string
}

const TRIGGER_PRESETS = [
  { label: '整点', value: [0], desc: '每小时 :00 触发' },
  { label: '半点', value: [0, 30], desc: '每小时 :00 和 :30 触发' },
  { label: '每15分钟', value: [0, 15, 30, 45], desc: ':00 :15 :30 :45' },
]

const INTERVAL_OPTIONS = [
  { value: '5', label: '5 分钟' },
  { value: '10', label: '10 分钟' },
  { value: '15', label: '15 分钟' },
  { value: '30', label: '30 分钟' },
  { value: '60', label: '1 小时' },
  { value: '120', label: '2 小时' },
  { value: '240', label: '4 小时' },
]

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'
  const apiKey = import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function apiPost<T>(path: string): Promise<T> {
  const baseUrl = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'
  const apiKey = import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) },
  })
  return res.json()
}

export function ScheduledAnalysisTab() {
  const [config, setConfig] = useState<ScheduledConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [triggering, setTriggering] = useState(false)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await hyperliquidApiGet<{ success: boolean; config: ScheduledConfig | null }>(
        '/api/beetrader_strategy/scheduled/config'
      )
      setConfig(res.config)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleToggle = async (enabled: boolean) => {
    setSaving(true)
    try {
      const res = await apiPatch<{ success: boolean; config: ScheduledConfig }>('/api/beetrader_strategy/scheduled/config', { enabled })
      if (res.success && res.config) setConfig(res.config)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const handleIntervalChange = async (value: string) => {
    setSaving(true)
    try {
      const res = await apiPatch<{ success: boolean; config: ScheduledConfig }>('/api/beetrader_strategy/scheduled/config', { interval_minutes: Number(value), trigger_minutes: [] })
      if (res.success && res.config) setConfig(res.config)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const handleTriggerPreset = async (minutes: number[]) => {
    setSaving(true)
    try {
      const res = await apiPatch<{ success: boolean; config: ScheduledConfig }>('/api/beetrader_strategy/scheduled/config', { trigger_minutes: minutes })
      if (res.success && res.config) setConfig(res.config)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const handleCoinsChange = async (coinsStr: string) => {
    const coins = coinsStr.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
    setSaving(true)
    try {
      const res = await apiPatch<{ success: boolean; config: ScheduledConfig }>('/api/beetrader_strategy/scheduled/config', { coins })
      if (res.success && res.config) setConfig(res.config)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const handleRunNow = async () => {
    setTriggering(true)
    try {
      await apiPost('/api/beetrader_strategy/scheduled/run-now')
      // 等 2 秒后刷新配置看 last_run_at
      setTimeout(fetchConfig, 3000)
    } catch { /* ignore */ } finally {
      setTriggering(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className='py-8 flex items-center justify-center'>
          <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
        </CardContent>
      </Card>
    )
  }

  if (!config) {
    return (
      <Card>
        <CardContent className='py-8 text-center text-muted-foreground'>
          <p className='text-sm'>定时分析配置未初始化</p>
          <p className='text-xs mt-1'>请在 Supabase 中执行 scheduled_analysis_config 迁移 SQL</p>
        </CardContent>
      </Card>
    )
  }

  const lastRunTime = config.last_run_at ? new Date(config.last_run_at) : null
  const minutesSinceRun = lastRunTime
    ? Math.round((Date.now() - lastRunTime.getTime()) / 60000)
    : null

  return (
    <div className='space-y-3'>
      {/* 控制面板 */}
      <Card>
        <CardContent className='py-4 px-4 space-y-4'>
          <div className='flex items-center gap-2'>
            <Timer className='h-4 w-4 text-blue-500' />
            <span className='text-sm font-medium'>定时分析配置</span>
            <Badge variant={config.enabled ? 'default' : 'secondary'} className='text-[10px] px-1.5 py-0 h-5'>
              {config.enabled ? '运行中' : '已停止'}
            </Badge>
          </div>

          {/* 控制区 */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'>
            {/* 启停 */}
            <div className='space-y-2'>
              <Label className='text-xs'>启用</Label>
              <div className='flex items-center gap-2'>
                <Switch checked={config.enabled} onCheckedChange={handleToggle} disabled={saving} />
                <span className='text-xs text-muted-foreground'>{config.enabled ? '运行中' : '已暂停'}</span>
              </div>
            </div>

            {/* 触发模式 */}
            <div className='space-y-2'>
              <Label className='text-xs'>触发时间点</Label>
              <div className='flex gap-1 flex-wrap'>
                {TRIGGER_PRESETS.map((preset) => {
                  const isActive = config.trigger_minutes &&
                    JSON.stringify(config.trigger_minutes) === JSON.stringify(preset.value)
                  return (
                    <Button
                      key={preset.label}
                      variant={isActive ? 'default' : 'outline'}
                      size='sm'
                      className='h-7 text-[10px] px-2'
                      onClick={() => handleTriggerPreset(preset.value)}
                      disabled={saving}
                      title={preset.desc}
                    >
                      {preset.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* 间隔模式 (当没有 trigger_minutes 时生效) */}
            <div className='space-y-2'>
              <Label className='text-xs'>间隔频率 {config.trigger_minutes?.length ? <span className='text-muted-foreground'>(已用时间点模式)</span> : ''}</Label>
              <Select
                value={String(config.interval_minutes)}
                onValueChange={handleIntervalChange}
                disabled={saving}
              >
                <SelectTrigger className='h-8 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>每 {opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 分析币种 */}
            <div className='space-y-2'>
              <Label className='text-xs'>分析币种</Label>
              <Input
                defaultValue={(config.coins?.length ? config.coins : ['BTC', 'ETH']).join(', ')}
                onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleCoinsChange(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleCoinsChange((e.target as HTMLInputElement).value)}
                className='h-8 text-xs'
                placeholder='BTC, ETH, SOL'
                disabled={saving}
              />
            </div>

            {/* 手动触发 */}
            <div className='space-y-2'>
              <Label className='text-xs'>手动触发</Label>
              <Button size='sm' variant='outline' className='h-8 text-xs gap-1 w-full' onClick={handleRunNow} disabled={triggering}>
                {triggering ? <><Loader2 className='h-3.5 w-3.5 animate-spin' /> 触发中...</> : <><Play className='h-3.5 w-3.5' /> 立即执行一次</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 运行状态 */}
      <Card>
        <CardContent className='py-3 px-4'>
          <div className='flex items-center gap-2 text-xs'>
            <span className='text-muted-foreground'>运行状态:</span>
            {config.enabled ? (
              <span className='flex items-center gap-1 text-green-500'>
                <CheckCircle className='h-3 w-3' /> 已启用
              </span>
            ) : (
              <span className='flex items-center gap-1 text-red-500'>
                <XCircle className='h-3 w-3' /> 已停止
              </span>
            )}
            <span className='text-muted-foreground'>·</span>
            <span className='text-muted-foreground'>
              {config.trigger_minutes?.length
                ? `时间点: 每小时 :${config.trigger_minutes.map(m => String(m).padStart(2, '0')).join(' :')}`
                : `间隔: 每 ${config.interval_minutes} 分钟`}
            </span>
            <span className='text-muted-foreground'>·</span>
            <span className='text-muted-foreground'>
              币种: {(config.coins?.length ? config.coins : ['BTC', 'ETH']).join(', ')}
            </span>
            <span className='text-muted-foreground'>·</span>
            {lastRunTime ? (
              <span className='flex items-center gap-1 text-muted-foreground'>
                <Clock className='h-3 w-3' />
                上次运行: {lastRunTime.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Shanghai' })}
                ({minutesSinceRun} 分钟前)
              </span>
            ) : (
              <span className='text-muted-foreground'>尚未运行</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 说明 */}
      <Card>
        <CardContent className='py-3 px-4 text-[10px] text-muted-foreground space-y-1'>
          <p><b>工作原理:</b> Celery Beat 每分钟检查配置，满足间隔条件时自动分析所有运行中的机器人币种。</p>
          <p><b>分析内容:</b> beetrader 技术分析引擎（多周期指标、阶梯形态、共振评分）+ AI 策略信号生成（调用 OpenAI）。</p>
          <p><b>数据存储:</b> 结果写入 analysis_history 表（source=scheduled），保留 7 天。</p>
          <p><b>分析币种:</b> 在上方配置，默认 BTC, ETH。与策略机器人独立运行。</p>
        </CardContent>
      </Card>
    </div>
  )
}
