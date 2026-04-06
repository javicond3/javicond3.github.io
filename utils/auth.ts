const AUTH_KEY = 'cv_auth';
const CORRECT_PASSWORD = 'javicond3';

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTH_KEY) === 'ok';
}

export function login(password: string): boolean {
  if (password === CORRECT_PASSWORD) {
    localStorage.setItem(AUTH_KEY, 'ok');
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}
