"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CodeInput from "@/components/CodeInput";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function VerifyCodeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(60);

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
        setError(data.detail ?? "Código incorrecto o expirado.");
        return;
      }

      // Guardar tokens y mostrar éxito
      localStorage.setItem("access_token", data.access_token);
      if (data.refresh_token)
        localStorage.setItem("refresh_token", data.refresh_token);

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/estudiante"), 1500);
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
      <div className="verify-page">
        <div className="verify-card">
          <div className="verify-card__accent" />
          <div className="verify-card__body" style={{ textAlign: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: "#4CAF50",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                aria-label="Verificación exitosa"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="verify-title">¡Cuenta activada!</h1>
            <p className="verify-description">
              Redirigiendo al dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-card__accent" />

        <div className="verify-card__body">
          <button
            onClick={() => router.push("/login/estudiante")}
            className="verify-back-btn"
          >
            ← Volver al login
          </button>

          <h1 className="verify-title">
            Ingresa el código de 6 dígitos
          </h1>

          <p className="verify-description">
            Enviamos un código de verificación a<br />
            <strong>{email}</strong>
          </p>

          <div className="verify-code-wrapper">
            <CodeInput length={6} onChange={setCode} />
          </div>

          {error && (
            <p
              style={{
                color: "#F44336",
                fontSize: 14,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || loading}
            className="verify-submit-btn"
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>

          <div className="verify-resend-wrapper">
            <button
              onClick={handleResendCode}
              disabled={cooldown > 0}
              className="verify-resend-btn"
            >
              {cooldown > 0
                ? `Reenviar en ${cooldown}s`
                : "¿No recibiste el código? Reenviar"}
            </button>
          </div>
        </div>
      </div>

      <p className="verify-footer">
        Sistema de Verificación Seguro
      </p>
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
