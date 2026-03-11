"use client";

import { saveAuth, getDashboardPathByRole } from "@/utils/auth";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function TestBackLoginPage() {
  const router = useRouter();

  const handleRealLogin = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "estudiante@usb.ve",
            password: "estudiante123",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Error login:", error);
        alert("Login falló");
        return;
      }

      const data = await response.json();

      const auth = saveAuth({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      });

      console.log("Auth guardado:", auth);

      const path = getDashboardPathByRole(auth.role);
      router.push(path);

    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Test Backend Login</h1>
      <button onClick={handleRealLogin}>
        Login Estudiante Real
      </button>
    </div>
  );
}