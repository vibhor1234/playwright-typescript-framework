import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProgressBarPage extends BasePage {
  readonly startButton: Locator;
  readonly stopButton: Locator;
  readonly progressBar: Locator;

  constructor(page: Page) {
    super(page);
    this.startButton = page.locator('#startButton');
    this.stopButton = page.locator('#stopButton');
    this.progressBar = page.locator('#progressBar');
  }

  async goto(): Promise<void> {
    await this.navigateTo('/progressbar');
  }

  async clickStart(): Promise<void> {
    await this.startButton.click();
  }

  async clickStop(): Promise<void> {
    await this.stopButton.click();
  }

  async getProgressValue(): Promise<number> {
    const value = await this.progressBar.getAttribute('aria-valuenow');
    return Number(value);
  }
}
