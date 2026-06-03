// src/app/dashboard/admin/areas-inhabilitadas/[id]/page.tsx
"use client";

import { use } from "react";
import ProtectedDashboard from "@/components/ProtectedDashboard";
import AreaDetallePage from "../AreaDetallePage";

type Props = {
    params: Promise<{ id: string }>;
};

export default function AreaDetalleRoute({ params }: Props) {
    const { id } = use(params);
    return (
        <ProtectedDashboard
            title="Detalle de Área"
            description=""
            allowedRoles={["administrator", "technician"]}
            loginPath="/login/personal"
        >
            {() => <AreaDetallePage areaId={id} userRole="administrator" />}
        </ProtectedDashboard>
    );
}
