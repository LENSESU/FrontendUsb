"use client";

import { use } from "react";
import ProtectedDashboard from "@/components/ProtectedDashboard";
import EditarAreaPage from "@/app/dashboard/admin/areas-inhabilitadas/EditarAreaPage";

type Props = { params: Promise<{ id: string }> };

export default function TecnicoEditarAreaRoute({ params }: Props) {
    const { id } = use(params);
    return (
        <ProtectedDashboard
            title="Editar Área"
            description=""
            allowedRoles={["technician"]}
            loginPath="/login/personal"
        >
            {() => (
                <EditarAreaPage
                    areaId={id}
                    backPath={`/dashboard/tecnico/areas-inhabilitadas/${id}`}
                    successPath={`/dashboard/tecnico/areas-inhabilitadas/${id}`}
                />
            )}
        </ProtectedDashboard>
    );
}
