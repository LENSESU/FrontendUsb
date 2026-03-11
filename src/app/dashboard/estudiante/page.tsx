"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";

export default function EstudianteDashboard() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const auth = await restoreAuthSession();
      if (!auth) {
        router.push("/login");
      }
    }

    checkAuth();
  }, [router]);

  return <h1>Dashboard Estudiante</h1>;
}