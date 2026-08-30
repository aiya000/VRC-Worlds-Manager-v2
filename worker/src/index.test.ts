import { describe, expect, it } from 'vitest'

import { isOriginAllowed } from './index'

describe('isOriginAllowed', () => {
  it('allows the exact configured origin', () => {
    expect(
      isOriginAllowed(
        'https://vrchat-worlds-manager-web.pages.dev',
        'https://vrchat-worlds-manager-web.pages.dev',
      ),
    ).toBe(true)
  })

  it('allows any Cloudflare Pages preview subdomain of the configured project', () => {
    expect(
      isOriginAllowed(
        'https://feature-web.vrchat-worlds-manager-web.pages.dev',
        'https://vrchat-worlds-manager-web.pages.dev',
      ),
    ).toBe(true)

    expect(
      isOriginAllowed(
        'https://some-other-branch.vrchat-worlds-manager-web.pages.dev',
        'https://vrchat-worlds-manager-web.pages.dev',
      ),
    ).toBe(true)
  })

  it('rejects a different project even if the hostname contains the allowed one', () => {
    expect(
      isOriginAllowed(
        'https://evilvrchat-worlds-manager-web.pages.dev',
        'https://vrchat-worlds-manager-web.pages.dev',
      ),
    ).toBe(false)
  })

  it('rejects an unrelated .pages.dev project', () => {
    expect(
      isOriginAllowed(
        'https://some-attacker-project.pages.dev',
        'https://vrchat-worlds-manager-web.pages.dev',
      ),
    ).toBe(false)
  })

  it('rejects a scheme downgrade to http', () => {
    expect(
      isOriginAllowed(
        'http://feature-web.vrchat-worlds-manager-web.pages.dev',
        'https://vrchat-worlds-manager-web.pages.dev',
      ),
    ).toBe(false)
  })

  it('does not auto-allow subdomains when the configured origin is a custom domain', () => {
    expect(
      isOriginAllowed(
        'https://evil.vrchat-worlds-manager.app',
        'https://vrchat-worlds-manager.app',
      ),
    ).toBe(false)
  })

  it('allows everything when configured as a wildcard', () => {
    expect(isOriginAllowed('https://anything.example.com', '*')).toBe(true)
  })

  it('rejects an empty/malformed origin', () => {
    expect(
      isOriginAllowed('', 'https://vrchat-worlds-manager-web.pages.dev'),
    ).toBe(false)
  })
})
