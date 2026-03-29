const TOKEN_KEY = "pp_token";
const REFRESH_KEY = "pp_refresh";
const USER_KEY = "pp_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, t);
}
export function removeToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}
export function setRefreshToken(t: string) {
  if (typeof window !== "undefined") localStorage.setItem(REFRESH_KEY, t);
}
export function getUser<T = Record<string, unknown>>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function setUser(u: unknown) {
  if (typeof window !== "undefined") localStorage.setItem(USER_KEY, JSON.stringify(u));
}
export function isAuthenticated(): boolean { return !!getToken(); }
