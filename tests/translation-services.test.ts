import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import { runTranslationSmokeTest } from './translationSmokeTestRuntime'

describe('translation services smoke tests', () => {
  for (const service of ['google', 'microsoft', 'deepl', 'openrouter'] as const) {
    it(
      `${service} translates apple to 苹果`,
      async () => {
        const result = await runTranslationSmokeTest(service)

        expect(result).toBe('苹果')
      },
      90_000,
    )
  }
})

describe('zip commands', () => {
  it('run translation smoke tests before packaging chrome and firefox bundles', async () => {
    const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
      scripts?: Record<string, string>
    }

    expect(packageJson.scripts?.zip).toContain('npm run test')
    expect(packageJson.scripts?.zip).toContain('wxt zip')
    expect(packageJson.scripts?.zip).toContain('wxt zip -b firefox')
    expect(packageJson.scripts?.['zip:firefox']).toBeUndefined()
  })
})
