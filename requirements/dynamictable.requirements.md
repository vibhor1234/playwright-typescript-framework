# Requirement: Dynamic Table

**URL:** http://www.uitestingplayground.com/dynamictable

**Scenario:** The table shows running processes (Name, CPU, Memory, Network, Disk). Column order
and row order change on every page load, and cell values are random. A yellow label below the
table shows Chrome's CPU value independently.

## Steps

1. Navigate to the Dynamic Table page.
2. Find the "Chrome" row in the table (regardless of its row position) and read its CPU value
   (regardless of which column position CPU is currently in).
3. Read the CPU value shown in the yellow label (`Chrome CPU: X%`).
4. Assert that the table's Chrome CPU value matches the label's CPU value.

## Constraints

- Must not hard-code column or row positions — resolve both by name every run, since they change
  on each reload.
- Logic for locating rows/columns and reading cell values lives in `DynamicTablePage`
  (`pages/DynamicTablePage.ts`), exposed via a reusable `getCellValue(rowName, columnName)` method.
- Assertions stay in the test file, not in the page object.
- Must be stable across repeated runs against freshly reloaded/randomized data. Verified via:
  `npx playwright test tests/dynamictable.spec.ts --repeat-each=5`
