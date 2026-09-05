import { expect, test, type Page } from '@playwright/test'
import jaJP from '../../locales/ja-JP.json'

const LIST_VIEW = '/listview/folders/special/all'

// Japanese is the default language, so these are what a fresh browser renders.
// Reading them from the locale file keeps the test working when the copy changes.
const SETTINGS_LABEL = jaJP['general:settings']

const PHONE = { width: 390, height: 844 }
const VR_PANEL = { width: 720, height: 640 }
const DESKTOP = { width: 1440, height: 900 }

const sidebarTrigger = (page: Page) => page.locator('[data-sidebar="trigger"]')
const sidebarPanel = (page: Page) => page.locator('[data-sidebar="sidebar"]')

async function openListView(
  page: Page,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport)
  await page.goto(LIST_VIEW)
  // The dev server floats an overlay over the bottom-left corner, right where
  // the drawer's own entries sit, and it swallows clicks meant for them.
  await page.addStyleTag({
    content: 'nextjs-portal { display: none !important; }',
  })
  await expect(sidebarTrigger(page)).toBeVisible()
}

test.describe('list view layout', () => {
  for (const [name, viewport] of [
    ['a phone', PHONE],
    ['a VR overlay panel', VR_PANEL],
    ['a desktop window', DESKTOP],
  ] as const) {
    test(`does not scroll sideways on ${name}`, async ({ page }) => {
      await openListView(page, viewport)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )

      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  // The regression this guards against is silent: when the sidebar's width
  // declaration stops applying, the sidebar still paints but stops reserving
  // its column, and the page content ends up underneath it.
  test('keeps the desktop content clear of the sidebar', async ({ page }) => {
    await openListView(page, DESKTOP)

    const sidebar = await sidebarPanel(page).boundingBox()
    const main = await page.getByTestId('list-view-content').boundingBox()

    expect(sidebar).not.toBe(null)
    expect(main).not.toBe(null)
    expect(sidebar!.width).toBeGreaterThan(0)
    expect(main!.x).toBeGreaterThanOrEqual(sidebar!.x + sidebar!.width - 1)
  })

  test('opens the sidebar as a drawer on a phone', async ({ page }) => {
    await openListView(page, PHONE)

    await expect(page.getByRole('dialog')).toHaveCount(0)

    await sidebarTrigger(page).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(
      page.getByRole('dialog').getByText(SETTINGS_LABEL),
    ).toBeVisible()
  })

  // The sidebar has no other way in on a phone, so the trigger must not be
  // something the world grid can scroll off the top of the screen.
  test('keeps the sidebar trigger reachable after the list scrolls', async ({
    page,
  }) => {
    await openListView(page, PHONE)

    const scrolled = await page.evaluate(() => {
      const trigger = document.querySelector('[data-sidebar="trigger"]')
      if (trigger === null) {
        return null
      }
      let sticky: HTMLElement | null = trigger.parentElement
      while (
        sticky !== null &&
        getComputedStyle(sticky).position !== 'sticky'
      ) {
        sticky = sticky.parentElement
      }
      if (sticky === null || sticky.parentElement === null) {
        return null
      }
      // Stand in for a long list of worlds, which a fresh browser has none of.
      const spacer = document.createElement('div')
      spacer.style.flex = '0 0 2000px'
      spacer.style.height = '2000px'
      sticky.parentElement.appendChild(spacer)

      let scroller: HTMLElement | null = sticky.parentElement
      while (
        scroller !== null &&
        !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)
      ) {
        scroller = scroller.parentElement
      }
      if (scroller === null) {
        return null
      }
      scroller.scrollTop = 900
      return scroller.scrollTop
    })

    expect(scrolled).toBeGreaterThan(0)

    const box = await sidebarTrigger(page).boundingBox()
    expect(box).not.toBe(null)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeLessThan(PHONE.height / 2)
  })

  test('closes the phone drawer once it has been used to navigate', async ({
    page,
  }) => {
    await openListView(page, PHONE)
    await sidebarTrigger(page).click()

    await page.getByRole('dialog').getByText(SETTINGS_LABEL).click()

    await expect(page).toHaveURL(/\/listview\/settings/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
