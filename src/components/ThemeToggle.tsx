"use client";

import { useTheme, type ThemeMode } from "@/components/ThemeProvider";

type Props = {
  compact?: boolean;
};

const THEME_LABELS: Record<ThemeMode, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "dark") {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3a6.5 6.5 0 0 0 8.5 8.5 8 8 0 1 1-8.5-8.5Z" />
      </svg>
    );
  }

  if (mode === "system") {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    );
  }

  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export default function ThemeToggle({ compact = false }: Props) {
  const { mode, resolvedTheme, toggleMode } = useTheme();
  const label = THEME_LABELS[mode];
  const ariaLabel = `Cambiar tema. Tema actual: ${label}`;

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " theme-toggle-compact" : ""}`}
      onClick={toggleMode}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-resolved-theme={resolvedTheme}
    >
      <span className="theme-toggle-icon">
        <ThemeIcon mode={mode} />
      </span>
      {!compact && (
        <span className="theme-toggle-text">
          <span>Tema</span>
          <strong>{label}</strong>
        </span>
      )}
    </button>
  );
}
