"use client";

import React, { useState, useEffect, useRef } from "react";

type Step = {
  targetId: string;
  title: string;
  description: string;
};

type OnboardingTourProps = {
  steps: Step[];
  onDismiss: () => void;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const PADDING = 8;
const TOOLTIP_OFFSET = 16;

export default function OnboardingTour({ steps, onDismiss }: OnboardingTourProps) {
  const [current, setCurrent] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  const isLast = current === steps.length - 1;
  const step = steps[current];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    setReady(false);

    function measure() {
      const el = document.getElementById(step.targetId);
      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      setTimeout(() => {
        const r = el.getBoundingClientRect();
        const newRect: Rect = {
          top: r.top - PADDING,
          left: r.left - PADDING,
          width: r.width + PADDING * 2,
          height: r.height + PADDING * 2,
        };
        setRect(newRect);

        const viewportH = window.innerHeight;
        const viewportW = window.innerWidth;
        const tooltipW = Math.min(300, viewportW - 32);

        const spaceBelow = viewportH - (r.bottom + PADDING);
        const spaceAbove = r.top - PADDING;

        let top: number;
        if (spaceBelow >= 160) {
          top = r.bottom + PADDING + TOOLTIP_OFFSET;
        } else if (spaceAbove >= 160) {
          top = r.top - PADDING - TOOLTIP_OFFSET - 160;
        } else {
          top = viewportH / 2 - 80;
        }

        let left = r.left;
        if (left + tooltipW > viewportW - 16) {
          left = viewportW - tooltipW - 16;
        }
        if (left < 16) left = 16;

        setTooltipPos({ top, left });
        setReady(true);
      }, 350);
    }

    measure();

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [current, step.targetId]);

  function handleNext() {
    if (isLast) {
      onDismiss();
    } else {
      setCurrent(current + 1);
    }
  }

  function handlePrev() {
    if (current > 0) {
      setCurrent(current - 1);
    }
  }

  const clipPath = rect
    ? `polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%,
        0% ${rect.top}px,
        ${rect.left}px ${rect.top}px,
        ${rect.left}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top}px,
        0% ${rect.top}px,
        0% 100%
      )`
    : undefined;

  return (
    <>
      {/* Overlay with spotlight hole */}
      <div
        onClick={onDismiss}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9000,
          background: "rgba(0, 0, 0, 0.65)",
          clipPath: ready && clipPath ? clipPath : undefined,
          transition: "clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "auto",
        }}
      />

      {/* Spotlight border ring */}
      {ready && rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            zIndex: 9001,
            borderRadius: "10px",
            border: "2px solid var(--color-primary)",
            boxShadow: "0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent)",
            pointerEvents: "none",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      )}

      {/* Tooltip */}
      {ready && (
        <div
          style={{
            position: "fixed",
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: `min(300px, calc(100vw - 32px))`,
            zIndex: 9002,
            background: "var(--color-bg-card, var(--color-bg))",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            border: "1px solid var(--color-border-light)",
            transition: "top 0.4s cubic-bezier(0.4, 0, 0.2, 1), left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            animation: "onboarding-fadein 0.25s ease",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Step counter dots */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              {steps.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: i === current ? "18px" : "6px",
                    height: "6px",
                    borderRadius: "999px",
                    background: i === current ? "var(--color-primary)" : "var(--color-border-light)",
                    transition: "width 0.3s ease, background 0.3s ease",
                    display: "inline-block",
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: "11px",
                color: "var(--color-text-hint)",
                fontWeight: 500,
              }}
            >
              {current + 1} / {steps.length}
            </span>
          </div>

          {/* Title */}
          <p
            style={{
              margin: "0 0 6px 0",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              lineHeight: 1.4,
            }}
          >
            {step.title}
          </p>

          {/* Description */}
          <p
            style={{
              margin: "0 0 18px 0",
              fontSize: "13px",
              lineHeight: 1.6,
              color: "var(--color-text-secondary)",
            }}
          >
            {step.description}
          </p>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <button
              onClick={onDismiss}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                color: "var(--color-text-hint)",
                padding: 0,
                fontWeight: 500,
              }}
            >
              Omitir tour
            </button>

            <div style={{ display: "flex", gap: "8px" }}>
              {current > 0 && (
                <button
                  onClick={handlePrev}
                  style={{
                    background: "var(--color-bg-muted)",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  ← Atrás
                </button>
              )}
              <button
                onClick={handleNext}
                style={{
                  background: "var(--color-primary)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {isLast ? "¡Listo!" : "Siguiente →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes onboarding-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
