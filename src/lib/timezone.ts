const TIMEZONE = 'Asia/Shanghai'

/**
 * 格式化时间为 Asia/Shanghai 时区的 datetime 字符串
 * 格式: YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) {
    return '-'
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return '-'
    }

    // 使用 Intl.DateTimeFormat 格式化为 Asia/Shanghai 时区
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    // 格式化并替换分隔符
    const parts = formatter.formatToParts(dateObj)
    const year = parts.find(p => p.type === 'year')?.value || ''
    const month = parts.find(p => p.type === 'month')?.value || ''
    const day = parts.find(p => p.type === 'day')?.value || ''
    const hour = parts.find(p => p.type === 'hour')?.value || ''
    const minute = parts.find(p => p.type === 'minute')?.value || ''
    const second = parts.find(p => p.type === 'second')?.value || ''

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  } catch (error) {
    console.error('时间格式化错误:', error)
    return '-'
  }
}

/**
 * 格式化时间为 Asia/Shanghai 时区的日期字符串
 * 格式: YYYY-MM-DD
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    return '-'
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return '-'
    }

    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    const parts = formatter.formatToParts(dateObj)
    const year = parts.find(p => p.type === 'year')?.value || ''
    const month = parts.find(p => p.type === 'month')?.value || ''
    const day = parts.find(p => p.type === 'day')?.value || ''

    return `${year}-${month}-${day}`
  } catch (error) {
    console.error('日期格式化错误:', error)
    return '-'
  }
}

/**
 * 格式化时间为 Asia/Shanghai 时区的时间字符串
 * 格式: HH:mm:ss
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) {
    return '-'
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return '-'
    }

    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const parts = formatter.formatToParts(dateObj)
    const hour = parts.find(p => p.type === 'hour')?.value || ''
    const minute = parts.find(p => p.type === 'minute')?.value || ''
    const second = parts.find(p => p.type === 'second')?.value || ''

    return `${hour}:${minute}:${second}`
  } catch (error) {
    console.error('时间格式化错误:', error)
    return '-'
  }
}

/**
 * 格式化时间为完整的 datetime 字符串（包含毫秒）
 * 格式: YYYY-MM-DD HH:mm:ss.SSS
 */
export function formatDateTimeWithMs(date: Date | string | null | undefined): string {
  if (!date) {
    return '-'
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return '-'
    }

    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const parts = formatter.formatToParts(dateObj)
    const year = parts.find(p => p.type === 'year')?.value || ''
    const month = parts.find(p => p.type === 'month')?.value || ''
    const day = parts.find(p => p.type === 'day')?.value || ''
    const hour = parts.find(p => p.type === 'hour')?.value || ''
    const minute = parts.find(p => p.type === 'minute')?.value || ''
    const second = parts.find(p => p.type === 'second')?.value || ''
    
    // 获取毫秒
    const ms = dateObj.getMilliseconds().toString().padStart(3, '0')

    return `${year}-${month}-${day} ${hour}:${minute}:${second}.${ms}`
  } catch (error) {
    console.error('时间格式化错误:', error)
    return '-'
  }
}
