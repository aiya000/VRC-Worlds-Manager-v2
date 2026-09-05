import { expect, test, type Page } from '@playwright/test'
import jaJP from '../../locales/ja-JP.json'

const PHONE = { width: 390, height: 844 }

// Each setting on this step sits in its own block together with the preview of
// what it changes, so no preview is stranded at the bottom of the step.
const sectionBlocks = (page: Page) => page.locator('div.rounded-lg.border.p-4')

async function openUiCustomizationStep(page: Page) {
  await page.setViewportSize(PHONE)
  await page.goto('/setup')
  // The dev server floats an overlay over the bottom-left corner and it
  // swallows clicks meant for the step's own buttons.
  await page.addStyleTag({
    content: 'nextjs-portal { display: none !important; }',
  })

  await page.getByRole('button', { name: '日本語' }).click()
  await page.getByRole('button', { name: jaJP['setup-layout:start'] }).click()
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button').last().click()
  }

  await expect(
    page.getByText(jaJP['settings-page:world-detail-fields']),
  ).toBeVisible()
}

test.describe('setup UI customization step', () => {
  test('shows a preview inside each section', async ({ page }) => {
    await openUiCustomizationStep(page)

    const blocks = sectionBlocks(page)
    await expect(blocks).toHaveCount(3)

    // The card size block carries the world card preview.
    await expect(
      blocks.nth(0).getByText(jaJP['settings-page:preview-world']),
    ).toBeVisible()

    // The world detail block carries the detail preview.
    await expect(
      blocks.nth(2).getByText(jaJP['world-detail:details'], { exact: true }),
    ).toBeVisible()
  })

  test('the detail preview drops a field as soon as it is turned off', async ({
    page,
  }) => {
    await openUiCustomizationStep(page)

    const detailBlock = sectionBlocks(page).nth(2)
    const favoritesRow = detailBlock.getByText(jaJP['world-detail:favorites'], {
      exact: true,
    })

    await expect(favoritesRow).toBeVisible()

    await detailBlock.locator('button[role="switch"]').nth(1).click()

    await expect(favoritesRow).toHaveCount(0)
  })

  test('the card and the detail call the same field by the same name', async ({
    page,
  }) => {
    await openUiCustomizationStep(page)

    const blocks = sectionBlocks(page)

    // A field shown in both places must not be labelled two different ways.
    for (const label of [
      jaJP['world-card:field-favorites'],
      jaJP['world-card:field-last-updated'],
    ] as const) {
      await expect(
        blocks.nth(1).getByText(label, { exact: true }),
      ).toBeVisible()
      await expect(
        blocks.nth(2).getByText(label, { exact: true }),
      ).toBeVisible()
    }
  })
})
