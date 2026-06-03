"use client";

import { use } from "react";
import ProtectedDashboard from "@/components/ProtectedDashboard";
import AreaDetallePage from "@/app/dashboard/admin/areas-inhabilitadas/AreaDetallePage";

type Props = { params: Promise<{ id: string }> };

export default function TecnicoAreaDetalleRoute({ params }: Props) {
    const { id } = use(params);
    return (
        <ProtectedDashboard
            title="Detalle de Área"
            description=""
            allowedRoles={["technician"]}
            loginPath="/login/personal"
        >
            {() => (
                <AreaDetallePage
                    areaId={id}
                    userRole="technician"
                    editPath={`/dashboard/tecnico/areas-inhabilitadas/${id}/editar`}
                    incidentBasePath="/dashboard/tecnico/incidente-detalle"
                />
            )}
        </ProtectedDashboard>
    );
}
