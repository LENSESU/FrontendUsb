"use client";
import ProtectedDashboard from "@/components/ProtectedDashboard";
import EstudianteAreasPage from "./EstudianteAreasPage";

export default function AreasPage() {
    return (
        <ProtectedDashboard
            title="Áreas Inhabilitadas"
            description="Espacios del campus fuera de servicio."
            allowedRoles={["student"]}
            loginPath="/login/estudiante"
        >
            {() => <EstudianteAreasPage />}
        </ProtectedDashboard>
    );
}
