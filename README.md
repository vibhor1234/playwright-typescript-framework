# UI Testing Playground — Playwright + TypeScript Framework

End-to-end tests for [uitestingplayground.com](http://www.uitestingplayground.com/), built with
Playwright Test and TypeScript.

## Contents

- [What's automated](#whats-automated)
- [Design pattern: Page Object Model + Fixture Injection](#design-pattern-page-object-model--fixture-injection)
- [How a test actually runs — walkthrough](#how-a-test-actually-runs--walkthrough)
- [Code quality & standards](#code-quality--standards)
- [Continuous integration](#continuous-integration)
- [Folder structure](#folder-structure)
- [Adding a new page/test](#adding-a-new-pagetest)
- [Requirements coverage — what was asked vs. what's built](#requirements-coverage--what-was-asked-vs-whats-built)
- [Scripts](#scripts)

## What's automated

Three independent scenarios, each with its own page object, test file, and requirements doc:

| #   | Scenario                               | What it does                                                                                         | Assertion                                                                                  |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | **Progress Bar** (`/progressbar`)      | Clicks **Start**, waits until the progress bar reaches ≥75%, clicks **Stop**                         | Final value ≥ 75%                                                                          |
| 2   | **Scroll To Click** (`/scrolltoclick`) | Scrolls a button into view, clicks it                                                                | Button text becomes `"Clicked!"`, class gains `btn-success`                                |
| 3   | **Dynamic Table** (`/dynamictable`)    | Looks up the Chrome row's CPU value by name (not position), reads the same value from a yellow label | The two values are equal — proven stable across 5 reloads with randomized row/column order |

Full detail on each, including why specific choices were made, is in
[Requirements coverage](#requirements-coverage--what-was-asked-vs-whats-built) below.

## Design pattern: Page Object Model + Fixture Injection

The framework is built on two patterns working together:

1. **Page Object Model (POM)** — every page under test has a corresponding class in `pages/`
   that owns its locators and the actions you can perform on that page (click, scroll, read a
   value). Page objects never make assertions; they only describe "what's on the page" and "what
   you can do to it."
2. **Fixture injection** — instead of tests creating page objects themselves (`new FooPage(page)`),
   `fixtures.ts` wires each page object up as a Playwright fixture. A test just asks for the
   fixture it needs as a parameter, and Playwright constructs it (and navigates to the right URL)
   automatically before the test body runs.

This is the pattern Playwright's own docs recommend for combining POM with fixtures — see
https://playwright.dev/docs/pom.

### Why split it this way

| Concern                          | Lives in            | Why                                                                                                                                               |
| -------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locators & page actions          | `pages/*.ts`        | Reusable across tests; if a selector changes, fix it in one place.                                                                                |
| Navigation + object construction | `fixtures.ts`       | Keeps test bodies free of setup boilerplate.                                                                                                      |
| Assertions (`expect(...)`)       | `tests/*.spec.ts`   | Only the test knows what "pass" means for that scenario. Page objects stay reusable even if two tests want different assertions on the same page. |
| Shared page plumbing             | `pages/BasePage.ts` | Every page object needs `page` and a way to navigate; defined once instead of repeated in every class.                                            |

## How a test actually runs — walkthrough

Take `tests/progressbar.spec.ts`:

```ts
import { test, expect } from '../fixtures';

test('starts progress and stops once target value is reached', async ({ progressBarPage }) => {
  await progressBarPage.clickStart();
  await expect.poll(() => progressBarPage.getProgressValue(), { timeout: 30000 })
    .toBeGreaterThanOrEqual(75);
  await progressBarPage.clickStop();
  ...
});
```

1. The test imports `test`/`expect` from **`fixtures.ts`**, not directly from `@playwright/test`.
   This is what makes custom fixtures like `progressBarPage` available.
2. The test declares `{ progressBarPage }` as a parameter. Playwright sees this and looks up the
   matching fixture definition in `fixtures.ts`:
   ```ts
   progressBarPage: async ({ page }, use) => {
     const progressBarPage = new ProgressBarPage(page);
     await progressBarPage.goto();   // navigation happens here, before the test body runs
     await use(progressBarPage);     // hand the ready-to-use page object to the test
   },
   ```
3. By the time the test body executes, the browser is already on `/progressbar` and
   `progressBarPage` is a ready `ProgressBarPage` instance — the test only has to call actions
   (`clickStart()`) and make assertions (`expect.poll(...)`).
4. `ProgressBarPage` (in `pages/ProgressBarPage.ts`) extends `BasePage`, which just holds `page`
   and a `navigateTo(path)` helper. `ProgressBarPage` itself only knows about `#startButton`,
   `#stopButton`, `#progressBar`, and exposes `clickStart()`, `clickStop()`, `getProgressValue()`
   — plain actions/getters, no `expect` calls inside.

`expect.poll(...)` is used here (rather than a custom wait loop inside the page object) because
it's Playwright's built-in idiom for "keep checking a value until it satisfies a condition, with
a timeout." Keeping it in the test — not wrapped in a page-object method — keeps the page object
assertion-free, same principle enforced for the dynamic table.

Every other test (`scrolltoclick.spec.ts`, `dynamictable.spec.ts`) follows the exact same shape:
ask for a fixture → call page-object actions → assert in the test.

## Code quality & standards

This is a TypeScript/Node project, so the tooling is the Node-ecosystem equivalent of the
Python quality-gate stack (flake8, black, mypy, tox):

| Concern                | Python-world tool | What this repo uses                                                                                                          | Config                             |
| ---------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Linting                | flake8            | ESLint + `typescript-eslint` + `eslint-plugin-playwright` (Playwright's own recommended lint rules)                          | `eslint.config.js`                 |
| Formatting             | black             | Prettier                                                                                                                     | `.prettierrc.json`                 |
| Static typing          | mypy              | TypeScript `strict` mode                                                                                                     | `tsconfig.json`                    |
| Automated quality gate | tox               | GitHub Actions CI, running typecheck + lint + tests on every push/PR (see [Continuous integration](#continuous-integration)) | `.github/workflows/playwright.yml` |
| Test runner            | pytest            | Playwright Test                                                                                                              | `playwright.config.ts`             |

### What was checked and fixed to reach this state

The framework wasn't just assumed to be "standard" — it was audited against current Playwright +
TypeScript conventions, and these gaps were found and fixed:

| Gap found                                                                                           | Fix applied                                                                                                            |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tests manually did `new FooPage(page)` + `.goto()` instead of the documented Playwright POM pattern | Added `fixtures.ts`; tests now receive ready-to-use page objects via fixture injection                                 |
| A page object (`ProgressBarPage`) contained an assertion loop inside itself                         | Moved the wait/assert logic into the test using `expect.poll(...)`; page objects are now assertion-free                |
| Three page objects duplicated `this.page = page` / navigation boilerplate                           | Added `pages/BasePage.ts` as a shared base class                                                                       |
| No linting                                                                                          | Added ESLint flat config with `typescript-eslint` + `eslint-plugin-playwright`                                         |
| No formatting enforcement                                                                           | Added Prettier + `eslint-config-prettier` (avoids rule conflicts between the two)                                      |
| `tsconfig.json` used the deprecated `moduleResolution: "node"`                                      | Updated to the current `"node16"`/`"node16"` module+resolution pair                                                    |
| `tsconfig.json` had no unused-code checks                                                           | Added `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`                                             |
| `playwright.config.ts` had no CI-aware settings                                                     | Added `forbidOnly: !!process.env.CI` and CI-conditional `retries`/`workers` — the standard Playwright scaffold pattern |
| No automated pipeline running checks outside a local machine                                        | Added the GitHub Actions workflow below                                                                                |
| No `.gitignore`, stray unrelated file in repo root                                                  | Added `.gitignore`; removed an unrelated leftover file                                                                 |

**One deliberate version choice worth flagging:** `typescript` is pinned to `6.0.3`, not the
newest `7.0.2`. TypeScript 7 is the brand-new native/Go-ported compiler, but `typescript-eslint`
— the tool that provides type-aware linting — only supports TypeScript `< 6.1.0` as of this
writing. Installing TS 7 would mean shipping a lint setup that's broken on day one, so 6.0.3 (the
newest version the lint ecosystem fully supports) was used instead. This is a tracked trade-off,
not an oversight — worth revisiting once `typescript-eslint` catches up.

### How this was verified, not just claimed

```
npm run typecheck   # tsc --noEmit → no errors
npm run lint         # eslint .    → no errors
npm test             # full suite  → 3/3 passed
npm run test:dynamictable:stability   # 5 repeat runs → 5/5 passed
```

## Continuous integration

`.github/workflows/playwright.yml` runs on every push and pull request to `main`:

1. Checks out the repo, installs Node 20 and dependencies (`npm ci`).
2. Runs `npm run typecheck` and `npm run lint` — fails fast on type or style issues before
   spending time on browser tests.
3. Installs the Chromium browser Playwright needs.
4. Runs `npm test`.
5. Uploads the HTML report as a build artifact (even if the run fails), so a failure can be
   diagnosed from the GitHub Actions UI without re-running anything locally.

This is the automated gate equivalent of running `tox` in a Python project — proof the suite
passes somewhere other than one developer's machine.

## Folder structure

```
.github/workflows/playwright.yml    CI pipeline: typecheck + lint + test on every push/PR
fixtures.ts                         Custom `test`/`expect`: wires page objects as fixtures
playwright.config.ts                Playwright runner config (baseURL, projects, CI settings)
tsconfig.json                       TypeScript compiler settings
eslint.config.js                    Lint rules (typescript-eslint + eslint-plugin-playwright)
.prettierrc.json                    Formatting rules

pages/
  BasePage.ts                       Shared base class: holds `page`, provides navigateTo()
  ProgressBarPage.ts                Locators + actions for /progressbar
  ScrollToClickPage.ts              Locators + actions for /scrolltoclick
  DynamicTablePage.ts               Locators + actions for /dynamictable (name-based cell lookup)

tests/
  progressbar.spec.ts               Test + assertions for the progress bar scenario
  scrolltoclick.spec.ts             Test + assertions for the scroll-to-click scenario
  dynamictable.spec.ts              Test + assertions for the dynamic table scenario

requirements/
  *.requirements.md                 One plain-English requirements doc per test scenario
```

## Adding a new page/test

1. Create `pages/NewThingPage.ts` extending `BasePage`:
   ```ts
   export class NewThingPage extends BasePage {
     readonly someButton: Locator;
     constructor(page: Page) {
       super(page);
       this.someButton = page.locator('#someButton');
     }
     async goto() {
       await this.navigateTo('/newthing');
     }
     async clickSomeButton() {
       await this.someButton.click();
     }
   }
   ```
2. Register it as a fixture in `fixtures.ts` (construct + `goto()` + `use(...)`).
3. Write `tests/newthing.spec.ts` using `{ newThingPage }` and put your `expect(...)` calls there.
4. (Optional but expected in this repo) add `requirements/newthing.requirements.md` describing the
   scenario in plain English.

## Requirements coverage — what was asked vs. what's built

This section exists so a reviewer doesn't have to go spelunking through code to confirm the
tests actually do what was requested. Each scenario's full requirement text lives in
`requirements/*.requirements.md`; this is the human-readable summary of how each requirement maps
to the actual implementation.

### 1. Progress Bar

**Asked for:** visit `/progressbar`, click Start, assert the result.

**Built:** `tests/progressbar.spec.ts` clicks Start, then waits (`expect.poll`) until the
progress bar's value climbs to at least 75%, clicks Stop, and asserts the final value is still
≥ 75%. Locators and actions live in `pages/ProgressBarPage.ts`.

75% (not 100%) was chosen as the threshold because the goal is to prove the Start →
threshold-reached → Stop flow works without making the test slow or flaky waiting for the very
last few percent. It's a plain constant in the test, trivial to change.

### 2. Scroll To Click

**Asked for:** visit `/scrolltoclick`, scroll down to the button, click it, assert the result.

**Built:** `tests/scrolltoclick.spec.ts` scrolls the target button into view, clicks it, and
asserts its text becomes `"Clicked!"` and its CSS class picks up `btn-success`. Locators and
actions live in `pages/ScrollToClickPage.ts`.

> **Known deviation:** the original UI Testing Playground used a button with id `#hidingButton`.
> The live site has since been redesigned with four separate scroll scenarios (plain page scroll,
> scrollable container, nested scroll, hover-to-reveal). This test targets "Case 1 — Page Scroll"
> (`#scrollTarget1`), which matches the original ask — "scroll down the page to reach a button" —
> rather than silently guessing. Also documented in `requirements/scrolltoclick.requirements.md`.

### 3. Dynamic Table

**Asked for:** on `/dynamictable`, find the Chrome row's CPU value in the table, read the CPU
value shown in the yellow label below it, and assert the two match — without hard-coding row or
column positions (since both shuffle on every reload), with a reusable
`get_cell_value(row_name, column_name)` method on the page object, assertions kept in the test
(not the page object), and proof that it's stable across 5 consecutive runs.

**Built:**

- `pages/DynamicTablePage.ts` exposes `getCellValue(rowName, columnName)` — it reads the column
  headers fresh on every call to find the right column index by name, then scans the table rows
  for the one whose first cell matches `rowName`. Nothing about row order or column order is
  assumed.
- `getWarningLabelText()` reads the yellow label's raw text.
- `tests/dynamictable.spec.ts` calls both, extracts the numeric part of the label, and does the
  `expect(...)` comparison — the only assertion in the whole flow, and it isn't in the page
  object.
- Stability check: `npm run test:dynamictable:stability` runs this test 5 times in a row
  (`--repeat-each=5 --workers=1`), each time against a freshly reloaded page with a different
  random row/column order. Verified passing 5/5 repeatedly.

> **Naming note:** the method is `getCellValue` (camelCase), not `get_cell_value` (snake_case) —
> same behavior and signature as requested, just following standard TypeScript naming convention
> instead of Python's.

### Quick verification checklist

| #   | Requirement                                                     | Met?                                                                                                     |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Progress bar: click Start, assert result                        | ✅                                                                                                       |
| 2   | Scroll to click: scroll down, click, assert result              | ✅                                                                                                       |
| 3   | Each scenario has its own page object                           | ✅ (`ProgressBarPage`, `ScrollToClickPage`, `DynamicTablePage`)                                          |
| 4   | Each scenario has its own test file                             | ✅ (`progressbar.spec.ts`, `scrolltoclick.spec.ts`, `dynamictable.spec.ts`)                              |
| 5   | Each scenario has its own requirements doc                      | ✅ (`requirements/*.requirements.md`)                                                                    |
| 6   | Dynamic table: find Chrome row, read CPU, compare to label      | ✅                                                                                                       |
| 7   | Dynamic table: no hard-coded row/column positions               | ✅                                                                                                       |
| 8   | Dynamic table: reusable `getCellValue(rowName, columnName)`     | ✅                                                                                                       |
| 9   | Dynamic table: assertions stay in the test, not the page object | ✅                                                                                                       |
| 10  | Dynamic table: stable across 5 consecutive runs                 | ✅ (`npm run test:dynamictable:stability`)                                                               |
| 11  | Framework follows current Playwright/TypeScript standards       | ✅ (fixtures, lint, format, strict types, CI — see [Code quality & standards](#code-quality--standards)) |

## Scripts

| Command                               | What it does                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                            | Run every spec in `tests/`                                                                                                      |
| `npm run test:headed`                 | Same, with a visible browser                                                                                                    |
| `npm run test:dynamictable:stability` | Run the dynamic table test 5x in a row (`--repeat-each=5 --workers=1`) to prove it's stable against randomized row/column order |
| `npm run typecheck`                   | `tsc --noEmit` — catches type errors without emitting files                                                                     |
| `npm run lint` / `npm run lint:fix`   | ESLint (and autofix)                                                                                                            |
| `npm run format`                      | Prettier, writes in place                                                                                                       |
| `npm run report`                      | Open the last HTML test report                                                                                                  |

You can always drop down to the raw CLI too, e.g. `npx playwright test tests/progressbar.spec.ts --headed`.
