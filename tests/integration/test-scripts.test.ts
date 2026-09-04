import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('test scripts', () => {
  it('exposes the repository test entry points', () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>
    }

    expect(packageJson.scripts).toMatchObject({
      test: 'bun run test:unit && bun run test:integration',
      'test:unit': 'vitest run tests/unit',
      'test:integration': 'vitest run tests/integration',
      'test:e2e': 'playwright test',
    })
  })
})
