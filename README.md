# OrangeHRM Live - Playwright Test Automation

End-to-end test suite for [OrangeHRM Live](https://opensource-demo.orangehrmlive.com) built with Playwright and TypeScript, following the Page Object Model pattern.

---

## Project Structure

```
OrangeHRMLive_PlayWright/
├── pages/                  # Page Object Models
│   ├── LoginPage.ts        # Login page interactions
│   └── AdminPage.ts        # Admin panel interactions
├── tests/                  # Test specifications
│   └── admin.spec.ts       # Admin panel test cases
├── playwright.config.ts    # Playwright configuration
├── package.json
└── .github/
    └── workflows/
        └── playwright.yml  # CI/CD pipeline
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version)
- npm

---

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install:browsers
```

---

## Running Tests

| Command | Description |
|---|---|
| `npm test` | Run all tests headlessly |
| `npm run test:headed` | Run with browser visible |
| `npm run test:debug` | Run in Playwright debug mode |
| `npm run test:ui` | Open Playwright UI mode |
| `npm run test:admin` | Run admin tests only (headed) |
| `npm run test:report` | Open the last HTML report |

---

## Environment Variables

Credentials are read from environment variables, with demo defaults as fallback.

| Variable | Default | Description |
|---|---|---|
| `ORANGEHRM_USERNAME` | `Admin` | Login username |
| `ORANGEHRM_PASSWORD` | `admin123` | Login password |

To override, create a `.env` file or export the variables before running:

```bash
export ORANGEHRM_USERNAME=Admin
export ORANGEHRM_PASSWORD=admin123
npm test
```

---

## Test Coverage

### Admin Panel (`tests/admin.spec.ts`)

| Test | What it verifies |
|---|---|
| Navigate to admin panel | URL and page heading are correct after clicking Admin nav link |
| Search by username | Results are returned for a known username |
| Filter by role: Admin | Table rows are visible after filtering by Admin role |
| Filter by role: ESS | Search completes without error for ESS role |
| Filter by status: Enabled | Table rows are visible after filtering by Enabled status |
| Filter by status: Disabled | Search completes without error for Disabled status |
| Combined role and status filter | Results visible when filtering by Admin + Enabled |
| Reset filters | Username input is cleared after clicking Reset |

---

## Design Decisions

### Page Object Model (POM)

Test logic lives in spec files; page interactions live in page classes. This separation means:
- A UI change (e.g. a button is renamed) only needs to be fixed in one place
- Test files read like plain English, making intent clear
- Page classes can be reused across multiple spec files

### Scoped Locators for Dropdowns

OrangeHRM's dropdown elements share the same CSS class (`.oxd-select-text`) across multiple fields on the same page. Selecting by class alone would be ambiguous. Instead, each dropdown is scoped to its parent input group and filtered by its label:

```typescript
this.userRoleDropdown = page
  .locator('.oxd-input-group')
  .filter({ has: page.locator('label', { hasText: 'User Role' }) })
  .locator('.oxd-select-text');
```

This makes locators resilient to page layout changes and unambiguous regardless of how many dropdowns exist.

### Accessibility-First Locators

Where possible, locators use `getByRole` and `getByPlaceholder` rather than CSS classes or XPath. These are closer to how a user perceives the page and are less likely to break when styling changes.

The Admin search username field is an exception — it has no `placeholder` attribute, only a visible label. It uses the same label-scoped pattern as the dropdowns:

```typescript
this.usernameSearchInput = page
  .locator('.oxd-input-group')
  .filter({ has: page.locator('label', { hasText: 'Username' }) })
  .locator('input');
```

### TypeScript Types for Test Data

`UserRole` and `UserStatus` are defined as union types, and `SearchFilters` is a typed interface. This means:
- Passing an invalid role like `'Manager'` is caught at compile time, not at runtime
- IDE autocomplete works when writing new tests
- The interface documents what search options are available

### Wait Strategy After Search

`networkidle` is avoided because it waits for all network activity to settle — Firefox in particular keeps background requests alive indefinitely, causing timeouts. Instead, search uses two specific waits:

1. `waitForResponse` on the `/api/v2/admin/users` API call — confirms the HTTP response arrived
2. `.oxd-loading-spinner` hidden wait — confirms Vue.js has finished rendering the response into the DOM

```typescript
await Promise.all([
  this.page.waitForResponse(
    resp => resp.url().includes('/api/v2/admin/users') && resp.status() === 200
  ),
  this.searchButton.click(),
]);
await this.page.locator('.oxd-loading-spinner').waitFor({ state: 'hidden' });
```

The two-step approach is necessary because the API response arrives before the framework updates the DOM — counting rows immediately after the response would return stale data.

### Navigation Reliability

`navigateToAdmin()` uses `Promise.all` to set up the URL listener before clicking, avoiding a race where fast navigation could complete before the listener was registered:

```typescript
await Promise.all([
  this.page.waitForURL('**/viewSystemUsers**'),
  this.adminNavLink.click(),
]);
```

### Parallelism and Timeout Config

Tests run against a shared public demo server, so parallel workers are capped at 2 locally (instead of the default CPU count). The test timeout is set to 60s to accommodate variable network response times. CI still uses a single worker.

---

## CI/CD

Tests run automatically on every push and pull request to `main` via GitHub Actions. The pipeline:
1. Installs Node.js (LTS)
2. Installs dependencies and Playwright browsers
3. Runs the full test suite
4. Uploads the HTML report as an artifact (retained for 30 days)

See `.github/workflows/playwright.yml` for the full configuration.

---

## Browser Coverage

Tests run across three browser engines:

| Project | Engine |
|---------|--------|
| `chromium` | Chrome/Edge |
| `firefox` | Firefox |
| `webkit` | Safari |