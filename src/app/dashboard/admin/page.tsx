"use client";

import ProtectedDashboard from "@/components/ProtectedDashboard";
import AdminDashboardHome from "./dashboard/AdminDashboardHome";

export default function DashboardAdminPage() {
  return (
    <ProtectedDashboard
      title="Dashboard Admin"
      description="Sesión iniciada correctamente como administrador."
      allowedRoles={["administrator"]}
      loginPath="/login/personal"
    >
      {({ auth, onLogout, isLoggingOut }) => (
        <AdminDashboardHome
          auth={auth}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
        />
      )}
    </ProtectedDashboard>
  );
}