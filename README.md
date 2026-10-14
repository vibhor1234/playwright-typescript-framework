# UI Testing Playground — Playwright + TypeScript Automation Framework

End-to-end test framework for [uitestingplayground.com](http://www.uitestingplayground.com/),
built with Playwright Test and TypeScript. Page Object Model, fixture injection, strict typing,
linting, and a CI pipeline — the same standards expected of a production test suite, applied to a
small, reviewable scope.

## Contents

- [What's automated](#whats-automated)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Design: Page Object Model + fixtures](#design)
- [Standards followed](#standards-followed)
- [Scripts](#scripts)

## What's automated

Three scenarios from uitestingplayground.com, each with its own page object, test file, and
requirements document. Full detail on each — including how the random row/column order is
handled — is in the sections right below the table.

| #   | Scenario                               | Flow                      | Assertion                              |
| --- | --------------------------------------- | --------------------------- | ----------------------------------------- |
| 1   | **Progress Bar** (`/progressbar`)      | Start → wait for ≥75% → Stop | Final value ≥ 75%                     |
| 2   | **Scroll To Click** (`/scrolltoclick`) | Scroll into view, click    | Text → `"Clicked!"`, class → `btn-success` |
| 3   | **Dynamic Table** (`/dynamictable`)    | Find Chrome row by name, read CPU | Matches the yellow label, stable over 5 reloads |

### Progress Bar — detail

`tests/progressbar.spec.ts` clicks Start, polls with `expect.poll(...)` until the bar's value is
≥75%, clicks Stop, and asserts the final value. 75% (not 100%) is the threshold because the goal
is to prove the Start → threshold-reached → Stop flow works, without the test running long or
flaking while waiting out the last few percent. Locators and actions live in
`pages/ProgressBarPage.ts`.

### Scroll To Click — detail

`tests/scrolltoclick.spec.ts` scrolls the target button into view, clicks it, and asserts the
text becomes `"Clicked!"` and the CSS class picks up `btn-success`. Locators and actions live in
`pages/ScrollToClickPage.ts`.

Implementation note: the live site currently has four separate scroll scenarios (plain page
scroll, scrollable container, nested scroll, hover-to-reveal). This test automates "Case 1 — Page
Scroll" (`#scrollTarget1`), the one that matches "scroll down the page to reach a button."
Documented in `requirements/scrolltoclick.requirements.md`.

### Dynamic Table — detail

The table's row order is randomized on every reload, as is the order of the `CPU`/`Memory`/
`Network`/`Disk` columns among themselves (`Name` is always first — verified against the live
site across repeated reloads). The yellow label below the table independently states Chrome's CPU
value. `pages/DynamicTablePage.ts` solves this with:

- `getColumnHeaders()` — reads the header row fresh, by name, every call.
- `getCellValue(rowName, columnName)` — resolves `columnName` to whatever index it currently sits
  at that reload, then scans the rows and matches `rowName` against each row's first cell (the
  `Name` column), returning the cell at the resolved column index. `columnName` lookup is fully
  position-independent; row lookup relies on `Name` staying the first column, which holds true on
  this site.
- `getWarningLabelText()` — reads the yellow label's raw text.

`tests/dynamictable.spec.ts` calls `getCellValue('Chrome', 'CPU')`, reads the label, and asserts
they're equal. That `expect(...)` call is the only assertion in the flow, and it lives in the
test, not the page object.

**Stability proof:** `npm run test:dynamictable:stability` runs this test 5 times in a row
(`--repeat-each=5 --workers=1`), each run against a freshly reloaded, independently randomized
page. Verified passing 5/5.

## Project structure

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

## Getting started

```bash
git clone <this-repo>
cd playwright-typescript-framework
npm install
npx playwright install --with-deps   # downloads browser binaries
npm test                             # runs the full suite headless
```

## Design

**Page Object Model (POM) + Fixture Injection** — the pattern Playwright's own documentation
recommends for combining the two (https://playwright.dev/docs/pom):

1. **Page Object Model** — every page under test has a class in `pages/` owning its locators and
   the actions you can perform on it (click, scroll, read a value). Page objects never make
   assertions; they only describe "what's on the page" and "what you can do to it."
2. **Fixture injection** — tests don't construct page objects themselves. `fixtures.ts` extends
   Playwright's `test` with custom fixtures (`progressBarPage`, `scrollToClickPage`,
   `dynamicTablePage`) that construct the right page object and navigate to its URL _before_ the
   test body runs. A test just asks for the fixture it needs as a parameter.

### Why split it this way

| Concern                          | Lives in            | Why                              |
| --------------------------------- | -------------------- | ----------------------------------- |
| Locators & page actions          | `pages/*.ts`        | Reusable across tests              |
| Navigation + object construction | `fixtures.ts`       | Keeps test bodies boilerplate-free |
| Assertions (`expect(...)`)       | `tests/*.spec.ts`   | Only the test knows what "pass" means |
| Shared page plumbing             | `pages/BasePage.ts` | Defined once, reused everywhere    |

Assertions stay out of page objects specifically because two tests might want different
assertions against the same page — keeping `pages/*.ts` assertion-free keeps them reusable either
way.

### How a test actually runs

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

The test imports `test`/`expect` from `fixtures.ts`, not directly from `@playwright/test` — this
is what makes the custom `progressBarPage` fixture available. When the test declares
`{ progressBarPage }`, Playwright resolves it against the fixture definition in `fixtures.ts`:

```ts
progressBarPage: async ({ page }, use) => {
  const progressBarPage = new ProgressBarPage(page);
  await progressBarPage.goto();   // navigation happens here, before the test body runs
  await use(progressBarPage);     // hand the ready-to-use page object to the test
},
```

By the time the test body executes, the browser is already on `/progressbar` and
`progressBarPage` is a ready instance. The test only calls actions (`clickStart()`) and makes
assertions (`expect.poll(...)`). `ProgressBarPage` extends `BasePage`, which just holds `page` and
a `navigateTo(path)` helper; `ProgressBarPage` itself only knows about `#startButton`,
`#stopButton`, `#progressBar`, and exposes `clickStart()`, `clickStop()`, `getProgressValue()` —
plain actions/getters, no `expect` calls inside.

`expect.poll(...)` is Playwright's built-in idiom for "keep checking a value until it satisfies a
condition, within a timeout" — the standard tool for a value that changes asynchronously (like an
animating progress bar). Every other test (`scrolltoclick.spec.ts`, `dynamictable.spec.ts`)
follows the same shape: ask for a fixture → call page-object actions → assert in the test.

## Standards followed

| Concern                     | Tool/convention used                                                                                                   | Config                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Page object design          | Playwright's officially documented POM + fixture-injection pattern                                                     | `fixtures.ts`, `pages/*.ts`         |
| Waiting on async conditions | `expect.poll(...)` (Playwright's built-in polling idiom) instead of custom retry loops                                 | used in `tests/progressbar.spec.ts` |
| Static typing               | TypeScript `strict` mode, plus `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`                      | `tsconfig.json`                     |
| Module resolution           | Current `node16`/`node16` module + resolution (the modern replacement for the deprecated `"node"` setting)             | `tsconfig.json`                     |
| Linting                     | ESLint flat config with `typescript-eslint` + `eslint-plugin-playwright` — Playwright's own recommended lint rules     | `eslint.config.js`                  |
| Formatting                  | Prettier, with `eslint-config-prettier` to avoid rule conflicts                                                        | `.prettierrc.json`                  |
| CI-aware test config        | `forbidOnly`, CI-conditional `retries`/`workers` — the standard Playwright scaffold pattern                            | `playwright.config.ts`              |
| Continuous integration      | GitHub Actions: runs typecheck, lint, and the full test suite on every push/PR, uploads the HTML report as an artifact | `.github/workflows/playwright.yml`  |

### Version note: TypeScript pinned to 6.0.3

`typescript` is pinned to `6.0.3` rather than the newest `7.0.2`. TypeScript 7 is the brand-new
native/Go-ported compiler; `typescript-eslint` (the tool providing type-aware linting) currently
only supports TypeScript `< 6.1.0`. 6.0.3 is the newest version still fully supported by that lint
tooling, so it was chosen deliberately to keep linting fully functional rather than chasing the
newest compiler release.

### Verification

The commands that prove the table above (`npm run typecheck`, `npm run lint`, `npm test`, and the
stability run) are listed with the rest of the npm scripts in [Scripts](#scripts) below. CI runs
the same checks automatically on every push via `.github/workflows/playwright.yml`.

## Scripts

| Command                               | What it does                                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                            | Run every spec in `tests/`                                                                                                      |
| `npm run test:headed`                 | Same, with a visible browser                                                                                                    |
| `npm run test:dynamictable:stability` | Run the dynamic table test 5x in a row (`--repeat-each=5 --workers=1`) to prove it's stable against randomized row/column order |
| `npm run typecheck`                   | `tsc --noEmit` — catches type errors without emitting files                                                                     |
| `npm run lint` / `npm run lint:fix`   | ESLint (and autofix)                                                                                                            |
| `npm run format`                      | Prettier, writes in place                                                                                                       |
| `npm run report`                      | Open the last HTML test report                                                                                                  |

You can always drop down to the raw CLI too, e.g. `npx playwright test tests/progressbar.spec.ts --headed`.
