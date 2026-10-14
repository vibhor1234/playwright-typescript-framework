# UI Testing Playground — Playwright + TypeScript Framework

End-to-end tests for [uitestingplayground.com](http://www.uitestingplayground.com/), built with
Playwright Test and TypeScript.

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

| Concern | Lives in | Why |
|---|---|---|
| Locators & page actions | `pages/*.ts` | Reusable across tests; if a selector changes, fix it in one place. |
| Navigation + object construction | `fixtures.ts` | Keeps test bodies free of setup boilerplate. |
| Assertions (`expect(...)`) | `tests/*.spec.ts` | Only the test knows what "pass" means for that scenario. Page objects stay reusable even if two tests want different assertions on the same page. |
| Shared page plumbing | `pages/BasePage.ts` | Every page object needs `page` and a way to navigate; defined once instead of repeated in every class. |

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

Every other test (`scrolltoclick.spec.ts`, `dynamictable.spec.ts`) follows the exact same shape:
ask for a fixture → call page-object actions → assert in the test.

## Folder structure

```
fixtures.ts                        Custom `test`/`expect`: wires page objects as fixtures
playwright.config.ts               Playwright runner config (baseURL, projects, CI settings)
tsconfig.json                      TypeScript compiler settings
eslint.config.js                   Lint rules (typescript-eslint + eslint-plugin-playwright)

pages/
  BasePage.ts                      Shared base class: holds `page`, provides navigateTo()
  ProgressBarPage.ts               Locators + actions for /progressbar
  ScrollToClickPage.ts             Locators + actions for /scrolltoclick
  DynamicTablePage.ts              Locators + actions for /dynamictable (name-based cell lookup)

tests/
  progressbar.spec.ts              Test + assertions for the progress bar scenario
  scrolltoclick.spec.ts            Test + assertions for the scroll-to-click scenario
  dynamictable.spec.ts             Test + assertions for the dynamic table scenario

requirements/
  *.requirements.md                One plain-English requirements doc per test scenario
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
     async goto() { await this.navigateTo('/newthing'); }
     async clickSomeButton() { await this.someButton.click(); }
   }
   ```
2. Register it as a fixture in `fixtures.ts` (construct + `goto()` + `use(...)`).
3. Write `tests/newthing.spec.ts` using `{ newThingPage }` and put your `expect(...)` calls there.
4. (Optional but expected in this repo) add `requirements/newthing.requirements.md` describing the
   scenario in plain English.

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Run every spec in `tests/` |
| `npm run test:headed` | Same, with a visible browser |
| `npm run test:dynamictable:stability` | Run the dynamic table test 5x in a row (`--repeat-each=5 --workers=1`) to prove it's stable against randomized row/column order |
| `npm run typecheck` | `tsc --noEmit` — catches type errors without emitting files |
| `npm run lint` / `npm run lint:fix` | ESLint (and autofix) |
| `npm run format` | Prettier, writes in place |
| `npm run report` | Open the last HTML test report |

You can always drop down to the raw CLI too, e.g. `npx playwright test tests/progressbar.spec.ts --headed`.
