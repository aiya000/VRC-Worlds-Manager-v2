import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function readLocaleFiles(): Record<string, Record<string, string>> {
  const localesDir = path.resolve(__dirname, '../../locales')
  const files = readdirSync(localesDir)
    .filter((f) => f.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))

  const locales: Record<string, Record<string, string>> = {}
  for (const file of files) {
    const content = readFileSync(path.join(localesDir, file), 'utf8')

    try {
      const parsed = JSON.parse(content) as unknown
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('expected a JSON object at the top level')
      }

      locales[file] = parsed as Record<string, string>
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to parse ${file}: ${message}`)
    }
  }

  return locales
}

describe('locales', () => {
  it('all locale files have exactly the same keys', () => {
    const locales = readLocaleFiles()
    const entries = Object.entries(locales)
    expect(entries.length).toBeGreaterThan(0)

    const [firstName, firstLocale] = entries[0]
    const expectedKeys = Object.keys(firstLocale).sort()

    for (const [filename, locale] of entries.slice(1)) {
      const actualKeys = Object.keys(locale).sort()
      expect(actualKeys, `${filename} keys differ from ${firstName}`).toEqual(
        expectedKeys,
      )
    }
  })

  it('uses web-appropriate setup thank-you text', () => {
    const locales = readLocaleFiles()

    expect(locales['ja-JP.json']?.['setup-page:thank-you']).toBe(
      'ご利用ありがとうございます！',
    )
    expect(locales['en-US.json']?.['setup-page:thank-you']).toBe(
      'Thank you for using VRChat Worlds Manager Web!',
    )
  })
})
