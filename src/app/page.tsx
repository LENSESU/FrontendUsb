"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/loginAdmin");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null; // or a loader
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Proyecto USB - Frontend
      </h1>
      <p className="mt-4 text-gray-600">
        Aplicación Next.js lista para desarrollar.
      </p>
    </main>
  );
}
