"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="page-centered">

      <div className="section-header">
        <div className="logo-wrap flex items-center justify-center gap-sm mb-md">
          <div className="logo-dot" />
          <span className="logo-text">USB <span>LENS</span></span>
        </div>
        <h1>¿Cómo deseas ingresar?</h1>
        <p>Selecciona tu tipo de acceso para continuar</p>
      </div>

      <div className="cards-grid">

        {/* Estudiante → OTP por correo */}
        <div className="card card-clickable" onClick={() => router.push("/login/estudiante")}>
          <div className="card-stripe-label">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
            </svg>
          </div>
          <div className="card-body text-center">
            <div className="icon-wrap-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <h2 className="card-title-sm">Acceso Estudiante</h2>
            <p className="card-desc">Tus aportes son importantes</p>
            <button className="btn-primary" aria-label="Ingresar como estudiante">Ingresar</button>
          </div>
        </div>

        {/* Admin / Técnico → usuario + contraseña */}
        <div className="card card-clickable" onClick={() => router.push("/loginAdmin")}>
          <div className="card-stripe-label">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <div className="card-body text-center">
            <div className="icon-wrap-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h2 className="card-title-sm">Personal Autorizado</h2>
            <p className="card-desc">Gestiona, asigna y administra</p>

            <button className="btn-primary" aria-label="Ingresar como administrador o técnico">Ingresar</button>
          </div>
        </div>

      </div>

      <p className="page-footer">© {new Date().getFullYear()} Universidad de San Buenaventura Cali · USB LENS</p>
    </div>
  );
}