import { test, expect } from '../fixtures';

test.describe('Progress Bar', () => {
  test('starts progress and stops once target value is reached', async ({ progressBarPage }) => {
    await progressBarPage.clickStart();

    await expect
      .poll(() => progressBarPage.getProgressValue(), { timeout: 30000 })
      .toBeGreaterThanOrEqual(75);

    await progressBarPage.clickStop();

    const finalValue = await progressBarPage.getProgressValue();
    expect(finalValue).toBeGreaterThanOrEqual(75);
  });
});
