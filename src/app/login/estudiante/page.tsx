"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Step = "email" | "otp" | "success";

export default function LoginEstudiantePage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>("email");
  const [email, setEmail]       = useState("");
  const [otp, setOtp]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: "" }),
      });
      const data = await res.json();
      if (res.ok || res.status === 400 || res.status === 401) {
        setStep("otp");
        setCooldown(60);
        return;
      }
      setError(data.detail ?? "No se pudo enviar el código. Intenta de nuevo.");
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "Código incorrecto o expirado.");
        return;
      }
      localStorage.setItem("access_token", data.access_token);
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
      setStep("success");
      setTimeout(() => router.push("/dashboard/estudiante"), 1500);
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? "No se pudo reenviar."); return; }
      setCooldown(60);
    } catch {
      setError("Error de conexión al reenviar.");
    }
  }

  return (
    <div className="page-centered">
      <div className="form-wrapper">

        <button
          className="btn-back"
          onClick={() => step === "email"
            ? router.push("/")
            : (setStep("email"), setOtp(""), setError(null))
          }
        >
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          {step === "email" ? "Volver al inicio" : "Cambiar correo"}
        </button>

        <div className="card">
          <div className="card-stripe" />
          <div className="card-body-center">

            {/* ── EMAIL ── */}
            {step === "email" && (
              <>
                <div className="icon-wrap">
                  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h1 className="card-form-title">Welcome back</h1>
                <form onSubmit={handleEmailSubmit} noValidate>
                  <div className="field">
                    <label htmlFor="email">Institutional Email</label>
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="usuario@correo.usbcali.edu.co"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className={error ? "input-error" : ""}
                    />
                  </div>
                  {error && (
                    <div className="alert-error" role="alert">
                      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                      </svg>
                      <p>{error}</p>
                    </div>
                  )}
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? <><span className="spinner" aria-hidden="true" />Enviando...</> : "SEND CODE"}
                  </button>
                </form>
                <button className="btn-link" onClick={() => router.push("/login/admin")}>
                  Login with SSO
                </button>
              </>
            )}

            {/* ── OTP ── */}
            {step === "otp" && (
              <>
                <div className="icon-wrap">
                  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2"/>
                    <path strokeLinecap="round" d="M8 11V7a4 4 0 018 0v4"/>
                  </svg>
                </div>
                <h1 className="card-form-title">Verifica tu correo</h1>
                <p className="otp-hint">
                  Enviamos un código de 6 dígitos a<br />
                  <strong>{email}</strong>
                </p>
                <form onSubmit={handleOtpSubmit} noValidate>
                  <div className="field">
                    <label htmlFor="otp">Código de verificación</label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      maxLength={6}
                      autoFocus
                      className={`input-otp${error ? " input-error" : ""}`}
                    />
                  </div>
                  {error && (
                    <div className="alert-error" role="alert">
                      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                      </svg>Estudiant
                      <p>{error}</p>
                    </div>
                  )}
                  <button type="submit" className="btn-primary" disabled={loading || otp.length < 6}>
                    {loading ? <><span className="spinner" aria-hidden="true" />Verificando...</> : "VERIFICAR CÓDIGO"}
                  </button>
                </form>
                <button className="btn-link" onClick={handleResend} disabled={cooldown > 0}>
                  {cooldown > 0 ? `Reenviar en ${cooldown}s` : "¿No recibiste el código? Reenviar"}
                </button>
              </>
            )}

            {/* ── SUCCESS ── */}
            {step === "success" && (
              <>
                <div className="success-icon-wrap">
                  <svg width="28" height="28" viewBox="0 0 24 24" aria-label="Acceso exitoso">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h2 className="card-form-title">¡Acceso exitoso!</h2>
                <p className="text-secondary text-small">Redirigiendo al dashboard...</p>
              </>
            )}

          </div>
        </div>

        <p className="page-footer">© {new Date().getFullYear()} Universidad de San Buenaventura Cali · USB LENS</p>
      </div>
    </div>
  );
}