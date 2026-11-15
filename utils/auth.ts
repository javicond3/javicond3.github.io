const AUTH_KEY = 'cv_auth';
const CORRECT_PASSWORD = 'javicond3';

// In-memory fallback: some embedding contexts (sandboxed iframes, private
// modes) throw on any localStorage access. Login then lasts for the page
// session only, which is fine there.
let memoryAuth = false;

function safeGet(): string | null {
  try {
    return window.localStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return memoryAuth || safeGet() === 'ok';
}

export function login(password: string): boolean {
  if (password !== CORRECT_PASSWORD) return false;
  memoryAuth = true;
  try {
    window.localStorage.setItem(AUTH_KEY, 'ok');
  } catch {
    /* storage blocked: session-only login */
  }
  return true;
}

export function logout(): void {
  memoryAuth = false;
  try {
    window.localStorage.removeItem(AUTH_KEY);
  } catch {
    /* storage blocked */
  }
}
