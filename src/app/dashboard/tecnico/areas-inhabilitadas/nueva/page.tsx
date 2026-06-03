"use client";

import ProtectedDashboard from "@/components/ProtectedDashboard";
import NuevaAreaPage from "@/app/dashboard/admin/areas-inhabilitadas/NuevaAreaPage";

export default function TecnicoNuevaAreaRoute() {
    return (
        <ProtectedDashboard
            title="Registrar Área"
            description=""
            allowedRoles={["technician"]}
            loginPath="/login/personal"
        >
            {() => (
                <NuevaAreaPage
                    backPath="/dashboard/tecnico/areas-inhabilitadas"
                    successPath="/dashboard/tecnico/areas-inhabilitadas?registrada=1"
                    userRole="Technician"
                />
            )}
        </ProtectedDashboard>
    );
}
