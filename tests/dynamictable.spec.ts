import { test, expect } from '../fixtures';

test.describe('Dynamic Table', () => {
  test('Chrome CPU value in the table matches the yellow warning label', async ({
    dynamicTablePage,
  }) => {
    const tableCpuValue = await dynamicTablePage.getCellValue('Chrome', 'CPU');
    const labelText = await dynamicTablePage.getWarningLabelText();

    // Label text looks like "Chrome CPU: 8%" — pull the value after the colon.
    const labelCpuValue = labelText.split(':').pop()?.trim();

    expect(tableCpuValue).toBe(labelCpuValue);
  });
});
