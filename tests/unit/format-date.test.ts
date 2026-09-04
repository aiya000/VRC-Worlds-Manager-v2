import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from '@/lib/utils'

// The assertions describe the shape of the output rather than an exact string:
// the formatter renders in the runner's own time zone, which CI need not share.
describe('formatDateTime', () => {
  it('renders a VRChat timestamp as a readable Japanese date and time', () => {
    const formatted = formatDateTime('2024-05-01T12:34:56.000Z', 'ja-JP')

    expect(formatted).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}$/)
    expect(formatted).not.toContain('T')
    expect(formatted).not.toContain('Z')
  })

  it('renders the same instant in the English style', () => {
    expect(formatDateTime('2024-05-01T12:34:56.000Z', 'en-US')).toMatch(
      /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s?(AM|PM)$/,
    )
  })

  it('hands back a value it cannot parse instead of showing "Invalid Date"', () => {
    expect(formatDateTime('not a date', 'ja-JP')).toBe('not a date')
  })

  it('renders nothing for a missing timestamp', () => {
    expect(formatDateTime('', 'ja-JP')).toBe('')
    expect(formatDateTime(null, 'ja-JP')).toBe('')
    expect(formatDateTime(undefined, 'ja-JP')).toBe('')
  })
})

describe('formatDate', () => {
  it('drops the time for a date-only field', () => {
    const formatted = formatDate('2024-05-01T12:34:56.000Z', 'ja-JP')

    expect(formatted).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2}$/)
  })

  it('renders nothing for a missing date', () => {
    expect(formatDate(null, 'en-US')).toBe('')
  })
})
