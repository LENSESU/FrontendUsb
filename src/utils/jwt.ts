export type JwtPayload = {
  email?: string;
  role_name?: string;
  exp?: number;
};

function normalizeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64 + "=".repeat((4 - (base64.length % 4)) % 4);
}

export function decodeJWT(token: string): JwtPayload | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const decoded = atob(normalizeBase64Url(payloadPart));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}