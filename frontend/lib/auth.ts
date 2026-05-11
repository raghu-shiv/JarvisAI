const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
const ACCESS_TOKEN_KEY = "jarvis_access_token";
const REFRESH_TOKEN_KEY = "jarvis_refresh_token";

type AuthPayload = {
  access: string;
  refresh: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
};

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

function storeTokens(data: AuthPayload) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function login(username: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  const data = (await response.json()) as AuthPayload;
  storeTokens(data);
  return data.user;
}

export async function register(input: { username: string; email: string; password: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Registration failed");
  }

  const data = (await response.json()) as AuthPayload;
  storeTokens(data);
  return data.user;
}

export async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const data = (await response.json()) as AuthPayload;
  storeTokens({ access: data.access, refresh: data.refresh ?? refresh });
  return data.access;
}

export async function logout() {
  const refresh = getRefreshToken();
  if (refresh) {
    await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify({ refresh }),
    }).catch(() => undefined);
  }
  clearTokens();
}
