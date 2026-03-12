"use client";

import { useEffect } from "react";
import { restoreAuthSession } from "@/utils/auth";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    async function restore() {
      console.log("Intentando restaurar sesión...");
      await restoreAuthSession();
    }

    restore();
  }, []);

  return <>{children}</>;
}