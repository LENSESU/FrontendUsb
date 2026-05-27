"use client";

import ProtectedDashboard from "@/components/ProtectedDashboard";
import StudentDashboardHome from "./dashboard/StudentDashboardHome";

export default function EstudianteDashboard() {
  return (
    <ProtectedDashboard
      title="Dashboard Estudiante"
      description="Sesión iniciada correctamente como estudiante."
      allowedRoles={["student"]}
      loginPath="/login/estudiante"
    >
      {/* Elemento hijo de ProtectedDashboard */}
      {({ auth, onLogout, isLoggingOut }) => (
        <StudentDashboardHome
          auth={auth}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
        />
      )}
    </ProtectedDashboard>
  );
}

