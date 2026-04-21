import { Page, Locator } from '@playwright/test';

export type UserRole = 'Admin' | 'ESS';
export type UserStatus = 'Enabled' | 'Disabled';

export interface SearchFilters {
  username?: string;
  role?: UserRole;
  status?: UserStatus;
  employeeName?: string;
}

export class AdminPage {
  readonly page: Page;
  readonly adminNavLink: Locator;
  readonly usernameSearchInput: Locator;
  readonly employeeNameInput: Locator;
  readonly userRoleDropdown: Locator;
  readonly statusDropdown: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly tableRows: Locator;
  readonly recordCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.adminNavLink = page.getByRole('link', { name: 'Admin' });

    // Scope each dropdown/input to its labelled input group to avoid ambiguity
    // Username search input has no placeholder — scoped by label instead
    this.usernameSearchInput = page
      .locator('.oxd-input-group')
      .filter({ has: page.locator('label', { hasText: 'Username' }) })
      .locator('input');
    this.employeeNameInput = page
      .locator('.oxd-input-group')
      .filter({ has: page.locator('label', { hasText: 'Employee Name' }) })
      .locator('input');

    this.userRoleDropdown = page
      .locator('.oxd-input-group')
      .filter({ has: page.locator('label', { hasText: 'User Role' }) })
      .locator('.oxd-select-text');

    this.statusDropdown = page
      .locator('.oxd-input-group')
      .filter({ has: page.locator('label', { hasText: 'Status' }) })
      .locator('.oxd-select-text');

    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.tableRows = page.locator('.oxd-table-body .oxd-table-row');
    this.recordCount = page.locator('.orangehrm-horizontal-padding span', {
      hasText: /Record/,
    });
  }

  async navigateToAdmin(): Promise<void> {
    await Promise.all([
      this.page.waitForURL('**/viewSystemUsers**'),
      this.adminNavLink.click(),
    ]);
    await this.searchButton.waitFor({ state: 'visible' });
  }

  private async selectDropdownOption(dropdown: Locator, value: string): Promise<void> {
    await dropdown.click();
    await this.page
      .locator('.oxd-select-dropdown')
      .locator(`span:has-text("${value}")`)
      .click();
  }

  async searchUsers(filters: SearchFilters): Promise<void> {
    if (filters.username) {
      await this.usernameSearchInput.fill(filters.username);
    }
    if (filters.employeeName) {
      await this.employeeNameInput.fill(filters.employeeName);
    }
    if (filters.role) {
      await this.selectDropdownOption(this.userRoleDropdown, filters.role);
    }
    if (filters.status) {
      await this.selectDropdownOption(this.statusDropdown, filters.status);
    }
    await Promise.all([
      this.page.waitForResponse(
        resp => resp.url().includes('/api/v2/admin/users') && resp.status() === 200
      ),
      this.searchButton.click(),
    ]);
    // Wait for the loading spinner to disappear — confirms Vue has rendered the results
    await this.page.locator('.oxd-loading-spinner').waitFor({ state: 'hidden' });
  }

  async getResultCount(): Promise<number> {
    return this.tableRows.count();
  }

  async resetFilters(): Promise<void> {
    await this.resetButton.click();
  }
}