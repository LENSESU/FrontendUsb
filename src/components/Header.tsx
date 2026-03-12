"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function Header() {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/loginAdmin");
  };

  return (
    <header className="p-4 bg-gray-100 flex justify-between items-center">
      <h1 className="font-bold">Proyecto USB</h1>
      {isLoggedIn && (
        <button
          onClick={handleLogout}
          className="text-sm text-blue-600 hover:underline"
        >
          Cerrar sesión
        </button>
      )}
    </header>
  );
}
