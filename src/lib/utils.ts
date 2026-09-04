import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * VRChat timestamps arrive as ISO 8601 in UTC, which is unreadable as-is and
 * shows the wrong day to anyone far enough from Greenwich. An unparseable
 * value is handed back untouched rather than hidden behind "Invalid Date".
 */
function formatWith(
  value: string | null | undefined,
  language: string,
  options: Intl.DateTimeFormatOptions,
): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat(language, options).format(date)
}

export function formatDateTime(
  value: string | null | undefined,
  language: string,
): string {
  return formatWith(value, language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatDate(
  value: string | null | undefined,
  language: string,
): string {
  return formatWith(value, language, { dateStyle: 'medium' })
}
