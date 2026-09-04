import { describe, expect, it } from 'vitest'

import {
  buildVRChatCookieHeader,
  isOriginAllowed,
  parseSetCookieValue,
} from './index'

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

describe('parseSetCookieValue', () => {
  it('extracts the named cookie value and drops its attributes', () => {
    expect(
      parseSetCookieValue(
        ['auth=authcookie_abc; Path=/; HttpOnly; Secure; SameSite=Lax'],
        'auth',
      ),
    ).toBe('authcookie_abc')
  })

  it('picks the requested cookie out of several Set-Cookie headers', () => {
    expect(
      parseSetCookieValue(
        [
          'auth=authcookie_abc; Path=/',
          'twoFactorAuth=twofactorauth_xyz; Path=/',
        ],
        'twoFactorAuth',
      ),
    ).toBe('twofactorauth_xyz')
  })

  it('does not confuse a cookie whose name merely ends with the requested one', () => {
    expect(parseSetCookieValue(['twoFactorAuth=xyz; Path=/'], 'auth')).toBe(
      null,
    )
  })

  it('treats an expiring cookie as absent', () => {
    expect(parseSetCookieValue(['auth=; Path=/; Max-Age=0'], 'auth')).toBe(null)
  })

  it('returns null when no cookie was issued', () => {
    expect(parseSetCookieValue([], 'auth')).toBe(null)
  })
})

describe('buildVRChatCookieHeader', () => {
  it('sends both cookies once two-factor auth has been verified', () => {
    expect(buildVRChatCookieHeader('authcookie_abc', 'twofactorauth_xyz')).toBe(
      'auth=authcookie_abc; twoFactorAuth=twofactorauth_xyz',
    )
  })

  it('sends the auth cookie alone while no second factor is held', () => {
    expect(buildVRChatCookieHeader('authcookie_abc', null)).toBe(
      'auth=authcookie_abc',
    )
  })

  it('sends nothing when the caller holds no session', () => {
    expect(buildVRChatCookieHeader(null, null)).toBe(null)
    expect(buildVRChatCookieHeader('', '')).toBe(null)
  })
})
