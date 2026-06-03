// src/app/dashboard/admin/areas-inhabilitadas/[id]/editar/page.tsx
"use client";

import { use } from "react";
import ProtectedDashboard from "@/components/ProtectedDashboard";
import EditarAreaPage from "../../EditarAreaPage";

type Props = {
    params: Promise<{ id: string }>;
};

export default function EditarAreaRoute({ params }: Props) {
    const { id } = use(params);
    return (
        <ProtectedDashboard
            title="Editar Área"
            description=""
            allowedRoles={["administrator", "technician"]}
            loginPath="/login/personal"
        >
            {() => <EditarAreaPage areaId={id} />}
        </ProtectedDashboard>
    );
}
