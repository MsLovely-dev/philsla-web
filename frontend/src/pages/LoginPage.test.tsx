import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { usePhilSA } from '../PhilSAContext';
import LoginPage from './LoginPage';

const FAILED_ATTEMPT_MESSAGE = /multiple sign-in attempts have failed/i;

vi.mock('../PhilSAContext', async () => {
  const actual = await vi.importActual<typeof import('../PhilSAContext')>('../PhilSAContext');
  return { ...actual, usePhilSA: vi.fn() };
});

const mockUsePhilSA = vi.mocked(usePhilSA);

function renderLoginWithMockedAuth(
  overrides: Partial<ReturnType<typeof usePhilSA>> = {},
  initialPath = '/login',
) {
  mockUsePhilSA.mockReturnValue({
    startLoginIdentifier: vi.fn().mockResolvedValue({
      ok: true,
      data: { pendingAuthToken: 'pending-token', nextStep: 'password', expiresInSeconds: 600 },
    }),
    verifyLoginPassword: vi.fn().mockResolvedValue({
      ok: false,
      error: { message: 'Incorrect email/LRN or password.' },
    }),
    completeStaffActivation: vi.fn(),
    completeTemporaryPasswordChange: vi.fn(),
    resendLoginOtp: vi.fn(),
    verifyLoginOtp: vi.fn(),
    completeLoginSelfie: vi.fn(),
    requestPasswordRecovery: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof usePhilSA>);

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

async function submitIdentifier(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.clear(screen.getByPlaceholderText(/enter your account email/i));
  await user.type(screen.getByPlaceholderText(/enter your account email/i), email);
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await waitFor(() => expect(screen.getByPlaceholderText(/enter your account password/i)).toBeInTheDocument());
}

async function submitWrongPassword(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(/enter your account password/i), 'wrong-password');
  await user.click(screen.getByRole('button', { name: /send email otp/i }));
  await waitFor(() => expect(screen.getByText(/incorrect email\/lrn or password/i)).toBeInTheDocument());
}

describe('LoginPage', () => {
  it('prefills bulk activation email and shows first-time login context from direct link', () => {
    renderLoginWithMockedAuth({}, '/login?activation=bulk&email=bulk.student%40example.test');

    expect(screen.getByRole('textbox', { name: /account email/i })).toHaveValue('bulk.student@example.test');
    expect(screen.getByText(/First-time student login/i)).toBeInTheDocument();
  });
});

describe('LoginPage failed-attempt indicator', () => {
  it('does not show the failed-attempt banner on attempts 1 through 4', async () => {
    const user = userEvent.setup();
    renderLoginWithMockedAuth();

    await submitIdentifier(user, 'student.demo@yopmail.com');
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await submitWrongPassword(user);
      expect(screen.queryByText(FAILED_ATTEMPT_MESSAGE)).not.toBeInTheDocument();
    }
  });

  it('shows the failed-attempt banner starting at the 5th consecutive failure (matches AUTH_PASSWORD_MAX_ATTEMPTS)', async () => {
    const user = userEvent.setup();
    renderLoginWithMockedAuth();

    await submitIdentifier(user, 'student.demo@yopmail.com');
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await submitWrongPassword(user);
    }

    expect(screen.getByText(FAILED_ATTEMPT_MESSAGE)).toBeInTheDocument();
  });

  it('does not carry the counter over to a fresh component mount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderLoginWithMockedAuth();

    await submitIdentifier(user, 'student.demo@yopmail.com');
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await submitWrongPassword(user);
    }
    expect(screen.getByText(FAILED_ATTEMPT_MESSAGE)).toBeInTheDocument();

    unmount();
    renderLoginWithMockedAuth();

    await submitIdentifier(user, 'someone.else@yopmail.com');
    await submitWrongPassword(user);

    expect(screen.queryByText(FAILED_ATTEMPT_MESSAGE)).not.toBeInTheDocument();
  });
});
