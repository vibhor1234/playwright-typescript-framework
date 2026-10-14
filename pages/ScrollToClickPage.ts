import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ScrollToClickPage extends BasePage {
  // Case 1 — Page Scroll: button is placed far down the page.
  readonly targetButton: Locator;

  constructor(page: Page) {
    super(page);
    this.targetButton = page.locator('#scrollTarget1');
  }

  async goto(): Promise<void> {
    await this.navigateTo('/scrolltoclick');
  }

  async scrollToButton(): Promise<void> {
    await this.targetButton.scrollIntoViewIfNeeded();
  }

  async clickButton(): Promise<void> {
    await this.targetButton.click();
  }
}
