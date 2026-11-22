
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const completedProgress = {
  status: 'completed',
  schema_version: 1,
  current_step: null,
  completed_steps: ['business_profile'],
  skipped_steps: [],
  required_steps_remaining: [],
  onboarding_completed: true,
  business_profile: {
    business_name: 'Alex Creative Studio',
    country: 'NG',
    default_currency: 'NGN',
    address: null,
  },
  next_action: {
    type: 'create_first_document',
    href: '/invoices/new',
  },
  started_at: '2026-11-22T00:00:00Z',
  completed_at: '2026-11-22T00:01:00Z',
  last_activity_at: '2026-11-22T00:01:00Z',
};

const incompleteProgress = {
  ...completedProgress,
  status: 'not_started',
  current_step: 'business_profile',
  completed_steps: [],
  required_steps_remaining: ['business_profile'],
  onboarding_completed: false,
  business_profile: {
    business_name: 'My Business',
    country: 'NG',
    default_currency: 'NGN',
    address: null,
  },
  next_action: {
    type: 'complete_business_profile',
    href: '/onboarding',
  },
  completed_at: null,
};

async function mockSignupApi(
  page: Page,
  onboardingCompleted = false,
) {
  await page.route('**/api/auth/magic-link', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: 'If an account can be created or accessed, a code has been sent.',
        code: '123456',
      }),
    });
  });

  await page.route('**/api/auth/verify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Set-Cookie': 'bagg_session=test-session; Path=/; HttpOnly; SameSite=Lax',
      },
      body: JSON.stringify({
        is_new_user: true,
        user: {
          id: 'test-user',
          email: 'alex@example.com',
          full_name: 'Alex Okafor',
        },
        workspace: {
          id: 'test-workspace',
          business_name: onboardingCompleted
            ? 'Alex Creative Studio'
            : 'My Business',
          onboarding_completed: onboardingCompleted,
        },
      }),
    });
  });
}

async function mockOnboardingApi(page: Page) {
  await page.route('**/api/onboarding', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(incompleteProgress),
    });
  });

  await page.route('**/api/onboarding/business-profile', async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(completedProgress),
    });
  });
}

test.describe('Signup and onboarding', () => {
  test('new Free user signs up, completes business setup and reaches dashboard', async ({
    page,
  }) => {
    await mockSignupApi(page);
    await mockOnboardingApi(page);

    await page.goto('/signup');

    await expect(
      page.getByRole('heading', { name: 'create your Bagg account' }),
    ).toBeVisible();

    await page.getByLabel('Your full name').fill('Alex Okafor');
    await page.getByLabel('Email address').fill('alex@example.com');

    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByLabel('6-digit code')).toBeVisible();

    await page.getByRole('button', {
      name: 'Verify and continue',
    }).click();

    await expect(page).toHaveURL(/\/onboarding$/);

    await expect(
      page.getByRole('heading', { name: 'Set up your business.' }),
    ).toBeVisible();

    // Free signup should not show a plan-selection step.
    await expect(page.getByText('Choose a plan')).toHaveCount(0);

    await page.getByLabel('Business name').fill('Alex Creative Studio');

    await page.getByRole('button', {
      name: 'Continue to Bagg',
    }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('paid-plan intent survives signup and business setup', async ({
    page,
  }) => {
    await mockSignupApi(page);
    await mockOnboardingApi(page);

    await page.goto(
      '/signup?plan=creator_pro&billing_interval=annual',
    );

    await page.getByLabel('Your full name').fill('Alex Okafor');
    await page.getByLabel('Email address').fill('alex@example.com');

    await page.getByRole('button', { name: 'Create account' }).click();

    await page.getByRole('button', {
      name: 'Verify and continue',
    }).click();

    await expect(page).toHaveURL(
      /\/onboarding\?plan=creator_pro&billing_interval=annual$/,
    );

    await expect(page.getByText('Choose a plan')).toBeVisible();

    await page.getByLabel('Business name').fill('Alex Creative Studio');

    await page.getByRole('button', {
      name: 'Continue to Bagg',
    }).click();

    await expect(page).toHaveURL(
      /\/onboarding\/plan\?plan=creator_pro&billing_interval=annual$/,
    );
  });

  test('existing user login does not request a full name', async ({
    page,
  }) => {
    await mockSignupApi(page, true);

    await page.goto('/login');

    await expect(
      page.getByRole('heading', { name: 'welcome back' }),
    ).toBeVisible();

    await expect(page.getByLabel('Your full name')).toHaveCount(0);

    await page.getByLabel('Email address').fill('alex@example.com');

    await page.getByRole('button', {
      name: 'Continue with email',
    }).click();

    await expect(page.getByLabel('6-digit code')).toBeVisible();

    await page.getByRole('button', {
      name: 'Enter workspace',
    }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
