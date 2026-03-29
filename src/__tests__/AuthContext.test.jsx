import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// A helper component that exposes context values via the DOM
function TestConsumer() {
  const { isLoggedIn, adminName, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="logged-in">{String(isLoggedIn)}</span>
      <span data-testid="admin-name">{adminName}</span>
      <span data-testid="loading">{String(loading)}</span>
      <button onClick={() => login('admin', 'pass')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('starts with logged-out state when no stored token', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    expect(getByTestId('logged-in').textContent).toBe('false');
  });

  it('verifies an existing token from localStorage on mount', async () => {
    localStorage.setItem('authToken', 'existing-token');
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ user: { id: 1, username: 'admin' } }),
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(getByTestId('logged-in').textContent).toBe('true'));
    expect(getByTestId('admin-name').textContent).toBe('admin');
  });

  it('removes an invalid token from localStorage', async () => {
    localStorage.setItem('authToken', 'bad-token');
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ error: 'invalid token' }),
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(getByTestId('logged-in').textContent).toBe('false');
  });

  it('login stores the token and sets logged-in state', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'new-token', user: { id: 1, username: 'admin' } }),
    });

    const { getByRole, getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      getByRole('button', { name: 'Login' }).click();
    });

    await waitFor(() => expect(getByTestId('logged-in').textContent).toBe('true'));
    expect(localStorage.getItem('authToken')).toBe('new-token');
    expect(getByTestId('admin-name').textContent).toBe('admin');
  });

  it('login returns false on failed credentials', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'invalid credentials' }),
    });

    let result;
    function CaptureLogin() {
      const { login } = useAuth();
      return (
        <button
          onClick={async () => {
            result = await login('admin', 'wrong');
          }}
        >
          TryLogin
        </button>
      );
    }

    const { getByRole } = render(
      <AuthProvider>
        <CaptureLogin />
      </AuthProvider>
    );

    await act(async () => {
      getByRole('button', { name: 'TryLogin' }).click();
    });

    expect(result).toBe(false);
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('logout clears the token and logged-in state', async () => {
    localStorage.setItem('authToken', 'some-token');
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ user: { id: 1, username: 'admin' } }),
    });

    const { getByRole, getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(getByTestId('logged-in').textContent).toBe('true'));

    await act(async () => {
      getByRole('button', { name: 'Logout' }).click();
    });

    expect(getByTestId('logged-in').textContent).toBe('false');
    expect(localStorage.getItem('authToken')).toBeNull();
  });
});
