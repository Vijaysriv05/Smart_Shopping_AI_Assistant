const SESSION_KEY = "shopping-ai-session-id";
const TOKEN_KEY = "shopping-ai-auth-token";
const USER_KEY = "shopping-ai-auth-user";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_KEY, user.id);
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  const newSession = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, newSession);
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken());
}
