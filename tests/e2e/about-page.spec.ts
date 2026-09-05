import { expect, test } from '@playwright/test'
import jaJP from '../../locales/ja-JP.json'

const ABOUT = '/listview/about'

const RELEASES_URL =
  'https://github.com/aiya000/VRChat-Worlds-Manager-Web/releases'

// The app ships no changelog of its own; GitHub Releases is the changelog, and
// this link is the only way a user reaches it.
test('the About page links to GitHub Releases as the changelog', async ({
  page,
}) => {
  await page.goto(ABOUT)

  const link = page.getByRole('link', { name: jaJP['about-section:changelog'] })

  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('href', RELEASES_URL)
  await expect(link).toHaveAttribute('target', '_blank')
})

test('the About footer wraps instead of overflowing a narrow panel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 800 })
  await page.goto(ABOUT)

  await expect(
    page.getByRole('link', { name: jaJP['about-section:changelog'] }),
  ).toBeVisible()

  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  )
  expect(overflows).toBe(false)
})
