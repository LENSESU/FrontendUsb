"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(?:[ '-][A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/;
const INSTITUTIONAL_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@correo\.usbcali\.edu\.co$/;
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;

export default function RegisterEstudiantePage() {
  const router = useRouter();
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  }>({});

  function clearFieldError(field: "firstName" | "lastName" | "email" | "password") {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      return { ...current, [field]: undefined };
    });
  }

  function getRegisterErrorMessage(detail?: unknown): string {
    const expectedDomain = "@correo.usbcali.edu.co";

    if (Array.isArray(detail)) {
      const messages = detail.map((entry: { msg?: string }) => entry.msg ?? "");
      if (messages.some((message) => message.toLowerCase().includes(expectedDomain))) {
        return `El correo debe pertenecer al dominio ${expectedDomain}`;
      }
      return messages.join(", ");
    }

    if (typeof detail !== "string") {
      return "No se pudo completar el registro.";
    }

    if (detail.toLowerCase().includes(expectedDomain)) {
      return `El correo debe pertenecer al dominio ${expectedDomain}`;
    }

    return detail;
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const nextFieldErrors: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
    } = {};

    if (!trimmedFirstName) {
      nextFieldErrors.firstName = "El nombre es obligatorio.";
    } else if (trimmedFirstName.length < 2) {
      nextFieldErrors.firstName = "El nombre debe tener al menos 2 caracteres.";
    } else if (!NAME_PATTERN.test(trimmedFirstName)) {
      nextFieldErrors.firstName =
        "El nombre solo puede contener letras, espacios, apóstrofes o guiones.";
    }

    if (!trimmedLastName) {
      nextFieldErrors.lastName = "El apellido es obligatorio.";
    } else if (trimmedLastName.length < 2) {
      nextFieldErrors.lastName = "El apellido debe tener al menos 2 caracteres.";
    } else if (!NAME_PATTERN.test(trimmedLastName)) {
      nextFieldErrors.lastName =
        "El apellido solo puede contener letras, espacios, apóstrofes o guiones.";
    }

    if (!trimmedEmail) {
      nextFieldErrors.email = "El correo institucional es obligatorio.";
    } else if (!INSTITUTIONAL_EMAIL_PATTERN.test(trimmedEmail)) {
      nextFieldErrors.email =
        "El correo debe pertenecer al dominio @correo.usbcali.edu.co.";
    }

    if (!password) {
      nextFieldErrors.password = "La contraseña es obligatoria.";
    } else if (!PASSWORD_PATTERN.test(password)) {
      nextFieldErrors.password =
        "Debe tener 8 caracteres mínimo, mayúscula, minúscula, número y símbolo.";
    }

    if (
      nextFieldErrors.firstName ||
      nextFieldErrors.lastName ||
      nextFieldErrors.email ||
      nextFieldErrors.password
    ) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          email: trimmedEmail,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(getRegisterErrorMessage(data.detail));
        return;
      }
      // Registro exitoso → redirigir a la pantalla de verificación de código
      router.push(`/verify-code?email=${encodeURIComponent(trimmedEmail)}`);
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

          {loading ? (
            <div className="card-body-center">
              <span className="skeleton" style={{ width: 52, height: 52, borderRadius: "var(--radius-md)", alignSelf: "center" }} />
              <span className="skeleton" style={{ width: "50%", height: 22, alignSelf: "center" }} />
              {[45, 40, 55, 35].map((w, i) => (
                <div key={i} className="field">
                  <span className="skeleton" style={{ width: `${w}%`, height: 14 }} />
                  <span className="skeleton" style={{ width: "100%", height: 44, borderRadius: "var(--radius-sm)" }} />
                </div>
              ))}
              <span className="skeleton" style={{ width: "100%", height: 44, borderRadius: "var(--radius-sm)" }} />
            </div>
          ) : (
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
                      onChange={e => {
                        setFirstName(e.target.value);
                        setError(null);
                        clearFieldError("firstName");
                      }}
                      required
                      aria-invalid={Boolean(fieldErrors.firstName)}
                      aria-describedby={fieldErrors.firstName ? "first-name-error" : undefined}
                      className={fieldErrors.firstName ? "input-error" : ""}
                    />
                    {fieldErrors.firstName ? (
                      <p id="first-name-error" className="field-error-text">
                        {fieldErrors.firstName}
                      </p>
                    ) : null}
                  </div>

                  <div className="field">
                    <label htmlFor="lastName">Apellido</label>
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      placeholder="Tu apellido"
                      value={lastName}
                      onChange={e => {
                        setLastName(e.target.value);
                        setError(null);
                        clearFieldError("lastName");
                      }}
                      required
                      aria-invalid={Boolean(fieldErrors.lastName)}
                      aria-describedby={fieldErrors.lastName ? "last-name-error" : undefined}
                      className={fieldErrors.lastName ? "input-error" : ""}
                    />
                    {fieldErrors.lastName ? (
                      <p id="last-name-error" className="field-error-text">
                        {fieldErrors.lastName}
                      </p>
                    ) : null}
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
                      onChange={e => {
                        setEmail(e.target.value);
                        setError(null);
                        clearFieldError("email");
                      }}
                      required
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? "email-error" : undefined}
                      className={fieldErrors.email ? "input-error" : ""}
                    />
                    {fieldErrors.email ? (
                      <p id="email-error" className="field-error-text">
                        {fieldErrors.email}
                      </p>
                    ) : null}
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
                        onChange={e => {
                          setPassword(e.target.value);
                          setError(null);
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
                    {fieldErrors.password ? (
                      <p id="password-error" className="field-error-text">
                        {fieldErrors.password}
                      </p>
                    ) : null}
                    <p className="text-xs text-hint mt-xs text-left">
                      Usa 8+ caracteres con mayúscula, minúscula, número y símbolo.
                    </p>
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
          )}
        </div>

        <p className="page-footer">© {new Date().getFullYear()} Universidad de San Buenaventura Cali · USB LENS</p>
      </div>
    </div>
  );
}
