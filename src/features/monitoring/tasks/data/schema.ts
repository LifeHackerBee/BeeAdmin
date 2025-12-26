import { z } from 'zod'

// 后台任务 Schema，适配 Python 定时任务等
export const taskSchema = z.object({
  id: z.string(),
  name: z.string(), // 任务名称
  type: z.string(), // 任务类型：python, shell, api 等
  status: z.string(), // 状态：running, success, failed, pending, stopped
  schedule: z.string(), // 调度配置：cron 表达式或间隔时间
  lastRun: z.date().optional(), // 最后运行时间
  nextRun: z.date().optional(), // 下次运行时间
  duration: z.number().optional(), // 执行时长（秒）
  successCount: z.number().optional(), // 成功次数
  failureCount: z.number().optional(), // 失败次数
  description: z.string().optional(), // 任务描述
  scriptPath: z.string().optional(), // 脚本路径
  createdAt: z.date().optional(), // 创建时间
  updatedAt: z.date().optional(), // 更新时间
})

export type Task = z.infer<typeof taskSchema>
