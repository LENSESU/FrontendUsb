"use client";

import ProtectedDashboard from "@/components/ProtectedDashboard";
import AreasInhabilitadasHome from "./AreasInhabilitadasHome";

export default function AreasInhabilitadasPage() {
  return (
    <ProtectedDashboard
      title="Áreas Inhabilitadas"
      description="Gestión de espacios temporalmente fuera de servicio."
      allowedRoles={["administrator"]}
      loginPath="/login/personal"
    >
      {() => <AreasInhabilitadasHome />}
    </ProtectedDashboard>
  );
}
