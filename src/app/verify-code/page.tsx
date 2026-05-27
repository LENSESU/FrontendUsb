"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CodeInput from "@/components/CodeInput";
import { getDashboardPathByRole, saveAuth } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function VerifyCodeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  function getVerifyCodeErrorMessage(detail?: string) {
    if (!detail) return "Código incorrecto o expirado.";

    const normalizedDetail = detail.toLowerCase();

    if (normalizedDetail.includes("expir")) {
      return "El código ha expirado. Solicita uno nuevo.";
    }

    if (normalizedDetail.includes("incorrect") || normalizedDetail.includes("invalid")) {
      return "El código ingresado no es correcto.";
    }

    return detail;
  }

  // Si no hay email en los query params, redirigir al registro
  useEffect(() => {
    if (!email) {
      router.replace("/register/estudiante");
    }
  }, [email, router]);

  // Temporizador de cooldown para reenvío
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleVerify() {
    if (code.length !== 6) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(getVerifyCodeErrorMessage(data.detail));
        return;
      }

      const auth = saveAuth({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(getDashboardPathByRole(auth.role));
      }, 1500);
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (cooldown > 0) return;
    setError(null);

    try {
      const res = await fetch(`${API}/api/v1/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "No se pudo reenviar el código.");
        return;
      }

      setCooldown(60);
    } catch {
      setError("Error de conexión al reenviar.");
    }
  }

  if (!email) return null;

  if (success) {
    return (
      <div className="page-centered">
        <div className="form-wrapper">
          <div className="card">
            <div className="card-stripe" />
            <div className="card-body-center">
              <div className="success-icon-wrap">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              </div>
              <h1 className="card-form-title">Cuenta activada</h1>
              <p className="card-desc">Redirigiendo al dashboard...</p>
            </div>
          </div>

          <p className="page-footer">
            © {new Date().getFullYear()} Universidad San Buenaventura Cali · USB LENS
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-centered">
      <div className="form-wrapper">
        <button
          onClick={() => router.push("/login/estudiante")}
          className="btn-back"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver al login
        </button>

        <div className="card">
          <div className="card-stripe" />

          <div className="card-body-center">
            <div className="icon-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8l8 5 8-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8l8-5 8 5v8l-8 5-8-5V8z" />
              </svg>
            </div>

            <h1 className="card-form-title">Ingresa el código de verificación</h1>

            <p className="otp-hint">
              Enviamos un código de 6 dígitos a <strong>{email}</strong>
            </p>

            <div className="verify-code-wrapper">
              <CodeInput
                length={6}
                onChange={(nextCode) => {
                  setCode(nextCode);
                  if (error) setError(null);
                }}
                hasError={Boolean(error)}
              />
            </div>

            {error ? (
              <div className="alert-error" role="alert">
                <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
                <p>{error}</p>
              </div>
            ) : null}

            <button
              onClick={handleVerify}
              disabled={code.length !== 6 || loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Verificando...
                </>
              ) : (
                "Verificar"
              )}
            </button>

            <button
              onClick={handleResendCode}
              disabled={cooldown > 0}
              className="btn-link"
            >
              {cooldown > 0
                ? `Reenviar en ${cooldown}s`
                : "¿No recibiste el código? Reenviar"}
            </button>
          </div>
        </div>

        <p className="page-footer">
          © {new Date().getFullYear()} Universidad San Buenaventura Cali · USB LENS
        </p>
      </div>
    </div>
  );
}

export default function VerifyCodePage() {
  return (
    <Suspense>
      <VerifyCodeContent />
    </Suspense>
  );
}
