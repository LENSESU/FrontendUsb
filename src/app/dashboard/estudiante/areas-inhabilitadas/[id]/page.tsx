"use client";
import { use } from "react";
import ProtectedDashboard from "@/components/ProtectedDashboard";
import AreaDetallePage from "@/app/dashboard/admin/areas-inhabilitadas/AreaDetallePage";

type Props = { params: Promise<{ id: string }> };

export default function EstudianteAreaDetalleRoute({ params }: Props) {
    const { id } = use(params);
    return (
        <ProtectedDashboard
            title="Detalle de Área"
            description=""
            allowedRoles={["student"]}
            loginPath="/login/estudiante"
        >
            {() => <AreaDetallePage areaId={id} userRole="student" />}
        </ProtectedDashboard>
    );
}
