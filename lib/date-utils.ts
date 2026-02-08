import { format, isToday, isYesterday, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'

export function formatActivityTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  
  const minutesAgo = differenceInMinutes(now, d)
  const hoursAgo = differenceInHours(now, d)
  const daysAgo = differenceInDays(now, d)
  
  if (minutesAgo < 1) {
    return 'Just now'
  }
  
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`
  }
  
  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`
  }
  
  if (isToday(d)) {
    return `Today at ${format(d, 'h:mm a')}`
  }
  
  if (isYesterday(d)) {
    return `Yesterday at ${format(d, 'h:mm a')}`
  }
  
  if (daysAgo < 7) {
    return `${daysAgo}d ago`
  }
  
  // For older dates, show the actual date
  return format(d, 'MMM d, yyyy')
}

export function formatFullTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM d, yyyy \'at\' h:mm a')
}
