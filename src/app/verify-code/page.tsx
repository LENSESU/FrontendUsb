"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CodeInput from "@/components/CodeInput";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function normalizeErrorMessage(detail: unknown, fallback: string) {
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item && typeof item.msg === "string") {
          return item.msg;
        }
        return null;
      })
      .filter((message): message is string => Boolean(message));

    return messages.length > 0 ? messages.join(", ") : fallback;
  }

  return typeof detail === "string" && detail.trim() ? detail : fallback;
}

function getFriendlyCodeError(detail: unknown) {
  const message = normalizeErrorMessage(detail, "No se pudo verificar el código.");
  const normalized = message.toLowerCase();

  if (normalized.includes("expir")) {
    return "El código ha expirado. Solicita uno nuevo e inténtalo otra vez.";
  }

  if (normalized.includes("incorrect") || normalized.includes("invalid") || normalized.includes("inválido") || normalized.includes("invalido")) {
    return "El código ingresado es incorrecto. Revisa los 6 dígitos e inténtalo nuevamente.";
  }

  if (normalized.includes("auth") || normalized.includes("cred") || normalized.includes("unauthorized")) {
    return "Falló la autenticación de la sesión. Regresa al login e inténtalo otra vez.";
  }

  return message;
}

function VerifyCodeContent() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = useMemo(() => searchParams.get("email")?.trim() ?? "", [searchParams]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (!email) {
      setError("No se encontró un correo para verificar. Regresa al login e inténtalo de nuevo.");
      return;
    }

    if (code.length !== 6) {
      setError("Ingresa el código completo de 6 dígitos.");
      return;
    }

    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(getFriendlyCodeError(data?.detail));
        return;
      }

      if (data?.access_token) {
        localStorage.setItem("access_token", data.access_token);
        if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
      }

      router.push("/dashboard/estudiante");
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError("No se encontró un correo para reenviar el código. Regresa al login.");
      return;
    }

    if (cooldown > 0 || resending) {
      return;
    }

    setError(null);
    setInfo(null);
    setResending(true);

    try {
      const res = await fetch(`${API}/api/v1/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(getFriendlyCodeError(data?.detail));
        return;
      }

      setCooldown(60);
      setInfo("Se envió un nuevo código a tu correo institucional.");
    } catch {
      setError("No se pudo reenviar el código por un problema de conexión.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="verify-card">
      <div className="verify-card__accent" />

      <div className="verify-card__body">
        <button
          onClick={() => router.back()}
          className="verify-back-btn"
        >
          ← Volver
        </button>

        <h1 className="verify-title">
          Ingresa el código de 6 dígitos
        </h1>

        <p className="verify-description">
          {email
            ? <>Ingresa el código enviado a <strong>{email}</strong>.</>
            : "Ingresa el código de verificación enviado a tu correo electrónico registrado."}
        </p>

        {!email && (
          <div className="alert-error" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            <p>No hay un correo asociado a esta verificación. Regresa al login para solicitar el código.</p>
          </div>
        )}

        {error && (
          <div className="alert-error" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            <p>{error}</p>
          </div>
        )}

        {info && (
          <div className="alert-success" role="status">
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 13l4 4L19 7"/>
            </svg>
            <p>{info}</p>
          </div>
        )}

        <div className="verify-code-wrapper">
          <CodeInput
            length={6}
            onChange={(value) => {
              setCode(value);
              if (error) setError(null);
            }}
            hasError={Boolean(error)}
            disabled={loading || resending || !email}
          />
          <p className={`verify-helper-text${error ? " verify-helper-text--error" : ""}`}>
            {error
              ? "Verifica cada dígito antes de continuar."
              : "El código debe tener 6 dígitos numéricos."}
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={code.length !== 6 || loading || !email}
          className="verify-submit-btn"
        >
          {loading ? "Verificando..." : "Verificar"}
        </button>

        <div className="verify-resend-wrapper">
          <button
            onClick={handleResendCode}
            disabled={cooldown > 0 || resending || !email}
            className="verify-resend-btn"
          >
            {resending
              ? "Reenviando..."
              : cooldown > 0
                ? `Reenviar código en ${cooldown}s`
                : "Reenviar Código"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyCodePage() {
  return (
    <div className="verify-page">
      <Suspense fallback={<div className="verify-card"><div className="verify-card__accent" /><div className="verify-card__body"><p className="verify-description">Cargando verificación...</p></div></div>}>
        <VerifyCodeContent />
      </Suspense>

      <p className="verify-footer">
        Sistema de Verificación Seguro
      </p>
    </div>
  );
}
