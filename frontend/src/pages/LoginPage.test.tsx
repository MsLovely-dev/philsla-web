import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { PhilSAProvider } from '../PhilSAContext';
import LoginPage from './LoginPage';

function renderLoginPage(initialPath: string) {
  return render(
    <PhilSAProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <LoginPage />
      </MemoryRouter>
    </PhilSAProvider>,
  );
}

describe('LoginPage', () => {
  it('prefills bulk activation email and shows first-time login context from direct link', () => {
    renderLoginPage('/login?activation=bulk&email=bulk.student%40example.test');

    expect(screen.getByRole('textbox', { name: /account email/i })).toHaveValue('bulk.student@example.test');
    expect(screen.getByText(/First-time student login/i)).toBeInTheDocument();
  });
});
