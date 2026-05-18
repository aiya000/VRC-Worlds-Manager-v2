import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('test scripts', () => {
  it('exposes the repository test entry points', () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      test: 'vitest run',
      'test:unit': 'vitest run',
      'test:e2e': 'playwright test',
    });
  });
});
