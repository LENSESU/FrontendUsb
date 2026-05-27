"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getDashboardPathByRole, saveAuth } from "@/utils/auth";

type StaffLoginFormProps = {
  title: string;
  allowedRoles?: Array<"administrator" | "technician">;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function StaffLoginForm({
  title,
  allowedRoles = ["administrator", "technician"],
}: StaffLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  function clearFieldError(field: "email" | "password") {
    setErrors((current) => {
      if (!current[field]) return current;
      return { ...current, [field]: undefined };
    });
  }

  function getLoginErrorMessage(detail?: string) {
    if (!detail) return "No se pudo iniciar sesión.";

    const normalized = detail.toLowerCase();
    if (
      normalized.includes("incorrect") ||
      normalized.includes("invalid") ||
      normalized.includes("credencial") ||
      normalized.includes("contrase")
    ) {
      return "Correo o contraseña incorrectos.";
    }

    return detail;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const institutionalEmailPattern = /^[a-zA-Z0-9._%+-]+@usbcali\.edu\.co$/;

    if (!trimmedEmail) {
      nextErrors.email = "El correo institucional es obligatorio.";
    } else if (!institutionalEmailPattern.test(trimmedEmail)) {
      nextErrors.email = "Debes usar un correo institucional @usbcali.edu.co.";
    }

    if (!trimmedPassword) {
      nextErrors.password = "La contraseña es obligatoria.";
    }

    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setLoading(true);

    try {
      const response = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setFormError(getLoginErrorMessage(data.detail));
        return;
      }

      const auth = saveAuth({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      });

      const normalizedRole = (auth.role ?? "").toLowerCase();
      if (
        normalizedRole !== "administrator" &&
        normalizedRole !== "technician"
      ) {
        localStorage.removeItem("auth");
        setFormError("Solo pueden ingresar cuentas de administrador o técnico.");
        return;
      }

      if (!allowedRoles.includes(normalizedRole)) {
        localStorage.removeItem("auth");
        setFormError("Solo pueden ingresar cuentas de administrador o técnico.");
        return;
      }

      router.push(getDashboardPathByRole(auth.role));
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver al inicio
        </button>

        <div className="card">
          <div className="card-stripe" />

          {loading ? (
            <div className="card-body-center">
              <span className="skeleton" style={{ width: 52, height: 52, borderRadius: "var(--radius-md)", alignSelf: "center" }} />
              <span className="skeleton" style={{ width: "60%", height: 22, alignSelf: "center" }} />
              <div className="field">
                <span className="skeleton" style={{ width: "45%", height: 14 }} />
                <span className="skeleton" style={{ width: "100%", height: 44, borderRadius: "var(--radius-sm)" }} />
              </div>
              <div className="field">
                <span className="skeleton" style={{ width: "35%", height: 14 }} />
                <span className="skeleton" style={{ width: "100%", height: 44, borderRadius: "var(--radius-sm)" }} />
              </div>
              <span className="skeleton" style={{ width: "100%", height: 44, borderRadius: "var(--radius-sm)" }} />
            </div>
          ) : (
          <div className="card-body-center">
            <div className="icon-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V5h14v16" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 9h2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 13h2" />
              </svg>
            </div>

            <h1 className="card-form-title">{title}</h1>
            <p className="card-desc">Ingresa con tus credenciales institucionales.</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="email">Correo institucional</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="usuario@usbcali.edu.co"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFormError(null);
                    clearFieldError("email");
                  }}
                  required
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={errors.email ? "input-error" : ""}
                />
                {errors.email ? (
                  <p id="email-error" className="field-error-text">
                    {errors.email}
                  </p>
                ) : null}
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
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setFormError(null);
                      clearFieldError("password");
                    }}
                    required
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className={errors.password ? "input-error" : ""}
                  />
                  <button
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowPass((current) => !current)}
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <p id="password-error" className="field-error-text">
                    {errors.password}
                  </p>
                ) : null}
              </div>

              {formError ? (
                <div className="alert-error" role="alert">
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                  <p>{formError}</p>
                </div>
              ) : null}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Ingresando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </button>
            </form>
          </div>
          )}
        </div>

        <p className="page-footer">
          © {new Date().getFullYear()} Universidad San Buenaventura Cali · USB LENS
        </p>
      </div>
    </div>
  );
}
