import { test, expect } from '../fixtures';

test.describe('Scroll To Click', () => {
  test('scrolls to the button and clicks it successfully', async ({ scrollToClickPage }) => {
    await scrollToClickPage.scrollToButton();
    await scrollToClickPage.clickButton();

    await expect(scrollToClickPage.targetButton).toHaveText('Clicked!');
    await expect(scrollToClickPage.targetButton).toHaveClass(/btn-success/);
  });
});
