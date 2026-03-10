"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = "El correo es obligatorio.";
    }

    if (!password.trim()) {
      nextErrors.password = "La contrasena es obligatoria.";
    }

    setErrors(nextErrors);
  };

  return (
    <main className="min-h-screen bg-[#f5f5f5] px-4 py-8 font-sans">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[480px] items-center justify-center">
        <div className="w-full overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.10)]">
          <div className="h-2 w-full bg-[#ef630f]" />

          <div className="px-6 pb-10 pt-8 sm:px-10">
            <div className="mb-8 flex flex-col items-center">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <svg
                  aria-hidden="true"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V5h14v16" />
                  <path d="M9 9h2" />
                  <path d="M13 9h2" />
                  <path d="M9 13h2" />
                  <path d="M13 13h2" />
                </svg>
              </div>

              <h1 className="text-center text-[32px] font-bold leading-tight text-[#212121]">
                Ingreso Tecnico
              </h1>
            </div>

            <form className="space-y-7" onSubmit={handleSubmit}>
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-[#616161]"
                  htmlFor="email"
                >
                  Institutional Email
                </label>
                <input
                  id="email"
                  value={email}
                  placeholder="name@company.com"
                  required
                  type="email"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  className={`h-10 w-full rounded-md border px-3 text-base text-[#212121] placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                    errors.email
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-[#cccccc] focus:border-[#ef630f] focus:ring-[#ef630f]"
                  }`}
                />
                {errors.email ? (
                  <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                ) : null}
              </div>

              <div>
                <label
                  className="mb-2 block text-sm font-medium text-[#616161]"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  value={password}
                  placeholder="********"
                  required
                  type="password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  className={`h-10 w-full rounded-md border px-3 text-base text-[#212121] placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                    errors.password
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-[#cccccc] focus:border-[#ef630f] focus:ring-[#ef630f]"
                  }`}
                />
                {errors.password ? (
                  <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                ) : null}
              </div>

              <div className="flex justify-center">
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#ef630f] px-10 py-3 text-lg font-semibold text-white transition hover:opacity-90 active:scale-[0.98] sm:w-auto"
                >
                  SEND CODE
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
