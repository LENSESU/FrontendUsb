import { decodeJWT } from "./jwt";

const AUTH_KEY = "auth";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AuthData = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  email: string | null;
  role: string | null;
};

export function saveAuth(params: {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
}): AuthData {
  const decoded = decodeJWT(params.accessToken);

  const authData: AuthData = {
    accessToken: params.accessToken,
    refreshToken: params.refreshToken ?? null,
    expiresIn: params.expiresIn ?? null,
    email: decoded?.email ?? null,
    role: decoded?.role_name ?? null,
  };

  localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
  return authData;
}

export function getAuth(): AuthData | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthData) : null;
  } catch {
    return null;
  }
}

export function getDashboardPathByRole(role: string | null): string {
  const normalized = (role ?? "").toLowerCase();
  if (normalized === "student") return "/dashboard/estudiante";
  if (normalized === "administrator") return "/dashboard/admin";
  if (normalized === "technician") return "/dashboard/tecnico";
  return "/login";
}

async function validateAccessToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) return false;

    const data = (await response.json()) as { valid?: boolean };
    return Boolean(data.valid);
  } catch {
    return false;
  }
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token?: string | null; expires_in?: number } | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return null;

    return (await response.json()) as {
      access_token: string;
      refresh_token?: string | null;
      expires_in?: number;
    };
  } catch {
    return null;
  }
}

export async function restoreAuthSession(): Promise<AuthData | null> {
  console.log("Restaurando sesión...");

  const auth = getAuth();
  console.log("Auth guardado:", auth);

  if (!auth?.accessToken) return null;

  const isValid = await validateAccessToken(auth.accessToken);
  console.log("¿Token válido?", isValid);

  if (isValid) return auth;

  if (!auth.refreshToken) return null;

  console.log("Intentando refresh...");
  const refreshed = await refreshAccessToken(auth.refreshToken);

  if (!refreshed?.access_token) return null;

  console.log("Refresh exitoso");

  return saveAuth({
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? auth.refreshToken,
    expiresIn: refreshed.expires_in ?? auth.expiresIn,
  });
}