import { faker } from '@faker-js/faker'

// Set a fixed seed for consistent data generation
faker.seed(12345)

const taskTypes = ['python', 'shell', 'api', 'database'] as const
const statuses = ['running', 'success', 'failed', 'pending', 'stopped'] as const
const schedules = [
  '0 */6 * * *', // 每6小时
  '0 0 * * *', // 每天午夜
  '0 */12 * * *', // 每12小时
  '*/30 * * * *', // 每30分钟
  '0 9 * * 1-5', // 工作日早上9点
  '0 0 1 * *', // 每月1号
] as const

export const tasks = Array.from({ length: 50 }, () => {
  const type = faker.helpers.arrayElement(taskTypes)
  const status = faker.helpers.arrayElement(statuses)
  const schedule = faker.helpers.arrayElement(schedules)
  const lastRun = faker.date.recent({ days: 7 })
  const nextRun = new Date(lastRun.getTime() + faker.number.int({ min: 3600000, max: 86400000 }))

  return {
    id: `TASK-${faker.number.int({ min: 1000, max: 9999 })}`,
    name: faker.helpers.arrayElement([
      '数据同步任务',
      'Web3 钱包监控',
      '价格数据采集',
      '交易信号生成',
      '数据库备份',
      '日志清理',
      'API 健康检查',
      '报告生成',
      '邮件发送',
      '数据统计',
    ]),
    type,
    status,
    schedule,
    lastRun,
    nextRun,
    duration: faker.number.int({ min: 5, max: 300 }),
    successCount: faker.number.int({ min: 0, max: 1000 }),
    failureCount: faker.number.int({ min: 0, max: 50 }),
    description: faker.lorem.sentence({ min: 5, max: 15 }),
    scriptPath: type === 'python' 
      ? `/scripts/${faker.system.fileName()}.py`
      : type === 'shell'
      ? `/scripts/${faker.system.fileName()}.sh`
      : undefined,
    createdAt: faker.date.past({ years: 1 }),
    updatedAt: faker.date.recent({ days: 30 }),
  }
})
