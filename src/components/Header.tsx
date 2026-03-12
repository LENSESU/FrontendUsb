"use client";

import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { isLoggedIn, logout, redirectTo } = useAuth();

  const handleLogout = () => {
    logout();
    redirectTo("/loginAdmin");
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
