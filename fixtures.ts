import { test as base } from '@playwright/test';
import { ProgressBarPage } from './pages/ProgressBarPage';
import { ScrollToClickPage } from './pages/ScrollToClickPage';
import { DynamicTablePage } from './pages/DynamicTablePage';

type Pages = {
  progressBarPage: ProgressBarPage;
  scrollToClickPage: ScrollToClickPage;
  dynamicTablePage: DynamicTablePage;
};

export const test = base.extend<Pages>({
  progressBarPage: async ({ page }, use) => {
    const progressBarPage = new ProgressBarPage(page);
    await progressBarPage.goto();
    await use(progressBarPage);
  },

  scrollToClickPage: async ({ page }, use) => {
    const scrollToClickPage = new ScrollToClickPage(page);
    await scrollToClickPage.goto();
    await use(scrollToClickPage);
  },

  dynamicTablePage: async ({ page }, use) => {
    const dynamicTablePage = new DynamicTablePage(page);
    await dynamicTablePage.goto();
    await use(dynamicTablePage);
  },
});

export { expect } from '@playwright/test';
