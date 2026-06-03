"use client";

import ProtectedDashboard from "@/components/ProtectedDashboard";
import TecnicoAreasInhabilitadasPage from "./TecnicoAreasInhabilitadasPage";

export default function AreasPage() {
    return (
        <ProtectedDashboard
            title="Áreas Inhabilitadas"
            description="Espacios del campus fuera de servicio."
            allowedRoles={["technician"]}
            loginPath="/login/personal"
        >
            {() => <TecnicoAreasInhabilitadasPage />}
        </ProtectedDashboard>
    );
}
