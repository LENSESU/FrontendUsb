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

/**
  Guarda la información de autenticación del usuario en el navegador.
 
  Decodifica el accessToken para extraer datos de email y rol,
  construye el objeto AuthData y lo almacena en localStorage.
 
  Args:
    accessToken: Token JWT de acceso.
    refreshToken: Token de refresco opcional.
    expiresIn: Tiempo de expiración en segundos.
 
  Returns:
    Objeto AuthData con la sesión almacenada.
 */
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

/**
  Obtiene la sesión almacenada en el navegador.
 
  Lee la clave AUTH_KEY desde localStorage y la convierte
  en un objeto AuthData.
 
  Returns:
    Objeto AuthData si existe sesión válida,
    o null si no hay sesión guardada o ocurre un error.
 */
export function getAuth(): AuthData | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthData) : null;
  } catch {
    return null;
  }
}

/**
  Determina la ruta de dashboard según el rol del usuario.
 
  Normaliza el rol a minúsculas y retorna la ruta correspondiente.
  Si el rol no coincide con ninguno definido, redirige al home.
 
  Args:
    role: Rol del usuario autenticado.
 
  Returns:
    Ruta del dashboard asociada al rol o "/" por defecto.
 */
export function getDashboardPathByRole(role: string | null): string {
  const normalized = (role ?? "").toLowerCase();
  if (normalized === "student") return "/dashboard/estudiante";
  if (normalized === "administrator") return "/dashboard/admin";
  if (normalized === "technician") return "/dashboard/tecnico";
  return "/";
}

/**
  Valida el accessToken contra el backend.
 
  Envía el token al endpoint /auth/validate para verificar
  si sigue siendo válido.
 
  Args:
    token: Token JWT de acceso.
 
  Returns:
    true si el token es válido.
    false si es inválido o ocurre un error.
 */
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

/**
  Solicita un nuevo accessToken utilizando el refreshToken.
 
  Llama al endpoint /auth/refresh para renovar la sesión
  cuando el accessToken ha expirado.
 
  Args:
    refreshToken: Token de refresco almacenado.
 
  Returns:
    Objeto con el nuevo access_token si es exitoso.
    null si la renovación falla.
 */
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

/**
  Restaura la sesión del usuario al iniciar la aplicación.
 
  Obtiene la sesión guardada en localStorage y valida el accessToken
  con el backend. Si el token es válido, retorna la sesión actual.
  Si es inválido, intenta renovarlo utilizando el refreshToken.
  Si la renovación es exitosa, guarda la nueva sesión.
  Si no se puede validar ni renovar, retorna null.
 
  Returns:
    Objeto AuthData con la sesión válida.
    null si no se puede restaurar la sesión.
 */
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