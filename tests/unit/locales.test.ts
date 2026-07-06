import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function readLocaleFiles(): Record<string, Record<string, string>> {
  const localesDir = path.join(process.cwd(), 'locales')
  const files = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json'))

  const locales: Record<string, Record<string, string>> = {}
  for (const file of files) {
    const content = fs.readFileSync(path.join(localesDir, file), 'utf8')
    locales[file] = JSON.parse(content)
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
})
