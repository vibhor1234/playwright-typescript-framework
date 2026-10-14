# Requirement: Progress Bar

**URL:** http://www.uitestingplayground.com/progressbar

**Scenario:** Start the progress bar and stop it once it reaches a target value.

## Steps

1. Navigate to the Progress Bar page.
2. Click the **Start** button to begin the progress animation.
3. Wait until the progress bar's value reaches at least 75%.
4. Click the **Stop** button.

## Expected Result

- The progress bar's `aria-valuenow` attribute is greater than or equal to 75 when stopped.
