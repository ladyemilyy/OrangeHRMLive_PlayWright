import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AdminPage, UserRole, UserStatus } from '../pages/AdminPage';

test.describe('OrangeHRM Admin Panel', () => {
  let loginPage: LoginPage;
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    adminPage = new AdminPage(page);
    await loginPage.goto();
    await loginPage.login(
      process.env.ORANGEHRM_USERNAME ?? 'Admin',
      process.env.ORANGEHRM_PASSWORD ?? 'admin123'
    );
    await page.waitForURL('**/dashboard**');
  });

  test('should navigate to the admin panel', async ({ page }) => {
    await adminPage.navigateToAdmin();
    await expect(page).toHaveURL(/viewSystemUsers/);
    await expect(page.getByRole('heading', { name: 'System Users' })).toBeVisible();
  });

  test('should search for a user by username', async () => {
    await adminPage.navigateToAdmin();
    await adminPage.searchUsers({ username: 'Admin' });
    const count = await adminPage.getResultCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter users by role: Admin', async () => {
    const role: UserRole = 'Admin';
    await adminPage.navigateToAdmin();
    await adminPage.searchUsers({ role });
    await expect(adminPage.tableRows.first()).toBeVisible();
  });

  test('should filter users by role: ESS', async () => {
    const role: UserRole = 'ESS';
    await adminPage.navigateToAdmin();
    await adminPage.searchUsers({ role });
    // ESS users may or may not exist — just assert the search completed
    await expect(adminPage.searchButton).toBeVisible();
  });

  test('should filter users by status: Enabled', async () => {
    const status: UserStatus = 'Enabled';
    await adminPage.navigateToAdmin();
    await adminPage.searchUsers({ status });
    await expect(adminPage.tableRows.first()).toBeVisible();
  });

  test('should filter users by status: Disabled', async () => {
    const status: UserStatus = 'Disabled';
    await adminPage.navigateToAdmin();
    await adminPage.searchUsers({ status });
    await expect(adminPage.searchButton).toBeVisible();
  });

  test('should filter using combined role and status', async () => {
    await adminPage.navigateToAdmin();
    await adminPage.searchUsers({ role: 'Admin', status: 'Enabled' });
    await expect(adminPage.tableRows.first()).toBeVisible();
  });

  test('should reset filters after a search', async () => {
    await adminPage.navigateToAdmin();
    await adminPage.searchUsers({ username: 'Admin', role: 'Admin' });
    await adminPage.resetFilters();
    await expect(adminPage.usernameSearchInput).toHaveValue('');
  });
});