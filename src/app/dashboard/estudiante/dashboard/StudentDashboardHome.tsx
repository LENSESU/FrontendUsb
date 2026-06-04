"use client";

import Link from "next/link";
import { AuthData, restoreAuthSession } from "@/utils/auth";
import { useRouter } from "next/navigation";
import { IncidentStatusBadge } from "@/components/IncidentStatusBadge";
import { IncidentStatus } from "@/utils/incidentStatus";
import { useEffect, useState } from "react";
import { useOnboarding } from "@/utils/onBoardingEstudiante";
import OnboardingTour from "@/components/OnBoardingTourEstudiante";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function getUserIdFromToken(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || payload.user_id || payload.id || null;
  } catch {
    return null;
  }
}

type Props = {
  auth: AuthData | null;
  onLogout: () => void;
  isLoggingOut: boolean;
};

type IncidentMock = {
  id: string;
  realId: string;
  category: string;
  place: string;
  date: string;
  status: IncidentStatus;
};

type PopularSuggestionItem = {
  id: string;
  titulo: string;
  total_votos: number;
  etiquetas: string[];
  created_at: string;
  estudiante_id?: string;
};

function getFallbackPopularSuggestions(): PopularSuggestionItem[] {
  return [
    {
      id: "3e2b6d85-eb48-4c9a-9a90-947700763558",
      titulo: "PRUEBA",
      total_votos: 8,
      etiquetas: [],
      created_at: "2026-05-13T04:03:14.140446",
    },
  ];
}

function parsePopularSuggestionsPayload(raw: unknown): PopularSuggestionItem[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const items = root.items;
  if (!Array.isArray(items)) return [];

  const result: PopularSuggestionItem[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const titulo = typeof row.titulo === "string" ? row.titulo : "";
    const rawVotes = row.total_votos;
    const total_votos =
      typeof rawVotes === "number" && Number.isFinite(rawVotes)
        ? rawVotes
        : typeof rawVotes === "string"
          ? Number.parseInt(rawVotes, 10)
          : 0;
    const created_at = typeof row.created_at === "string" ? row.created_at : "";
    const estudiante_id =
      typeof row.estudiante_id === "string" ? row.estudiante_id : undefined;
    const etiquetas: string[] = Array.isArray(row.etiquetas)
      ? row.etiquetas.filter((tag): tag is string => typeof tag === "string")
      : [];
    if (!id || !titulo) continue;
    result.push({
      id,
      titulo,
      total_votos: Number.isFinite(total_votos) ? total_votos : 0,
      etiquetas,
      created_at,
      estudiante_id,
    });
  }
  return result;
}

function formatRelativeDateEs(iso: string): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const now = Date.now();
  const diffMs = now - parsed.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

function getFirstName(email: string): string {
  return email.split("@")[0];
}

/* ── Skeleton components ── */

function SkeletonStatCard() {
  return (
    <div className="card flex h-full min-w-0 flex-col">
      <div className="flex flex-1 flex-col p-3 sm:p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="skeleton" style={{ width: 56, height: 32 }} />
          <span className="skeleton" style={{ width: 40, height: 40, borderRadius: 8 }} />
        </div>
        <div className="mt-3" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="skeleton" style={{ width: "70%", height: 14 }} />
          <span className="skeleton" style={{ width: "45%", height: 12 }} />
        </div>
      </div>
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <tr className="border-b border-[var(--color-border-light)]">
      {([80, 112, 96, 64, 64] as number[]).map((w, i) => (
        <td key={i} className="px-3 py-3">
          <span className="skeleton" style={{ width: w, height: 14 }} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonMobileItem() {
  return (
    <li className="flex items-start gap-3 p-4 border-b border-[var(--color-border-light)]">
      <span className="skeleton" style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="skeleton" style={{ width: "40%", height: 14 }} />
        <span className="skeleton" style={{ width: "65%", height: 14 }} />
        <span className="skeleton" style={{ width: "50%", height: 12 }} />
      </div>
      <span className="skeleton" style={{ width: 60, height: 22, borderRadius: 999, flexShrink: 0, alignSelf: "center" }} />
    </li>
  );
}

function SkeletonSuggestion() {
  return (
    <div className="flex items-center gap-3 rounded-lg border-b border-[var(--color-border-light)] p-3">
      <span className="skeleton" style={{ width: 60, height: 64, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="skeleton" style={{ width: "100%", height: 14 }} />
        <span className="skeleton" style={{ width: "75%", height: 14 }} />
        <span className="skeleton" style={{ width: "40%", height: 12 }} />
      </div>
    </div>
  );
}

function StatDocIcon() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-500 sm:h-9 sm:w-9 md:h-10 md:w-10"
      aria-hidden
    >
      <svg
        className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    </div>
  );
}

function StatSummaryCard({
  value,
  title,
  subtitle,
}: {
  value: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="card flex h-full min-w-0 flex-col">
      <div className="flex flex-1 flex-col p-3 sm:p-4 md:p-5">
        <div className="flex items-start justify-between gap-1.5 sm:gap-3">
          <p className="text-xl font-bold tabular-nums leading-none text-[var(--color-text-primary)] sm:text-2xl md:text-3xl md:leading-none">
            {value}
          </p>
          <StatDocIcon />
        </div>
        <div className="mt-2 sm:mt-3 md:mt-4">
          <p className="text-xs font-semibold leading-snug text-[var(--color-text-primary)] sm:text-sm md:text-base">
            {title}
          </p>
          <p className="mt-0.5 text-[10px] font-medium leading-tight text-[var(--color-primary)] sm:mt-1 sm:text-xs">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function DocIconSmall({ className }: { className?: string }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-500 ${className ?? ""}`}
      aria-hidden
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    </div>
  );
}

/* ── Vote button ── */

function VoteButton({
  item,
  index,
  isVoting,
  hasVoted,
  isCheckingVote,
  onVote,
}: {
  item: PopularSuggestionItem;
  index: number;
  isVoting: boolean;
  hasVoted: boolean;
  isCheckingVote: boolean;
  onVote: (id: string) => void;
}) {
  const highlight = index % 2 === 0;

  // Already voted: green tones, checkmark, "YA VOTÉ"
  if (hasVoted) {
    return (
      <button
        disabled
        aria-label={`Ya votaste por ${item.titulo}`}
        title="Ya registraste tu voto"
        className="flex min-w-[60px] flex-col items-center justify-center rounded-lg border border-green-300 bg-green-50 px-2 py-1 opacity-80 cursor-not-allowed"
      >
        {/* Checkmark icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-green-500"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-lg font-bold text-green-600">{item.total_votos}</span>
        <span className="text-[10px] font-semibold text-green-500">YA VOTÉ</span>
      </button>
    );
  }

  // Skeleton while checking initial vote status
  if (isCheckingVote) {
    return (
      <span
        className="skeleton rounded-lg"
        style={{ width: 60, height: 64, flexShrink: 0 }}
        aria-hidden
      />
    );
  }

  // Normal votable state
  return (
    <button
      onClick={() => onVote(item.id)}
      disabled={isVoting}
      aria-label={`Votar por ${item.titulo}`}
      className={
        highlight
          ? "flex min-w-[60px] flex-col items-center justify-center rounded-lg border border-orange-300 bg-orange-50 px-2 py-1 text-orange-600 card-clickable disabled:opacity-50"
          : "flex min-w-[60px] flex-col items-center justify-center rounded-lg border badge-closed card-clickable disabled:opacity-50"
      }
    >
      <svg
        className="-rotate-90"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
      <span
        className={
          highlight
            ? "text-lg font-bold text-orange-600"
            : "text-lg font-bold text-closed"
        }
      >
        {isVoting ? "..." : item.total_votos}
      </span>
      <span
        className={
          highlight
            ? "text-[10px] font-semibold text-orange-500"
            : "text-[10px] font-semibold text-closed"
        }
      >
        VOTOS
      </span>
    </button>
  );
}

/* ── Main component ── */

export default function StudentDashboardHome({
  auth,
  onLogout,
  isLoggingOut,
}: Props) {
  const [incidents, setIncidents] = useState<IncidentMock[]>([]);
  const [popularSuggestions, setPopularSuggestions] = useState<PopularSuggestionItem[]>([]);
  const [mySuggestionsCount, setMySuggestionsCount] = useState(0);
  const router = useRouter();
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const [votingIds, setVotingIds] = useState<Set<string>>(new Set());
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  // IDs whose initial vote status is still being fetched from GET /{id}/vote
  const [checkingVoteIds, setCheckingVoteIds] = useState<Set<string>>(new Set());

  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding("onboarding_dashboard_estudiante");

  const [isMobile, setIsMobile] = useState(false);

  const DASHBOARD_STEPS = [
    { targetId: "onboarding-stats", title: "Tu actividad", description: "Aquí ves un resumen rápido de cuántos incidentes y sugerencias has publicado en el campus." },
    { targetId: "onboarding-incidents", title: "Incidentes recientes", description: "Tus últimos reportes aparecen aquí. Haz clic en cualquier fila para ver el detalle y su estado." },
    { targetId: "onboarding-suggestions", title: "Sugerencias populares", description: "Vota por las ideas que más te importan o crea una nueva tocando '+ Nueva'." },
    { targetId: "onboarding-new-report", title: "Nuevo reporte", description: "¿Encontraste un problema en el campus? Usa este botón para reportarlo de inmediato." },
  ];

  // Effect para saber el tipo de vista (solo sirve para una cosa lol)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Fetch incidentes del estudiante ──
  useEffect(() => {
    async function fetchIncidents() {
      try {
        const session = await restoreAuthSession();
        if (!session?.accessToken) return;

        const token = session.accessToken;
        const userId = getUserIdFromToken(token);

        const [incRes, catRes] = await Promise.all([
          fetch(`${API}/api/v1/incidents/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/v1/categories/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const incidentsData = await incRes.json();
        const categoriesData = await catRes.json();

        const incidentsArray = Array.isArray(incidentsData)
          ? incidentsData
          : incidentsData.items || [];

        const categoriesArray = categoriesData.items || [];

        const categoryMap: Record<string, string> = {};
        categoriesArray.forEach((cat: any) => {
          categoryMap[cat.id] = cat.name;
        });

        const filtered = incidentsArray.filter(
          (i: any) => i.student_id === userId
        );

        const mapped: IncidentMock[] = filtered
          .sort(
            (a: Record<string, any>, b: Record<string, any>) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .slice(0, 5)
          .map((i: any) => ({
            id: `#${i.id.slice(0, 8).toUpperCase()}`,
            realId: i.id,
            category: categoryMap[i.category_id] || "Sin categoría",
            place: i.campus_place || "Sin ubicación",
            date: new Date(i.created_at).toLocaleDateString(),
            status:
              i.status === "Nuevo"
                ? "Nuevo"
                : i.status === "En_proceso"
                  ? "En_proceso"
                  : i.status === "Resuelto"
                    ? "Resuelto"
                    : "Nuevo",
          }));

        setIncidents(mapped);
      } catch (err) {
        console.error("Error cargando incidentes:", err);
      } finally {
        setLoadingIncidents(false);
      }
    }

    void fetchIncidents();
  }, []);

  // ── Fetch sugerencias populares + check vote status for each ──
  useEffect(() => {
    let cancelled = false;

    async function loadPopularSuggestions() {
      setLoadingSuggestions(true);
      const fallback = getFallbackPopularSuggestions();

      try {
        const session = await restoreAuthSession();
        if (!session?.accessToken) {
          if (!cancelled) {
            setPopularSuggestions(fallback);
            setMySuggestionsCount(0);
          }
          return;
        }

        const token = session.accessToken;
        const userId = getUserIdFromToken(token);

        const res = await fetch(`${API}/api/v1/suggestions/`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const raw: unknown = await res.json().catch(() => null);
        const parsed = parsePopularSuggestionsPayload(raw);

        const myCount = userId
          ? parsed.filter((s) => s.estudiante_id === userId).length
          : 0;

        const sorted = [...parsed]
          .sort((a, b) => b.total_votos - a.total_votos)
          .slice(0, 5);

        const displayed = sorted.length > 0 ? sorted : fallback;

        if (!cancelled) {
          setPopularSuggestions(displayed);
          setMySuggestionsCount(myCount);
          setLoadingSuggestions(false);
        }

        // After rendering the list, check vote status for each suggestion in parallel.
        // Mark each as "checking" while in-flight so the button shows a skeleton.
        const ids = displayed.map((s) => s.id);
        if (!cancelled) {
          setCheckingVoteIds(new Set(ids));
        }

        const voteChecks = ids.map(async (id) => {
          try {
            const r = await fetch(`${API}/api/v1/suggestions/${id}/vote`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!r.ok) return { id, hasVoted: false };
            const data = await r.json() as { has_voted: boolean };
            return { id, hasVoted: data.has_voted === true };
          } catch {
            return { id, hasVoted: false };
          }
        });

        const results = await Promise.all(voteChecks);

        if (!cancelled) {
          const alreadyVoted = results
            .filter((r) => r.hasVoted)
            .map((r) => r.id);
          if (alreadyVoted.length > 0) {
            setVotedIds((prev) => new Set([...prev, ...alreadyVoted]));
          }
          setCheckingVoteIds(new Set());
        }
      } catch {
        if (!cancelled) {
          setPopularSuggestions(fallback);
          setMySuggestionsCount(0);
          setLoadingSuggestions(false);
          setCheckingVoteIds(new Set());
        }
      }
    }

    void loadPopularSuggestions();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleVote(suggestionId: string) {
    if (votingIds.has(suggestionId) || votedIds.has(suggestionId)) return;

    setVotingIds((prev) => new Set(prev).add(suggestionId));

    try {
      const session = await restoreAuthSession();
      if (!session?.accessToken) return;

      const res = await fetch(
        `${API}/api/v1/suggestions/${suggestionId}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      if (res.status === 201) {
        setVotedIds((prev) => new Set(prev).add(suggestionId));
        setPopularSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId
              ? { ...s, total_votos: s.total_votos + 1 }
              : s
          )
        );
      }
    } catch (err) {
      console.error("Error al votar:", err);
    } finally {
      setVotingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestionId);
        return next;
      });
    }
  }

  if (!auth) return <div>cargando...</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-4 pt-0 sm:p-6 lg:px-8">
      {showOnboarding && (
        <OnboardingTour steps={DASHBOARD_STEPS} onDismiss={dismissOnboarding} />
      )}

      {/* ── Header ── */}
      <header className="mb-6 sm:mb-8">

        {/* Mobile: franja de saludo + FAB */}
        <div className="-mx-4 mb-4 md:hidden">
          <div className="bg-[var(--color-bg-muted)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-snug text-[var(--color-text-primary)]">
                  ¡Buenos días, {getFirstName(auth.email ?? "Usuario")}!
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Aquí tienes un resumen de tu actividad.
                </p>
              </div>
              <Link
                id={isMobile ? "onboarding-new-report" : undefined}
                href="/dashboard/estudiante/incidente"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xl font-bold leading-none text-white shadow-sm no-underline transition hover:bg-[var(--color-primary-dark)]"
                aria-label="Nuevo Reporte"
              >
                +
              </Link>
            </div>
          </div>
        </div>

        {/* Tablet/desktop: título + botón primario */}
        <div className="hidden flex-row items-start justify-between gap-3 md:flex">
          <div className="min-w-0 flex-1 pr-1">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Panel del Estudiante
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              ¡Buenos días, {getFirstName(auth.email ?? "Usuario")}! Aquí tienes un
              resumen de tu actividad en el campus.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Link
              id={isMobile ? undefined : "onboarding-new-report"}
              href="/dashboard/estudiante/incidente"
              className="btn-primary min-w-[200px] text-center no-underline sm:!w-auto"
              aria-label="Nuevo Reporte"
            >
              + Nuevo Reporte
            </Link>
          </div>
        </div>
      </header>

      {/* ── Stats ── */}
      <section id="onboarding-stats" className="mb-6 sm:mb-8">
        <div className="grid grid-cols-2 items-stretch gap-2 sm:gap-4 lg:gap-6">
          {loadingIncidents ? (
            <SkeletonStatCard />
          ) : (
            <StatSummaryCard
              value={String(incidents.length)}
              title="Mis Incidentes"
              subtitle="+1 esta semana"
            />
          )}
          {loadingSuggestions ? (
            <SkeletonStatCard />
          ) : (
            <StatSummaryCard
              value={String(mySuggestionsCount)}
              title="Mis Sugerencias"
              subtitle="Publicadas por ti"
            />
          )}
        </div>
      </section>

      {/* ── Grid principal ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">

        {/* Incidentes recientes */}
        <section id="onboarding-incidents" className="card min-h-[200px] lg:col-span-2">
          <div className="flex w-full min-w-0 flex-row items-center justify-between gap-3 border-b border-[var(--color-border-light)] px-4 py-3">
            <h2 className="min-w-0 flex-1 text-lg font-bold text-[var(--color-text-primary)] md:hidden">
              Recientes
            </h2>
            <h2 className="hidden min-w-0 flex-1 text-lg font-bold text-[var(--color-text-primary)] md:block">
              Mis Incidentes Recientes
            </h2>
            <Link
              href="/dashboard/estudiante/reportes"
              className="btn-link !mt-0 inline-flex !w-auto shrink-0 items-center gap-1 text-left text-sm font-semibold"
            >
              Ver todo
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Tabla — tablet+ */}
          <div className="hidden overflow-x-auto p-4 md:block">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[var(--color-bg-muted)] text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                  <th className="rounded-l-md px-3 py-2">ID</th>
                  <th className="px-3 py-2">Categoria</th>
                  <th className="px-3 py-2">Lugar</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="rounded-r-md px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {loadingIncidents ? (
                  <>
                    <SkeletonTableRow />
                    <SkeletonTableRow />
                    <SkeletonTableRow />
                  </>
                ) : incidents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-sm text-[var(--color-text-secondary)]"
                    >
                      No tienes incidentes registrados aún.
                    </td>
                  </tr>
                ) : (
                  incidents.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--color-border-light)] last:border-0 cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/dashboard/estudiante/dashboard/incidente-detalle?id=${row.realId}`
                        )
                      }
                    >
                      <td className="px-3 py-3 font-medium text-[var(--color-primary)]">
                        {row.id}
                      </td>
                      <td className="px-3 py-3">{row.category}</td>
                      <td className="px-3 py-3">{row.place}</td>
                      <td className="px-3 py-3">
                        <IncidentStatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-3 text-[var(--color-text-secondary)]">
                        {row.date}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Lista tarjetas — mobile */}
          <ul className="flex flex-col divide-y divide-[var(--color-border-light)] md:hidden">
            {loadingIncidents ? (
              <>
                <SkeletonMobileItem />
                <SkeletonMobileItem />
                <SkeletonMobileItem />
              </>
            ) : incidents.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
                No tienes incidentes registrados aún.
              </li>
            ) : (
              incidents.map((row) => (
                <li
                  key={`m-${row.id}`}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/dashboard/estudiante/dashboard/incidente-detalle?id=${row.realId}`
                    )
                  }
                >
                  <div className="flex items-start gap-3 p-4">
                    <DocIconSmall />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--color-primary)]">{row.id}</p>
                      <p className="text-sm text-[var(--color-text-primary)]">{row.category}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-hint)]">{row.place}</p>
                    </div>
                    <div className="shrink-0 self-center">
                      <IncidentStatusBadge status={row.status} />
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Sugerencias populares */}
        <section id="onboarding-suggestions" className="card min-h-[200px] lg:col-span-1">
          <div className="flex items-center justify-between border-b border-[var(--color-border-light)] px-4 py-3">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Sugerencias Populares
            </h2>
            <Link
              href="/dashboard/estudiante/sugerencias"
              className="btn-link !mt-0 inline-flex !w-auto shrink-0 items-center gap-1 text-sm font-semibold"
            >
              + Nueva
            </Link>
          </div>
          <div className="p-3 text-sm text-[var(--color-text-secondary)] sm:p-4">
            {loadingSuggestions ? (
              <div className="flex flex-col gap-3">
                <SkeletonSuggestion />
                <SkeletonSuggestion />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {popularSuggestions.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border-b border-[var(--color-border-light)] p-3"
                  >
                    <VoteButton
                      item={item}
                      index={index}
                      isVoting={votingIds.has(item.id)}
                      hasVoted={votedIds.has(item.id)}
                      isCheckingVote={checkingVoteIds.has(item.id)}
                      onVote={handleVote}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {item.titulo}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {item.etiquetas.length > 0 ? (
                          item.etiquetas.slice(0, 2).map((tag) => (
                            <span key={`${item.id}-${tag}`} className="badge">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-[var(--color-text-hint)]">Sin etiquetas</span>
                        )}
                        <span className="text-[var(--color-text-hint)]">
                          {formatRelativeDateEs(item.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}