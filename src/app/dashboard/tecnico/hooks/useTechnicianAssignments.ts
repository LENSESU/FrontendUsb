

"use client";

import { useEffect, useState } from "react";
import { restoreAuthSession, type AuthData } from "@/utils/auth";
import { type TechnicianIncident } from "../components/TechnicianIncidentCard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Category = {
  id: string;
  name: string;
};

function getUserIdFromToken(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || payload.user_id || payload.id || null;
  } catch {
    return null;
  }
}

export function useTechnicianAssignments() {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [incidents, setIncidents] = useState<TechnicianIncident[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const session = await restoreAuthSession();
      if (!isMounted) return;
      setAuth(session);
      if (!session?.accessToken) {
        setLoading(false);
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!auth?.accessToken) return;

    let isMounted = true;

    async function fetchData() {
      const currentAuth = auth;
      if (!currentAuth) return;
      setLoading(true);
      setError(null);

      try {
        const [incRes, catRes] = await Promise.all([
          fetch(`${API}/api/v1/incidents/`, {
            headers: { Authorization: `Bearer ${currentAuth.accessToken}` },
          }),
          fetch(`${API}/api/v1/categories/`, {
            headers: { Authorization: `Bearer ${currentAuth.accessToken}` },
          }),
        ]);

        if (!incRes.ok) throw new Error("No se pudieron cargar los incidentes.");
        if (!catRes.ok) throw new Error("No se pudieron cargar las categorias.");

        const incidentsData = await incRes.json();
        const categoriesData = await catRes.json();

        const incidentsArray = Array.isArray(incidentsData)
          ? incidentsData
          : incidentsData.items || [];

        const categoriesArray = Array.isArray(categoriesData)
          ? categoriesData
          : categoriesData.items || [];

        const map: Record<string, string> = {};
        categoriesArray.forEach((cat: Category) => {
          map[cat.id] = cat.name;
        });

        const userId = getUserIdFromToken(currentAuth.accessToken);
        const filtered = incidentsArray.filter(
          (incident: TechnicianIncident) => incident.technician_id === userId,
        );

        const sorted = filtered.sort(
          (a: TechnicianIncident, b: TechnicianIncident) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        if (!isMounted) return;
        setCategoriesMap(map);
        setIncidents(sorted);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las asignaciones del tecnico.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [auth]);

  return {
    auth,
    incidents,
    categoriesMap,
    loading,
    error,
  };
}
