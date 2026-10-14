import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DynamicTablePage extends BasePage {
  readonly table: Locator;
  readonly rows: Locator;
  readonly cpuWarningLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.table = page.getByRole('table');
    this.rows = this.table.getByRole('row');
    this.cpuWarningLabel = page.locator('p.bg-warning');
  }

  async goto(): Promise<void> {
    await this.navigateTo('/dynamictable');
    await this.table.waitFor();
  }

  /** Column names in whatever order they appear on this page load. */
  async getColumnHeaders(): Promise<string[]> {
    const headerRow = this.rows.first();
    return headerRow.getByRole('columnheader').allTextContents();
  }

  /**
   * Reads the value of a given column for a given process row, regardless
   * of the current row/column order.
   */
  async getCellValue(rowName: string, columnName: string): Promise<string> {
    const headers = await this.getColumnHeaders();
    const columnIndex = headers.indexOf(columnName);
    if (columnIndex === -1) {
      throw new Error(`Column "${columnName}" not found. Available columns: ${headers.join(', ')}`);
    }

    const rowCount = await this.rows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = this.rows.nth(i);
      const cells = row.getByRole('cell');
      const cellCount = await cells.count();
      if (cellCount === 0) continue; // the header row has no "cell" role items

      const name = (await cells.first().textContent())?.trim();
      if (name === rowName) {
        return (await cells.nth(columnIndex).textContent())?.trim() ?? '';
      }
    }

    throw new Error(`Row "${rowName}" not found.`);
  }

  async getWarningLabelText(): Promise<string> {
    return (await this.cpuWarningLabel.textContent())?.trim() ?? '';
  }
}
