"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CodeInput from "@/components/CodeInput";

export default function VerifyCodePage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleVerify = () => {
    if (code.length !== 6) return;
    // aqui hay que integrar con API de verificación
    console.log("Verificando código:", code);
  };

  const handleResendCode = () => {
    // aqui hay que integrar con API para reenviar código
    console.log("Reenviando código...");
  };

  return (
    <div className="verify-page">
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
            Por favor ingresa el código de verificación enviado a tu correo
            electrónico registrado.
          </p>

          <div className="verify-code-wrapper">
            <CodeInput length={6} onChange={setCode} />
          </div>

          <button
            onClick={handleVerify}
            disabled={code.length !== 6}
            className="verify-submit-btn"
          >
            Verificar
          </button>

          <div className="verify-resend-wrapper">
            <button
              onClick={handleResendCode}
              className="verify-resend-btn"
            >
              Reenviar Código
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
