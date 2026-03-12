"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAuth, getDashboardPathByRole } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const STUDENT_ROLE_ID = "f2f2e715-dde6-43e7-9bd4-21e222ff4d5e";

export default function RegisterEstudiantePage() {
  const router = useRouter();
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          password,
          role_id: STUDENT_ROLE_ID,
        }),
      });
        const data = await res.json();
        if (!res.ok) {
        if (Array.isArray(data.detail)) {
            setError(data.detail.map((e: { msg: string }) => e.msg).join(", "));
        } else {
            setError(data.detail ?? "No se pudo completar el registro.");
        }
        return;
        }
      // Registro exitoso → redirigir a la pantalla de verificación de código
      router.push(`/verify-code?email=${encodeURIComponent(email.trim())}`);
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-centered">
      <div className="form-wrapper">

        <button
          className="btn-back"
          onClick={() => router.push("/login/estudiante")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Volver al login
        </button>

        <div className="card">
          <div className="card-stripe" />
          <div className="card-body-center">

            {/* ── FORMULARIO ── */}
              <>
                <div className="icon-wrap">
                  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                  </svg>
                </div>
                <h1 className="card-form-title">Crear cuenta</h1>

                <form onSubmit={handleRegisterSubmit} noValidate>
                  <div className="field">
                    <label htmlFor="firstName">Nombre</label>
                    <input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Tu nombre"
                      value={firstName}
                      onChange={e => { setFirstName(e.target.value); setError(null); }}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="lastName">Apellido</label>
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      placeholder="Tu apellido"
                      value={lastName}
                      onChange={e => { setLastName(e.target.value); setError(null); }}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="email">Correo institucional</label>
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="usuario@correo.usbcali.edu.co"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(null); }}
                      required
                      className={error ? "input-error" : ""}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="password">Contraseña</label>
                    <div className="input-wrap">
                      <input
                        id="password"
                        type={showPass ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(null); }}
                        required
                      />
                      <button
                        type="button"
                        className="input-icon-right"
                        onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPass ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                        )}
                      </button>
                    </div>
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
                    {loading
                      ? <><span className="spinner" aria-hidden="true" />Registrando...</>
                      : "CREAR CUENTA"}
                  </button>
                </form>

                <button className="btn-link" onClick={() => router.push("/login/estudiante")}>
                  ¿Ya tienes cuenta? Inicia sesión
                </button>
              </>

          </div>
        </div>

        <p className="page-footer">© {new Date().getFullYear()} Universidad de San Buenaventura Cali · USB LENS</p>
      </div>
    </div>
  );
}