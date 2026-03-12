"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAuth, getDashboardPathByRole } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LoginEstudiantePage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError]     = useState<string | null>(null);

  function clearFieldError(field: "email" | "password") {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      return { ...current, [field]: undefined };
    });
  }

  function getLoginErrorMessage(detail?: string) {
    if (!detail) return "Correo o contraseña incorrectos.";

    const normalizedDetail = detail.toLowerCase();

    if (
      normalizedDetail.includes("incorrect") ||
      normalizedDetail.includes("invalid") ||
      normalizedDetail.includes("credencial") ||
      normalizedDetail.includes("contrase")
    ) {
      return "Correo o contraseña incorrectos.";
    }

    return detail;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Validacion de correo
    const pattern = /^[a-zA-Z0-9]+@correo\.usbcali\.edu\.co$/; // '(letras y numeros)@usbcali.edu.co' | Los valores despues del @ son fijos, no hacepta modificaciones.
    const trimmedEmail = email.trim(); // quita los espacios en blanco
    const trimmedPassword = password.trim();
    const nextFieldErrors: { email?: string; password?: string } = {};

    if(!trimmedEmail){
      nextFieldErrors.email = "Por favor ingresa tu correo institucional.";
    }

    if(trimmedEmail && !pattern.test(trimmedEmail)){ // Validacion del email
      nextFieldErrors.email = "El correo institucional no es valido.";
    }

    if(!trimmedPassword){
      nextFieldErrors.password = "Por favor ingresa tu contraseña.";
    }

    if (nextFieldErrors.email || nextFieldErrors.password) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(getLoginErrorMessage(data.detail));
        return;
      }

      // Guardar sesión 
      const auth = saveAuth({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      });

      // Redirigir según rol
      const path = getDashboardPathByRole(auth.role);
      router.push(path);
      
    } catch {
      setFormError("Sin conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-centered">
      <div className="form-wrapper">

        <button className="btn-back" onClick={() => router.push("/")}>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Volver al inicio
        </button>

        <div className="card">
          <div className="card-stripe" />
          <div className="card-body-center">

            <div className="icon-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>

            <h1 className="card-form-title">Acceso Estudiante</h1>

            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="email">Correo institucional</label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="usuario@correo.usbcali.edu.co"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setFormError(null);
                    clearFieldError("email");
                  }}
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  className={fieldErrors.email ? "input-error" : ""}
                />
                {fieldErrors.email && <p id="email-error" className="field-error-text">{fieldErrors.email}</p>}
              </div>

              <div className="field">
                <label htmlFor="password">Contraseña</label>
                <div className="input-wrap">
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setFormError(null);
                      clearFieldError("password");
                    }}
                    required
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    className={fieldErrors.password ? "input-error" : ""}
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
                {fieldErrors.password && <p id="password-error" className="field-error-text">{fieldErrors.password}</p>}
              </div>

              {formError && (
                <div className="alert-error" role="alert">
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                  </svg>
                  <p>{formError}</p>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading
                  ? <><span className="spinner" aria-hidden="true" />Ingresando...</>
                  : "INGRESAR"}
              </button>
            </form>

            <button className="btn-link" onClick={() => router.push("/register/estudiante")}>
              ¿No tienes cuenta? Regístrate
            </button>

          </div>
        </div>

        <p className="page-footer">© {new Date().getFullYear()} Universidad de San Buenaventura Cali · USB LENS</p>
      </div>
    </div>
  );
}